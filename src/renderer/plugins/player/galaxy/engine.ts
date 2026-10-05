/**
 * 银河音效 2.0 —— 引擎适配器
 *
 * 职责：把一份 `GalaxyDSPConfig` 映射成真实的 Web Audio 节点图，并保证两条铁律：
 *
 *   1. **中性即物理旁路** —— 任一模块的参数为中性值时，该模块的节点会被
 *      `disconnect()` 掉、根本不参与信号路径。这是本项目历史踩坑（未开音效却有
 *      "套了一层"的染色感）换来的不变量，任何新节点都必须遵守。
 *   2. **参数变更一律平滑** —— 全部走 `setTargetAtTime`，拖动滑条 / 切预设
 *      都不会有咔哒声或阶梯噪声。
 *
 * 本版本实现的模块（顺序即链路顺序）：
 *   · InputGain   GainNode 输入推子（给饱和/压缩提供可调驱动量）
 *   · DC 阻断     2 阶 Butterworth 高通（设计稿 DSP 链里的 `HPF / DC` 段）
 *   · EQ          由主链路的 10 段 biquad 承载（通过 options.applyEq 注入）
 *   · Bass        低频架 + 并联谐波支路（心理声学低频增强）
 *   · Compressor  DynamicsCompressor + 外挂补偿增益
 *   · Saturation  WaveShaper 软削波 + 干湿并联
 *   · Stereo      中/侧（M/S）矩阵展宽
 *   · Delay       DelayNode + 反馈环 + 干湿并联
 *   · Chorus      OscillatorNode 调制 DelayNode.delayTime + 干湿并联
 *   · Reverb      ConvolverNode 干湿并联 + 运行时生成的 IR
 *   · Tone        highshelf 音色架（10kHz 空气感）
 *   · Balance     StereoPannerNode 左右平衡
 *   · Filters     4 个通用滤波器槽（lowpass / highpass / bandpass / notch / bell / tilt）
 *   · Limiter     DynamicsCompressor 压峰（安全兜底）
 *
 * ── 「native first」审计结论（参考 mochamix 的 "zero heavy lifting in JS" 原则）──
 * 先前判断 Saturation / Delay / Chorus「需自研 AudioWorklet」是**错的**，全部有原生等价物：
 *   · 抗混叠：`WaveShaperNode.oversample = '4x'` 由浏览器原生 4 倍过采样完成，
 *     不需要自己写过采样与非线性处理。这是最容易被忽略的一条。
 *   · 延迟：`DelayNode` + 反馈 `GainNode` 构成反馈环，原生支持最大时延参数。
 *   · 合唱：`OscillatorNode` → `GainNode` → `DelayNode.delayTime`（AudioParam 的
 *     **内在值 + 连接输入求和**特性让 LFO 调制不需要任何 JS）。
 *   · 通用滤波器：`BiquadFilterNode` 覆盖全部 7 种类型，无需自研系数计算
 *     （频响曲线另有 `response.ts` 供 UI 绘制，与节点行为逐值对拍过）。
 * 仍然没有原生等价物、确实需要自研的只剩：
 *   · HRTF          需 resonance-audio / SOFA 数据集（见 types.ts 的说明）
 *   · 真峰值限幅     需过采样 + lookahead，DynamicsCompressorNode 只在采样域限幅
 *   · stereo.bassMonoHz / crossfeed / haas  需分频网络
 */

import type { EQBand, FilterSlotConfig, GalaxyDSPConfig } from './types'
import { GALAXY_FILTER_SLOTS } from './types'
import { createTanhCurve as createTanhCurveShared } from '../audioEffects'
import { FILTER_Q_MAX, FILTER_Q_MIN } from './defaults'

/** 默认参数平滑时间常数（秒） */
const DEFAULT_RAMP_TIME = 0.03

/** 判断浮点参数是否"中性"（等于零处理值） */
const EQ_EPS = 1e-4

/** 延迟线最大时延（秒） */
const MAX_DELAY_SECONDS = 2
/** 合唱的基础时延与最大调制深度（秒） */
const CHORUS_BASE_DELAY = 0.015
const CHORUS_MAX_MOD = 0.006

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

type StageId =
  | 'inputGain'
  | 'dcBlock'
  | 'bass'
  | 'compressor'
  | 'saturation'
  | 'stereo'
  | 'delay'
  | 'chorus'
  | 'reverb'
  | 'tone'
  | 'balance'
  | 'filters'

/** 一段可串入/旁路的子链 */
interface Segment {
  in: AudioNode
  out: AudioNode
}

export interface GalaxyEngineOptions {
  /**
   * EQ 由主链路承载时注入。传入主链路的 10 段 biquad 写入函数；
   * 不传则本引擎不处理 EQ（避免与主链路 EQ 重复叠加）。
   */
  applyEq?: (bands: EQBand[]) => void
  /** 参数平滑时间常数（秒） */
  rampTime?: number
}

export interface GalaxyEngineHandle {
  /**
   * 链路入口。外部**只允许 connect 进它**，❌ 禁止对 input 调 `disconnect()`：
   * input 同时连向第一段子链（全中性时是 input → output），
   * 外部一断就把内部路由的起点删掉，信号进来没有出口 → 整条链静音。
   * 而 `apply()` 只在活跃模块集合变化时才重建路由，所以它不会自愈。
   */
  input: AudioNode
  /**
   * 链路出口。外部可以 disconnect 它（它的出边本来就只有外挂的那一条），
   * 但换接管方之后要重新 connect。
   */
  output: AudioNode
  /** 应用一份配置（幂等；可反复调用） */
  apply: (config: GalaxyDSPConfig) => void
  /**
   * 无条件重建内部路由。
   *
   * ⚠️ 它会先 `disconnect()` 全部节点，**包括 input / output 的外部连线**，
   * 所以调用者必须在**建外部连线之前**调用，或者调用完自己再接一遍。
   * 想「在接好外部连线之后再调它来自愈」是行不通的 —— 那会把刚接好的线删掉
   * （这个坑当场踩过一次：挂载瞬间直接静音）。
   *
   * 正常流程不需要它：`apply()` 会在活跃模块集合变化时自行重建。
   * 保留它只是为了万一外部误断了 input 的出边时能手动恢复。
   */
  reroute: () => void
  /** 当前真正串入链路的模块（中性模块不在其中） */
  activeStages: () => StageId[]
  /** 全部断开，用于销毁 */
  dispose: () => void
}

/**
 * 归一化 tanh 软削波曲线（低频谐波支路与饱和共用）。
 * 定义在 audioEffects.ts 里，与「增强效果链」共用同一份实现，避免两处漂移。
 */
const createTanhCurve = createTanhCurveShared

/**
 * 饱和曲线：归一化 tanh 软削波。
 *   · drive = 0 时严格返回恒等曲线（y = x）——「中性即旁路」在数学上也成立；
 *   · 归一化（除以 tanh(k)）使 ±1 处输出仍为 ±1：饱和只增加谐波、不改变峰值电平，
 *     避免出现「响度变大被误认为音质变好」。
 * 抗混叠交给 `WaveShaperNode.oversample`（原生 4 倍过采样），无需自研。
 */
const createSaturationCurve = (drive: number, length = 2048): Float32Array<ArrayBuffer> => {
  const curve = new Float32Array(length)
  const k = Math.max(0, drive) * 8
  const identity = k < 1e-3
  const norm = identity ? 1 : Math.tanh(k)
  for (let i = 0; i < length; i++) {
    const x = (i * 2) / (length - 1) - 1
    curve[i] = identity ? x : Math.tanh(k * x) / norm
  }
  return curve
}

/**
 * 生成混响脉冲响应：双声道指数衰减噪声。
 * 房间尺度控制衰减曲线（房间越大尾巴越"厚"），decay 控制总时长。
 */
const createReverbIR = (ctx: BaseAudioContext, roomSize: number, decay: number): AudioBuffer => {
  const rate = ctx.sampleRate
  const length = Math.max(1, Math.floor(rate * Math.max(0.05, decay)))
  const impulse = ctx.createBuffer(2, length, rate)
  // roomSize 0~1 → 指数 5.5~1.2（房间越大，衰减越慢、尾巴越明显）
  const exponent = 5.5 - 4.3 * Math.min(1, Math.max(0, roomSize))
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      const n = i / length
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, exponent)
    }
  }
  return impulse
}

export const createGalaxyEngine = (
  ctx: AudioContext,
  options: GalaxyEngineOptions = {},
): GalaxyEngineHandle => {
  const rampTime = options.rampTime ?? DEFAULT_RAMP_TIME

  const ramp = (param: AudioParam, value: number) => {
    param.setTargetAtTime(value, ctx.currentTime, rampTime)
  }
  const snap = (param: AudioParam, value: number) => {
    param.setValueAtTime(value, ctx.currentTime)
  }

  // ============================================================
  //  节点创建
  // ============================================================

  const input = ctx.createGain()
  const output = ctx.createGain()

  // ── InputGain：输入推子 ──
  const inputGainNode = ctx.createGain()

  // ── TONE：高频架 ──
  const toneShelf = ctx.createBiquadFilter()
  toneShelf.type = 'highshelf'

  // ── BALANCE：左右平衡 ──
  const balancePanner = ctx.createStereoPanner()

  // ── FILTERS：4 个通用滤波槽（链式串联，关闭的槽被物理旁路）──
  const filterSlots: BiquadFilterNode[] = Array.from(
    { length: GALAXY_FILTER_SLOTS },
    () => ctx.createBiquadFilter(),
  )

  // ── DC 阻断：2 阶 Butterworth 高通（Web Audio 无一阶，用 Q=1/√2 的 2 阶代替）──
  const dcBlock = ctx.createBiquadFilter()
  dcBlock.type = 'highpass'
  dcBlock.Q.value = Math.SQRT1_2

  // ── Bass：低频架 + 并联谐波支路 ──
  const bassShelf = ctx.createBiquadFilter()
  bassShelf.type = 'lowshelf'
  const bassDry = ctx.createGain()
  // ⚠️ 谐波支路必须用 **lowpass**（曾经写成 highpass，这是「低音没效果」的根因）：
  //   心理声学低音的原理是「把低频段的谐波造出来，让放不出 <100Hz 的喇叭也能听见低音」。
  //   要造谐波，得先把**低频段**取出来再削波 —— 所以是 lowpass。
  //   写成 highpass 时支路拿到的是 corner 以上的全部中高频，tanh 只会把它们削得更脏：
  //   听感是「中高频多了层毛刺」，而低音谐波一个都没造出来。
  const bassHarmonicLP = ctx.createBiquadFilter()
  bassHarmonicLP.type = 'lowpass'
  const bassHarmonicShaper = ctx.createWaveShaper()
  bassHarmonicShaper.curve = createTanhCurve(2)
  bassHarmonicShaper.oversample = '2x'
  const bassHarmonicGain = ctx.createGain()
  const bassOut = ctx.createGain()

  // ── Compressor：压限 + 外挂补偿增益（DynamicsCompressorNode 无 makeup 参数）──
  const compressor = ctx.createDynamicsCompressor()
  const makeup = ctx.createGain()

  // ── Stereo：中/侧矩阵展宽 ──
  //   mid  = 0.5(L+R)，side = 0.5(L-R)
  //   outL = mid + width·side，outR = mid − width·side
  //   width = 1 时数学上恒等，故 width≈1 时整段物理旁路。
  const splitter = ctx.createChannelSplitter(2)
  const midL = ctx.createGain()
  const midR = ctx.createGain()
  const sideL = ctx.createGain()
  const sideR = ctx.createGain()
  const midSum = ctx.createGain()
  const sideSum = ctx.createGain()
  const sideWidth = ctx.createGain()
  const sideNeg = ctx.createGain()
  const outL = ctx.createGain()
  const outR = ctx.createGain()
  const merger = ctx.createChannelMerger(2)

  midL.gain.value = 0.5
  midR.gain.value = 0.5
  sideL.gain.value = 0.5
  sideR.gain.value = -0.5
  sideNeg.gain.value = -1

  splitter.connect(midL, 0)
  splitter.connect(sideL, 0)
  splitter.connect(midR, 1)
  splitter.connect(sideR, 1)
  midL.connect(midSum)
  midR.connect(midSum)
  sideL.connect(sideSum)
  sideR.connect(sideSum)
  sideSum.connect(sideWidth)
  sideWidth.connect(outL)
  sideWidth.connect(sideNeg)
  sideNeg.connect(outR)
  midSum.connect(outL)
  midSum.connect(outR)
  outL.connect(merger, 0, 0)
  outR.connect(merger, 0, 1)

  // ── Saturation：WaveShaper 软削波 + 干湿并联 ──
  // oversample='4x' 是原生抗混叠，不需要自研过采样
  const saturationIn = ctx.createGain()
  const saturationDry = ctx.createGain()
  const saturationShaper = ctx.createWaveShaper()
  saturationShaper.oversample = '4x'
  const saturationWet = ctx.createGain()
  const saturationOut = ctx.createGain()

  // ── Delay：DelayNode + 反馈环 + 干湿并联 ──
  const delayIn = ctx.createGain()
  const delayDry = ctx.createGain()
  const delayNode = ctx.createDelay(MAX_DELAY_SECONDS)
  const delayFeedback = ctx.createGain()
  const delayWet = ctx.createGain()
  const delayOut = ctx.createGain()

  // ── Chorus：LFO 调制 DelayNode.delayTime + 干湿并联 ──
  // AudioParam 会把「内在值 + 所有连接输入」求和，因此 LFO 调制完全不需要 JS 参与
  const chorusIn = ctx.createGain()
  const chorusDry = ctx.createGain()
  const chorusDelay = ctx.createDelay(CHORUS_BASE_DELAY + CHORUS_MAX_MOD + 0.005)
  const chorusLfo = ctx.createOscillator()
  const chorusDepth = ctx.createGain()
  const chorusWet = ctx.createGain()
  const chorusOut = ctx.createGain()

  chorusLfo.type = 'sine'
  chorusDepth.gain.value = 0

  // ── Reverb：干湿并联 ──
  const reverbDry = ctx.createGain()
  const convolver = ctx.createConvolver()
  const reverbWet = ctx.createGain()
  const reverbOut = ctx.createGain()

  // ── Limiter：安全兜底 ──
  const limiter = ctx.createDynamicsCompressor()

  // ============================================================
  //  IR 缓存（避免拖动房间尺度时反复生成）
  // ============================================================

  const irCache = new Map<string, AudioBuffer>()
  const getIR = (roomSize: number, decay: number): AudioBuffer => {
    const key = `${roomSize.toFixed(2)}:${decay.toFixed(2)}`
    const hit = irCache.get(key)
    if (hit) return hit
    const ir = createReverbIR(ctx, roomSize, decay)
    if (irCache.size > 8) irCache.clear()
    irCache.set(key, ir)
    return ir
  }

  /** 饱和曲线缓存：drive 变化时重建，避免每次 apply 都分配 2KB 数组 */
  const saturationCurveCache = new Map<number, Float32Array<ArrayBuffer>>()
  const getSaturationCurve = (drive: number): Float32Array<ArrayBuffer> => {
    const key = Math.round(Math.max(0, drive) * 100) / 100
    const hit = saturationCurveCache.get(key)
    if (hit) return hit
    const curve = createSaturationCurve(key)
    if (saturationCurveCache.size > 16) saturationCurveCache.clear()
    saturationCurveCache.set(key, curve)
    return curve
  }

  // ============================================================
  //  内部状态
  // ============================================================

  let active: StageId[] = []
  /** 当前启用的滤波槽下标（升序）。滤波槽是「一组同类段」，单独记录才能跳过未启用的槽 */
  let activeFilterSlots: number[] = []
  let disposed = false
  let chorusLfoStarted = false

  /** 合唱 LFO 只需启动一次；未启用合唱时它不在信号路径上，空转开销可忽略 */
  const ensureChorusLfo = () => {
    if (chorusLfoStarted) return
    chorusLfo.start()
    chorusLfoStarted = true
  }

  // ============================================================
  //  路由：按当前活跃模块重建连接，中性模块不参与
  // ============================================================

  const allNodes: AudioNode[] = [
    input, output,
    inputGainNode,
    dcBlock,
    bassShelf, bassDry, bassHarmonicLP, bassHarmonicShaper, bassHarmonicGain, bassOut,
    compressor, makeup,
    saturationIn, saturationDry, saturationShaper, saturationWet, saturationOut,
    splitter, midL, midR, sideL, sideR, midSum, sideSum, sideWidth, sideNeg, outL, outR, merger,
    delayIn, delayDry, delayNode, delayFeedback, delayWet, delayOut,
    chorusIn, chorusDry, chorusDelay, chorusLfo, chorusDepth, chorusWet, chorusOut,
    reverbDry, convolver, reverbWet, reverbOut,
    toneShelf,
    balancePanner,
    ...filterSlots,
    limiter,
  ]

  const disconnectAll = () => {
    for (const node of allNodes) {
      try {
        node.disconnect()
      } catch {
        // 未连接时个别实现会抛错，忽略
      }
    }
  }

  /** 把内部固定连线补回来（这些连线不随配置变化） */
  const connectInternals = () => {
    splitter.connect(midL, 0)
    splitter.connect(sideL, 0)
    splitter.connect(midR, 1)
    splitter.connect(sideR, 1)
    midL.connect(midSum)
    midR.connect(midSum)
    sideL.connect(sideSum)
    sideR.connect(sideSum)
    sideSum.connect(sideWidth)
    sideWidth.connect(outL)
    sideWidth.connect(sideNeg)
    sideNeg.connect(outR)
    midSum.connect(outL)
    midSum.connect(outR)
    outL.connect(merger, 0, 0)
    outR.connect(merger, 0, 1)

    // bass 内部：干声 + 谐波支路
    bassShelf.connect(bassDry)
    bassDry.connect(bassOut)
    bassShelf.connect(bassHarmonicLP)
    bassHarmonicLP.connect(bassHarmonicShaper)
    bassHarmonicShaper.connect(bassHarmonicGain)
    bassHarmonicGain.connect(bassOut)

    // compressor 内部
    compressor.connect(makeup)

    // saturation 内部：干湿并联（干路必须保留，否则 100% 湿会变成纯失真）
    saturationIn.connect(saturationDry)
    saturationDry.connect(saturationOut)
    saturationIn.connect(saturationShaper)
    saturationShaper.connect(saturationWet)
    saturationWet.connect(saturationOut)

    // delay 内部：干路 + 带反馈的湿路
    delayIn.connect(delayDry)
    delayDry.connect(delayOut)
    delayIn.connect(delayNode)
    delayNode.connect(delayFeedback)
    delayFeedback.connect(delayNode)
    delayNode.connect(delayWet)
    delayWet.connect(delayOut)

    // chorus 内部：干路 + LFO 调制的湿路
    chorusIn.connect(chorusDry)
    chorusDry.connect(chorusOut)
    chorusIn.connect(chorusDelay)
    chorusDelay.connect(chorusWet)
    chorusWet.connect(chorusOut)
    chorusLfo.connect(chorusDepth)
    chorusDepth.connect(chorusDelay.delayTime)

    // reverb 内部：干湿并联
    reverbDry.connect(reverbOut)
    convolver.connect(reverbWet)
    reverbWet.connect(reverbOut)
  }

  /** 每段子链的入口/出口定义（延迟到调用时构造，避免引用过期节点） */
  const segmentOf = (id: StageId): Segment | null => {
    switch (id) {
      case 'inputGain': return { in: inputGainNode, out: inputGainNode }
      case 'dcBlock': return { in: dcBlock, out: dcBlock }
      case 'bass': return { in: bassShelf, out: bassOut }
      case 'compressor': return { in: compressor, out: makeup }
      case 'saturation': return { in: saturationIn, out: saturationOut }
      case 'stereo': return { in: splitter, out: merger }
      case 'delay': return { in: delayIn, out: delayOut }
      case 'chorus': return { in: chorusIn, out: chorusOut }
      case 'reverb': return { in: reverbDry, out: reverbOut }
      case 'tone': return { in: toneShelf, out: toneShelf }
      case 'balance': return { in: balancePanner, out: balancePanner }
      // 滤波槽是一组节点，由 route() 单独展开
      default: return null
    }
  }

  const route = () => {
    if (disposed) return
    disconnectAll()
    connectInternals()

    if (active.length === 0) {
      // 全中性：输入直连输出，等价于一段零处理导线
      input.connect(output)
      return
    }

    let cursor: AudioNode = input
    for (const id of active) {
      if (id === 'filters') {
        // 只串入启用的槽；中间未启用的槽直接跳过（不做「空槽串联」）
        for (const index of activeFilterSlots) {
          const node = filterSlots[index]
          if (!node) continue
          cursor.connect(node)
          cursor = node
        }
        continue
      }
      const segment = segmentOf(id)
      if (!segment) continue
      cursor.connect(segment.in)
      cursor = segment.out
    }
    cursor.connect(limiter)
    limiter.connect(output)
  }

  // ============================================================
  //  应用配置
  // ============================================================

  const applyFilterSlots = (slots: FilterSlotConfig[], on: boolean): number[] => {
    const enabledIndexes: number[] = []
    for (let index = 0; index < filterSlots.length; index++) {
      const node = filterSlots[index]
      const slot = slots[index]
      if (!node) continue
      // 缺失的槽一律按中性处理，避免 undefined 污染 AudioParam
      const cfg: FilterSlotConfig = slot ?? {
        enabled: false, type: 'peaking', frequency: 1000, q: 1, gain: 0,
      }
      const active = on && !!cfg.enabled
      if (active) {
        enabledIndexes.push(index)
        if (node.type !== cfg.type) node.type = cfg.type
        ramp(node.frequency, Math.max(10, cfg.frequency))
        ramp(node.Q, clamp(cfg.q, FILTER_Q_MIN, FILTER_Q_MAX))
        // 只有 peaking / shelf 使用增益；lowpass 等类型的 gain 是无效值，
        // 但写 0 而不是原值可以让频响与 response.ts 的计算保持一致
        const usesGain = cfg.type === 'peaking' || cfg.type === 'lowshelf' || cfg.type === 'highshelf'
        ramp(node.gain, usesGain ? cfg.gain : 0)
      } else {
        // 未启用的槽保持「恒等」状态，保证它即使被误接入也不改变信号
        node.type = 'peaking'
        snap(node.frequency, 1000)
        snap(node.Q, 1)
        snap(node.gain, 0)
      }
    }
    return enabledIndexes
  }

  const apply = (config: GalaxyDSPConfig) => {
    if (disposed) return
    const on = config.enabled

    // ── 输入增益（线性增益，dB → 幅值）──
    const inputGainActive = on && config.inputGain.enabled &&
      Math.abs(config.inputGain.gain) > EQ_EPS
    if (inputGainActive) ramp(inputGainNode.gain, Math.pow(10, config.inputGain.gain / 20))
    else snap(inputGainNode.gain, 1)

    // ── EQ：交给主链路的 biquad ──
    options.applyEq?.(config.eq)

    // ── DC 阻断 ──
    const dcActive = on && config.dcBlock.enabled
    if (dcActive) ramp(dcBlock.frequency, Math.max(1, config.dcBlock.frequency))

    // ── Bass ──
    const bassActive = on &&
      config.bass.enabled &&
      (Math.abs(config.bass.gain) > EQ_EPS || config.bass.harmonics > EQ_EPS)
    if (bassActive) {
      ramp(bassShelf.frequency, config.bass.frequency)
      ramp(bassShelf.Q, config.bass.q)
      ramp(bassShelf.gain, config.bass.gain)
      ramp(bassHarmonicLP.frequency, Math.max(30, config.bass.frequency * 2))
      ramp(bassHarmonicGain.gain, config.bass.harmonics)
      // mix 控制干声比例：mix 1 = 全湿，0 = 全干
      ramp(bassDry.gain, 1 - config.bass.mix * 0.5)
    } else {
      snap(bassShelf.gain, 0)
      snap(bassHarmonicGain.gain, 0)
    }

    // ── Compressor ──
    const compActive = on && config.compressor.enabled
    if (compActive) {
      ramp(compressor.threshold, config.compressor.threshold)
      ramp(compressor.ratio, Math.max(1, config.compressor.ratio))
      ramp(compressor.attack, config.compressor.attack)
      ramp(compressor.release, config.compressor.release)
      ramp(compressor.knee, config.compressor.knee)
      // makeup 是线性增益（1 = 0dB）
      ramp(makeup.gain, config.compressor.makeup)
    } else {
      snap(makeup.gain, 1)
    }

    // ── Saturation（原生 WaveShaper + 4x 过采样）──
    const satActive = on && config.saturation.enabled &&
      (config.saturation.drive > EQ_EPS || config.saturation.mix > EQ_EPS)
    if (satActive) {
      const curve = getSaturationCurve(config.saturation.drive)
      if (saturationShaper.curve !== curve) saturationShaper.curve = curve
      ramp(saturationDry.gain, 1 - config.saturation.mix * 0.5)
      ramp(saturationWet.gain, config.saturation.mix)
    } else {
      snap(saturationWet.gain, 0)
      snap(saturationDry.gain, 1)
    }

    // ── Stereo 展宽 ──
    const width = Math.min(1.4, Math.max(0.7, config.stereo.width))
    const stereoActive = on && Math.abs(width - 1) > EQ_EPS
    if (stereoActive) ramp(sideWidth.gain, width)
    else snap(sideWidth.gain, 1)

    // ── Delay（原生 DelayNode + 反馈环）──
    const delayActive = on && config.delay.enabled && config.delay.mix > EQ_EPS
    if (delayActive) {
      ramp(delayNode.delayTime, Math.min(MAX_DELAY_SECONDS, Math.max(0.001, config.delay.time)))
      // 反馈上限 0.9：再高会自激啸叫且永不停息
      ramp(delayFeedback.gain, Math.min(0.9, Math.max(0, config.delay.feedback)))
      ramp(delayDry.gain, 1 - config.delay.mix * 0.5)
      ramp(delayWet.gain, config.delay.mix)
    } else {
      snap(delayWet.gain, 0)
      snap(delayDry.gain, 1)
      snap(delayFeedback.gain, 0)
    }

    // ── Chorus（原生 Oscillator 调制 DelayNode.delayTime）──
    const chorusActive = on && config.chorus.enabled && config.chorus.mix > EQ_EPS
    if (chorusActive) {
      ensureChorusLfo()
      ramp(chorusLfo.frequency, Math.max(0.01, config.chorus.rate))
      ramp(chorusDepth.gain, Math.max(0, Math.min(1, config.chorus.depth)) * CHORUS_MAX_MOD)
      ramp(chorusDelay.delayTime, CHORUS_BASE_DELAY)
      ramp(chorusDry.gain, 1 - config.chorus.mix * 0.5)
      ramp(chorusWet.gain, config.chorus.mix)
    } else {
      snap(chorusWet.gain, 0)
      snap(chorusDry.gain, 1)
      snap(chorusDepth.gain, 0)
    }

    // ── Reverb ──
    const reverbActive = on && config.reverb.enabled && config.reverb.mix > EQ_EPS
    if (reverbActive) {
      const ir = getIR(config.reverb.roomSize, config.reverb.decay)
      if (convolver.buffer !== ir) convolver.buffer = ir
      // 干湿平衡：mix 0.5 ≈ 等响，不做归一化（响度匹配整体后置）
      ramp(reverbDry.gain, 1 - config.reverb.mix * 0.5)
      ramp(reverbWet.gain, config.reverb.mix)
    } else {
      snap(reverbWet.gain, 0)
      snap(reverbDry.gain, 1)
    }

    // ── Tone（高频架）──
    const toneActive = on && config.tone.enabled && Math.abs(config.tone.gain) > EQ_EPS
    if (toneActive) {
      ramp(toneShelf.frequency, Math.max(100, config.tone.frequency))
      ramp(toneShelf.gain, config.tone.gain)
    } else {
      snap(toneShelf.gain, 0)
    }

    // ── Balance（左右平衡）──
    const balanceActive = on && config.balance.enabled && Math.abs(config.balance.pan) > EQ_EPS
    if (balanceActive) ramp(balancePanner.pan, clamp(config.balance.pan, -1, 1))
    else snap(balancePanner.pan, 0)

    // ── Filters（通用滤波槽）──
    const nextFilterSlots = applyFilterSlots(config.filters, on)
    const filtersActive = nextFilterSlots.length > 0

    // ── Limiter（安全底线，不随 intensity 缩放）──
    ramp(limiter.threshold, config.limiter.ceiling)
    ramp(limiter.knee, 0)
    ramp(limiter.ratio, 20)
    ramp(limiter.attack, 0.002)
    ramp(limiter.release, Math.max(0.01, config.limiter.release / 1000))

    // ── 重算活跃模块并重建路由（顺序即链路顺序，与 types.ts 的字段顺序一致）──
    const next: StageId[] = []
    if (inputGainActive) next.push('inputGain')
    if (dcActive) next.push('dcBlock')
    if (bassActive) next.push('bass')
    if (compActive) next.push('compressor')
    if (satActive) next.push('saturation')
    if (stereoActive) next.push('stereo')
    if (delayActive) next.push('delay')
    if (chorusActive) next.push('chorus')
    if (reverbActive) next.push('reverb')
    if (toneActive) next.push('tone')
    if (balanceActive) next.push('balance')
    if (filtersActive) next.push('filters')

    const changed = next.length !== active.length || next.some((id, i) => id !== active[i]) ||
      nextFilterSlots.length !== activeFilterSlots.length ||
      nextFilterSlots.some((index, i) => index !== activeFilterSlots[i])
    active = next
    activeFilterSlots = nextFilterSlots
    if (changed) route()
  }

  // 初始状态：全中性，输入直连输出
  route()

  return {
    input,
    output,
    apply,
    reroute: () => { route() },
    activeStages: () => [...active],
    dispose: () => {
      disposed = true
      disconnectAll()
      irCache.clear()
    },
  }
}
