import type { GalaxyEngineHandle } from './galaxy/engine'
import { createGalaxyEngine } from './galaxy/engine'
import type { SmartAnalyserSet } from './galaxy/measure'
import type { EQBand, GalaxyDSPConfig } from './galaxy/types'
import { ENHANCE_REVERB_MAX_WET } from './audioEffects'

interface HTMLAudioElementChrome extends HTMLAudioElement {
  setSinkId: (id: string) => Promise<void>
}
// 转出 audioEffects 中的预设常量（EqCurve.vue 从这里取 EQ_GAIN_MIN / EQ_GAIN_MAX）
// 注意：这几个常量此前漏转出，导致 EQ 曲线控制点的取值范围拿到 undefined（webpack 只报 warning 不报错）。
// 增强滑条的量程常量也一并转出，供面板的滑条 min/max 使用 —— 让 UI 与引擎共用同一份定义。
export {
  eqPresets,
  surroundModes,
  EQ_FREQUENCIES,
  EQ_GAIN_MIN,
  EQ_GAIN_MAX,
  EQ_Q,
  ENHANCE_MAX,
  ENHANCE_BALANCE_MAX,
  reverbWetFromIntensity,
  surroundRadiusFromIntensity,
} from './audioEffects'
let audio: HTMLAudioElementChrome | null = null
let audioContext: AudioContext
let mediaSource: MediaElementAudioSourceNode
let analyser: AnalyserNode
// https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext
// https://benzleung.gitbooks.io/web-audio-api-mini-guide/content/chapter5-1.html
export const freqs = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const
type Freqs = (typeof freqs)[number]
let biquads: Map<`hz${Freqs}`, BiquadFilterNode>
export const freqsPreset = [
  { name: 'pop', hz31: 4, hz62: 2, hz125: 0, hz250: -3, hz500: -6, hz1000: -6, hz2000: -3, hz4000: 0, hz8000: 1, hz16000: 3 },
  { name: 'dance', hz31: 4, hz62: 3, hz125: -4, hz250: -6, hz500: 0, hz1000: 0, hz2000: 3, hz4000: 4, hz8000: 4, hz16000: 5 },
  { name: 'rock', hz31: 7, hz62: 6, hz125: 2, hz250: 1, hz500: -3, hz1000: -4, hz2000: 2, hz4000: 1, hz8000: 4, hz16000: 5 },
  { name: 'classical', hz31: 6, hz62: 7, hz125: 1, hz250: 2, hz500: -1, hz1000: 1, hz2000: -4, hz4000: -6, hz8000: -7, hz16000: -8 },
  { name: 'vocal', hz31: -5, hz62: -6, hz125: -4, hz250: -3, hz500: 3, hz1000: 4, hz2000: 5, hz4000: 4, hz8000: -3, hz16000: -3 },
  { name: 'slow', hz31: 5, hz62: 4, hz125: 2, hz250: 0, hz500: -2, hz1000: 0, hz2000: 3, hz4000: 6, hz8000: 7, hz16000: 8 },
  { name: 'electronic', hz31: 6, hz62: 5, hz125: 0, hz250: -5, hz500: -4, hz1000: 0, hz2000: 6, hz4000: 8, hz8000: 8, hz16000: 7 },
  { name: 'subwoofer', hz31: 8, hz62: 7, hz125: 5, hz250: 4, hz500: 0, hz1000: 0, hz2000: 0, hz4000: 0, hz8000: 0, hz16000: 0 },
  { name: 'soft', hz31: -5, hz62: -5, hz125: -4, hz250: -4, hz500: 3, hz1000: 2, hz2000: 4, hz4000: 4, hz8000: 0, hz16000: 0 },
] as const
export const convolutions = [
  { name: 'telephone', mainGain: 0.0, sendGain: 3.0, source: 'filter-telephone.wav' }, // 电话
  { name: 's2_r4_bd', mainGain: 1.8, sendGain: 0.9, source: 's2_r4_bd.wav' }, // 教堂
  { name: 'bright_hall', mainGain: 0.8, sendGain: 2.4, source: 'bright-hall.wav' },
  { name: 'cinema_diningroom', mainGain: 0.6, sendGain: 2.3, source: 'cinema-diningroom.wav' },
  { name: 'dining_living_true_stereo', mainGain: 0.6, sendGain: 1.8, source: 'dining-living-true-stereo.wav' },
  { name: 'living_bedroom_leveled', mainGain: 0.6, sendGain: 2.1, source: 'living-bedroom-leveled.wav' },
  { name: 'spreader50_65ms', mainGain: 1, sendGain: 2.5, source: 'spreader50-65ms.wav' },
  // { name: 'spreader25_125ms', mainGain: 1, sendGain: 2.5, source: 'spreader25-125ms.wav' },
  // { name: 'backslap', mainGain: 1.8, sendGain: 0.8, source: 'backslap1.wav' },
  { name: 's3_r1_bd', mainGain: 1.8, sendGain: 0.8, source: 's3_r1_bd.wav' },
  { name: 'matrix_1', mainGain: 1.5, sendGain: 0.9, source: 'matrix-reverb1.wav' },
  { name: 'matrix_2', mainGain: 1.3, sendGain: 1, source: 'matrix-reverb2.wav' },
  { name: 'cardiod_35_10_spread', mainGain: 1.8, sendGain: 0.6, source: 'cardiod-35-10-spread.wav' },
  { name: 'tim_omni_35_10_magnetic', mainGain: 1, sendGain: 0.2, source: 'tim-omni-35-10-magnetic.wav' },
  // { name: 'spatialized', mainGain: 1.8, sendGain: 0.8, source: 'spatialized8.wav' },
  // { name: 'zing_long_stereo', mainGain: 0.8, sendGain: 1.8, source: 'zing-long-stereo.wav' },
  { name: 'feedback_spring', mainGain: 1.8, sendGain: 0.8, source: 'feedback-spring.wav' },
  // { name: 'tim_omni_rear_blend', mainGain: 1.8, sendGain: 0.8, source: 'tim-omni-rear-blend.wav' },
] as const
// 半音
// export const semitones = [-1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] as const

let convolver: ConvolverNode
let convolverSourceGainNode: GainNode
let convolverOutputGainNode: GainNode
let convolverDynamicsCompressor: DynamicsCompressorNode
let gainNode: GainNode
let panner: PannerNode
let pitchShifterNode: AudioWorkletNode
let pitchShifterNodePitchFactor: AudioParam
let pitchShifterNodeLoadStatus: 'none' | 'loading' | 'unconnect' | 'connected' = 'none'
let pitchShifterNodeTempValue = 1
let defaultChannelCount = 2
export const soundR = 0.5

// ===== 核心链路「按需串入」状态 =====
// 中性（一个音效都没开）时，整条链路必须与「直通」等价，否则干声会被无谓染色：
//   · convolverDynamicsCompressor 未设置任何参数 → 用 Chromium 默认值（-24dB / 12:1 / knee 30），
//     实测会把 20dB 的输入动态范围压成 ~15dB，且小声部被抬高 3.4dB；
//     它本来是给「卷积混响叠加」做压峰的，没开混响就不该在链路里。
//   · panner 是 createPanner()（3D PannerNode），停在原点也有 equalpower 中心衰减 ≈ -3.01dB，
//     只有启用「环绕强度」时才有意义。
let coreOutNode: AudioNode
let isPannerEnabled = false

// ===== 银河音效 2.0 链路（GalaxyDSPConfig 驱动）=====
//
// ⚠️ 这里**只有一条**可插拔链路。历史上「增强效果链」（超重低音/高保真度/
// 动态推进/声道平衡）是另一套独立节点链，与银河引擎互斥，要靠调用方手工维持
// 互斥关系，还导致同一类路由坑踩两次。现在那 4 项滑条由 `galaxy/enhance.ts`
// 编译成一份 GalaxyDSPConfig，走同一个引擎 —— 「推荐音效」「均衡器」
// 「音效制作」三页因此共用同一条链、同一套不变量。
let galaxyEngine: GalaxyEngineHandle | null = null
let isGalaxyOn = false
/**
 * 当前挂载的配置是否要接管主链路 EQ。
 * 由 `setGalaxyChain` 的调用方声明：FX 预设与用户链自带 EQ 曲线（true），
 * 而增强滑条不应该碰用户手调的十段（false）。
 */
let galaxyManagesEq = true


export const createAudio = () => {
  if (audio) return
  audio = new window.Audio() as HTMLAudioElementChrome
  audio.controls = false
  audio.autoplay = true
  audio.preload = 'auto'
  audio.crossOrigin = 'anonymous'

  // https://developer.chrome.com/blog/autoplay
  audio.addEventListener('playing', () => {
    if (audioContext?.state == 'suspended') {
      void audioContext.resume().catch((err) => {
        console.error('Resume audio context failed:', err)
        throw err
      })
    }
  })
}

const initAnalyser = () => {
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
}

const initBiquadFilter = () => {
  biquads = new Map()
  let i

  for (const item of freqs) {
    const filter = audioContext.createBiquadFilter()
    biquads.set(`hz${item}`, filter)
    filter.type = 'peaking'
    filter.frequency.value = item
    filter.Q.value = 1.4
    filter.gain.value = 0
  }

  for (i = 1; i < freqs.length; i++) {
    (biquads.get(`hz${freqs[i - 1]}`)!).connect(biquads.get(`hz${freqs[i]}`)!)
  }
}

const initConvolver = () => {
  convolverSourceGainNode = audioContext.createGain()
  convolverOutputGainNode = audioContext.createGain()
  convolverDynamicsCompressor = audioContext.createDynamicsCompressor()
  // ⚠️ 必须显式设参数。DynamicsCompressorNode 的默认值是
  //   threshold −24dB / knee 30 / ratio 12:1
  // 而这一级是「干声 + 湿声」汇合后唯一的压限，一旦开启混响就会把整体动态压掉一大截：
  // 实测能把 20dB 的输入动态范围压成 ~15dB，小声部被抬高 3.4dB —— 听感就是「混响一开，
  // 声音变闷变扁、没有起伏」，正是「混响强度不好听」的主因。
  // 它的本职只是给卷积叠加做**峰值兜底**，所以配成真正的限幅器（只在接近满刻度时介入）。
  convolverDynamicsCompressor.threshold.value = -1
  convolverDynamicsCompressor.knee.value = 0
  convolverDynamicsCompressor.ratio.value = 20
  convolverDynamicsCompressor.attack.value = 0.003
  convolverDynamicsCompressor.release.value = 0.25
  convolver = audioContext.createConvolver()
  convolver.connect(convolverOutputGainNode)
  convolverSourceGainNode.connect(convolverDynamicsCompressor)
  convolverOutputGainNode.connect(convolverDynamicsCompressor)
}

const initPanner = () => {
  panner = audioContext.createPanner()
}

const initGain = () => {
  gainNode = audioContext.createGain()
}

const initAdvancedAudioFeatures = () => {
  if (audioContext) return
  if (!audio) throw new Error('audio not defined')
  audioContext = new window.AudioContext({ latencyHint: 'playback' })
  defaultChannelCount = audioContext.destination.channelCount

  initAnalyser()
  initBiquadFilter()
  initConvolver()
  initPanner()
  initGain()
  // source -> analyser -> biquadFilter -> pitchShifter -> [(convolver & convolverSource)->卷积压缩器]
  //        -> [增强链(按需插入)] -> [panner(按需插入)] -> gain
  // 括号里的两级都按需串入：中性时链路只剩 analyser / 0dB 均衡 / 增益 1，与直通等价
  mediaSource = audioContext.createMediaElementSource(audio)
  mediaSource.connect(analyser)
  analyser.connect(biquads.get(`hz${freqs[0]}`)!)
  const lastBiquadFilter = (biquads.get(`hz${freqs.at(-1)!}`)!)
  lastBiquadFilter.connect(convolverSourceGainNode)
  lastBiquadFilter.connect(convolver)
  panner.connect(gainNode)
  gainNode.connect(audioContext.destination)

  // 核心链路（卷积压缩器 / panner）与尾段路由同样按需串入：
  // 全部为中性时链路只剩 analyser / 0dB 均衡 / 增益 1，与直通等价
  applyCoreRouting()

  // 音频输出设备改变时刷新 audio node 连接
  window.app_event.on('playerDeviceChanged', handleMediaListChange)

  // audio.addEventListener('playing', connectAudioNode)
  // audio.addEventListener('pause', disconnectAudioNode)
  // audio.addEventListener('waiting', disconnectAudioNode)
  // audio.addEventListener('emptied', disconnectAudioNode)
  // if (!audio.paused) connectAudioNode()
}

const handleMediaListChange = () => {
  mediaSource.disconnect()
  mediaSource.connect(analyser)
  // mediaSource.disconnect() 会一并撤销测量支路，这里必须补回来，
  // 否则换过输出设备之后「智能音效」就再也测不到数据了
  if (smartTaps) connectSmartTaps()
}

// ============================================================
//  尾段路由：coreOutNode → [银河引擎] → (panner|gain) → destination
//
//  这里只有**一段**可插拔的链。历史上「增强效果链」（超重低音/高保真度/
//  动态推进/声道平衡）是与银河引擎并行的第二套节点链，两套链要靠调用方手工
//  维持互斥关系，同一个路由坑还要踩两次。现在那 4 项滑条由
//  `galaxy/enhance.ts` 编译成 GalaxyDSPConfig 走同一个引擎，
//  由 `galaxy/bridge.ts` 的 `syncAudioChain()` 决定挂哪一份配置
//  （优先级：音效制作链 > FX 预设 > 增强滑条 > 中性）。
//
//  铁律：
//   1. **中性即完全旁路**：没有配置时 coreOutNode 直连 tail，干声零处理；
//      引擎内部全中性时也会自行 input → output 直连，等价于一段零处理导线。
//   2. **绝不能 disconnect galaxyEngine.input**（原因见下方注释）。
//   3. 末尾的安全限幅由引擎自带（只在有活跃模块时串入），本文件不再自建一个。
// ============================================================

const rampParam = (param: AudioParam, value: number) => {
  if (audioContext) param.setTargetAtTime(value, audioContext.currentTime, 0.03)
  else param.value = value
}

/** 核心链路按需串入：卷积压缩器只在启用混响时插入；随后重建尾段路由 */
const applyCoreRouting = () => {
  if (!audioContext) return

  for (const node of [convolverSourceGainNode, convolverOutputGainNode, convolverDynamicsCompressor]) {
    try {
      node.disconnect()
    } catch {
      // 无连接时个别实现会抛错，忽略
    }
  }

  if (convolver.buffer) {
    // 启用卷积：干声 + 湿声都汇入压缩器压峰后再送往下一级
    convolverSourceGainNode.connect(convolverDynamicsCompressor)
    convolverOutputGainNode.connect(convolverDynamicsCompressor)
    coreOutNode = convolverDynamicsCompressor
  } else {
    // 未启用卷积：压缩器不参与链路，干声直接送下一级（它与直通等价）
    coreOutNode = convolverSourceGainNode
  }

  applyTailRouting()
}

/** 按当前挂载状态重建 coreOutNode → [银河引擎] → tail 的连接；无配置时直连 */
const applyTailRouting = () => {
  initAdvancedAudioFeatures()

  // 环绕强度未启用时 panner 不参与链路（否则会平白吃掉 ~3dB）
  const tail: AudioNode = isPannerEnabled ? panner : gainNode

  const nodes = [
    coreOutNode,
    // ⚠️ 只能断 output，**绝不能带 galaxyEngine.input**。
    // 银河引擎的 input 同时承担两个角色：对外接收信号、对内连向第一段子链
    // （全中性时是 input → output）。把 input 放进这个列表会把「对内」那条出边一起删掉，
    // 信号进入 input 后就没有出口了 —— 整条链静音，而且因为 engine.apply() 只在
    // 活跃模块集合变化时才重建路由，它不会自愈（再拖一次强度也还是静音）。
    // 外部对 input 的唯一操作是 connect，重复 connect 在 Web Audio 里是幂等的。
    galaxyEngine?.output,
  ]
  for (const node of nodes) {
    if (!node) continue
    try {
      node.disconnect()
    } catch {
      // 无连接时个别实现会抛错，忽略
    }
  }

  if (galaxyEngine && isGalaxyOn) {
    coreOutNode.connect(galaxyEngine.input)
    galaxyEngine.output.connect(tail)
    return
  }

  coreOutNode.connect(tail)
}

/** 环绕强度开关：决定 panner 是否参与链路（关闭时链路与直通等价） */
export const setPannerEnable = (enable: boolean) => {
  if (isPannerEnabled === enable) return
  isPannerEnabled = enable
  if (audioContext) applyTailRouting()
}

// ============================================================
//  银河音效 2.0 —— 对外接入点
//
//  两个函数共同构成 P1 的落地接口；**未被调用时链路与改动前完全一致**。
// ============================================================

/**
 * 把 10 段 EQ 写入主链路的 biquad。
 * 银河链的 EQ 复用主链路，避免「两套 EQ 叠加」；同时让设计要求的
 * 首段 lowshelf / 末段 highshelf / 中间 peaking 真正生效。
 */
export const setEqBands = (bands: EQBand[]) => {
  initAdvancedAudioFeatures()
  freqs.forEach((hz, index) => {
    const filter = biquads.get(`hz${hz}`)
    const band = bands[index]
    if (!filter || !band) return
    if (filter.type !== band.type) filter.type = band.type
    rampParam(filter.frequency, band.frequency)
    rampParam(filter.Q, band.q)
    rampParam(filter.gain, band.gain)
  })
}

/**
 * 挂载 / 卸载银河音效链。
 *
 *   · 传 null            → 卸载，coreOutNode 直连 tail（干声零处理）
 *   · 传配置 + manageEq  → 启用链路；manageEq 决定这份配置是否接管主链路 EQ
 *
 * `manageEq` 必须由调用方显式声明，不能由配置内容推断：
 *   · FX 预设 / 「音效制作」用户链自带 EQ 曲线 → true
 *   · 「均衡器」页的 4 条增强滑条不碰用户手调的十段 → false
 *     否则一份全平的 EQ 会把用户刚拖好的曲线无声清掉。
 */
export const setGalaxyChain = (
  config: GalaxyDSPConfig | null,
  options: { manageEq?: boolean } = {},
) => {
  if (!config) {
    if (!galaxyEngine) return
    isGalaxyOn = false
    galaxyEngine.dispose()
    galaxyEngine = null
    if (audioContext) applyTailRouting()
    return
  }

  initAdvancedAudioFeatures()
  if (!galaxyEngine) {
    galaxyEngine = createGalaxyEngine(audioContext, {
      // 用可变标志而不是两个引擎：EQ 的接管权随「谁在驱动这条链」变化，
      // 而引擎本体（及其全部节点与缓存）应该复用。
      applyEq: bands => {
        if (galaxyManagesEq) setEqBands(bands)
      },
    })
  }
  galaxyManagesEq = options.manageEq ?? true
  isGalaxyOn = true
  galaxyEngine.apply(config)
  applyTailRouting()
}

/**
 * 把主链路 EQ 恢复为「原有行为」：全段 peaking、Q = 1.4，增益取传入的十段值。
 * 银河链卸载时调用，确保 biquad 不残留银河链写入的 shelf 类型与 Q 值。
 */
export const resetEqToLegacy = (gains: readonly number[]) => {
  initAdvancedAudioFeatures()
  freqs.forEach((hz, index) => {
    const filter = biquads.get(`hz${hz}`)
    if (!filter) return
    filter.type = 'peaking'
    rampParam(filter.frequency, hz)
    rampParam(filter.Q, 1.4)
    rampParam(filter.gain, gains[index] ?? 0)
  })
}

/** 当前银河链真正串入的模块（供 UI 显示 / 调试；未启用时为空数组） */
export const getGalaxyActiveStages = (): string[] =>
  galaxyEngine && isGalaxyOn ? galaxyEngine.activeStages() : []

// ============================================================
//  「智能音效」测量取样点
//
//  取样点刻意放在 **mediaSource 之后、EQ 与音效链之前**：
//  智能补偿要描述的是「音乐本身」的特征。若在链路末端取样，自己刚才的处理结果
//  会被当成素材特征，形成「补偿 → 测量结果变化 → 再补偿」的正反馈 ——
//  每检测一次就把上一次的结果再放大一遍。
// ============================================================
/**
 * 取样支路的节点。
 *
 * 这里刻意持有**具体的 AnalyserNode** 而不是 `SmartAnalyserSet`：
 * 后者是给 measure.ts 用的最小结构化接口（只要求两个 getFloat 方法），
 * 拿它去 `connect()` 会因为不是 `AudioNode` 而编译不过。
 * 「对外的窄接口」与「对内的真实节点类型」要分开，否则连接处必然要断言。
 */
let smartTaps: {
  splitter: ChannelSplitterNode
  spectrum: AnalyserNode
  left: AnalyserNode
  right: AnalyserNode
} | null = null

/** 惰性建出取样支路；已建过则直接返回 */
const ensureSmartTaps = () => {
  if (!audioContext) return null

  if (!smartTaps) {
    const spectrum = audioContext.createAnalyser()
    // 2048 → 48kHz 下 bin 宽约 23Hz，20~250Hz 有约 10 个 bin。
    // 沿用主链路那个 256（bin 宽 187Hz，低频只剩 1 个 bin）会让 lowRatio 完全不可用。
    spectrum.fftSize = 2048
    // 取瞬时值：跨帧平均由 measure.ts 负责，节点再做时间平滑会变成双重平滑、掩盖动态
    spectrum.smoothingTimeConstant = 0

    const left = audioContext.createAnalyser()
    left.fftSize = 2048
    const right = audioContext.createAnalyser()
    right.fftSize = 2048

    const splitter = audioContext.createChannelSplitter(2)
    splitter.connect(left, 0)
    splitter.connect(right, 1)

    // AnalyserNode 允许不接下游，但不同实现可能因此不调度该支路。
    // 接一个 0 增益汇点到 destination：保证支路一定被渲染，对输出零影响。
    // 该汇点被音频图强引用，无需在模块里再留变量。
    const sink = audioContext.createGain()
    sink.gain.value = 0
    for (const node of [spectrum, left, right]) node.connect(sink)
    sink.connect(audioContext.destination)

    smartTaps = { splitter, spectrum, left, right }
  }

  return smartTaps
}

const connectSmartTaps = () => {
  if (!audioContext || !mediaSource) return
  const taps = ensureSmartTaps()
  if (!taps) return
  // 同一个 (输出, 输入) 对重复连接在 Web Audio 里是幂等的，因此这里可以无脑重接
  mediaSource.connect(taps.splitter)
  mediaSource.connect(taps.spectrum)
}

/**
 * 智能测量用的分析器集合。音频上下文尚未建立时返回 null，
 * 由调用方提示「请先播放音乐」而不是静默失败。
 */
export const getSmartAnalysers = (): SmartAnalyserSet | null => {
  initAdvancedAudioFeatures()
  connectSmartTaps()
  if (!smartTaps) return null
  return { spectrum: smartTaps.spectrum, left: smartTaps.left, right: smartTaps.right }
}

// let isConnected = true
// const connectAudioNode = () => {
//   if (isConnected) return
//   console.log('connect Node')
//   mediaSource.connect(analyser)
//   isConnected = true
//   if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
//     disconnectPitchShifterNode()
//   }
// }

// const disconnectAudioNode = () => {
//   if (!isConnected) return
//   console.log('disconnect Node')
//   mediaSource.disconnect()
//   isConnected = false
//   if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
//     disconnectPitchShifterNode()
//   }
// }

export const getAudioContext = () => {
  initAdvancedAudioFeatures()
  return audioContext
}

let unsubMediaListChangeEvent: (() => void) | null = null
export const setMaxOutputChannelCount = (enable: boolean) => {
  if (enable) {
    initAdvancedAudioFeatures()
    audioContext.destination.channelCountMode = 'max'
    audioContext.destination.channelCount = audioContext.destination.maxChannelCount
    // navigator.mediaDevices.addEventListener('devicechange', handleMediaListChange)
    if (!unsubMediaListChangeEvent) {
      let handleMediaListChange = () => {
        setMaxOutputChannelCount(true)
      }
      window.app_event.on('playerDeviceChanged', handleMediaListChange)
      unsubMediaListChangeEvent = () => {
        window.app_event.off('playerDeviceChanged', handleMediaListChange)
        unsubMediaListChangeEvent = null
      }
    }
  } else {
    unsubMediaListChangeEvent?.()
    if (audioContext && audioContext.destination.channelCountMode != 'explicit') {
      audioContext.destination.channelCount = defaultChannelCount
      // audioContext.destination.channelInterpretation
      audioContext.destination.channelCountMode = 'explicit'
    }
  }
}

export const getAnalyser = (): AnalyserNode | null => {
  initAdvancedAudioFeatures()
  return analyser
}

export const getBiquadFilter = () => {
  initAdvancedAudioFeatures()
  return biquads
}

// let isConvolverConnected = false
/** 干路增益（与湿声分开，见 setConvolverMainGain） */
export const setConvolver = (buffer: AudioBuffer | null, mainGain: number, sendGain: number) => {
  initAdvancedAudioFeatures()
  convolver.buffer = buffer
  // console.log(mainGain, sendGain)
  if (buffer) {
    convolverSourceGainNode.gain.value = mainGain
    // 与 setConvolverSendGain 同一套钳位，避免两条写入路径行为不一致
    convolverOutputGainNode.gain.value = Math.min(ENHANCE_REVERB_MAX_WET, Math.max(0, sendGain))
  } else {
    convolverSourceGainNode.gain.value = 1
    convolverOutputGainNode.gain.value = 0
  }
  // 有没有卷积决定了压缩器是否参与链路，需要重建
  applyCoreRouting()
}

export const setConvolverMainGain = (gain: number) => {
  if (convolverSourceGainNode.gain.value == gain) return
  // console.log(gain)
  convolverSourceGainNode.gain.value = gain
}

export const setConvolverSendGain = (gain: number) => {
  // 兜底钳位：设置里可能存着历史遗留的超大值（滑条上限从 50 收到 20 之前调的），
  // 5.0 的湿声（≈ +14dB）会糊成一团。这里钳住而不是去改用户的存档，避免静默改数据。
  const safe = Math.min(ENHANCE_REVERB_MAX_WET, Math.max(0, gain))
  if (convolverOutputGainNode.gain.value == safe) return
  convolverOutputGainNode.gain.value = safe
}

let pannerInfo = {
  x: 0,
  y: 0,
  z: 0,
  soundR: 0.5,
  rad: 0,
  speed: 1,
  intv: null as NodeJS.Timeout | null,
}
const setPannerXYZ = (nx: number, ny: number, nz: number) => {
  pannerInfo.x = nx
  pannerInfo.y = ny
  pannerInfo.z = nz
  // console.log(pannerInfo)
  panner.positionX.value = nx * pannerInfo.soundR
  panner.positionY.value = ny * pannerInfo.soundR
  panner.positionZ.value = nz * pannerInfo.soundR
}
export const setPannerSoundR = (r: number) => {
  pannerInfo.soundR = r
}

export const setPannerSpeed = (speed: number) => {
  pannerInfo.speed = speed
  if (pannerInfo.intv) startPanner()
}
export const stopPanner = () => {
  if (pannerInfo.intv) {
    clearInterval(pannerInfo.intv)
    pannerInfo.intv = null
    pannerInfo.rad = 0
  }
  panner.positionX.value = 0
  panner.positionY.value = 0
  panner.positionZ.value = 0
}

export const startPanner = () => {
  initAdvancedAudioFeatures()
  if (pannerInfo.intv) {
    clearInterval(pannerInfo.intv)
    pannerInfo.intv = null
    pannerInfo.rad = 0
  }
  pannerInfo.intv = setInterval(() => {
    pannerInfo.rad += 1
    if (pannerInfo.rad > 360) pannerInfo.rad -= 360
    setPannerXYZ(Math.sin(pannerInfo.rad * Math.PI / 180), Math.cos(pannerInfo.rad * Math.PI / 180), Math.cos(pannerInfo.rad * Math.PI / 180))
  }, pannerInfo.speed * 10)
}

let isConnected = true
const connectNode = () => {
  if (isConnected) return
  console.log('connect Node')
  analyser?.connect(biquads.get(`hz${freqs[0]}`)!)
  isConnected = true
  if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
    disconnectPitchShifterNode()
  }
}
const disconnectNode = () => {
  if (!isConnected) return
  console.log('disconnect Node')
  analyser?.disconnect()
  isConnected = false
  if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
    disconnectPitchShifterNode()
  }
}
const connectPitchShifterNode = () => {
  console.log('connect Pitch Shifter Node')
  audio!.addEventListener('playing', connectNode)
  audio!.addEventListener('pause', disconnectNode)
  audio!.addEventListener('waiting', disconnectNode)
  audio!.addEventListener('emptied', disconnectNode)
  if (audio!.paused) disconnectNode()

  const lastBiquadFilter = (biquads.get(`hz${freqs.at(-1)!}`)!)
  lastBiquadFilter.disconnect()
  lastBiquadFilter.connect(pitchShifterNode)

  pitchShifterNode.connect(convolver)
  pitchShifterNode.connect(convolverSourceGainNode)
  // convolverDynamicsCompressor.disconnect(panner)
  // convolverDynamicsCompressor.connect(pitchShifterNode)
  // pitchShifterNode.connect(panner)
  pitchShifterNodeLoadStatus = 'connected'
  pitchShifterNodePitchFactor.value = pitchShifterNodeTempValue
}
const disconnectPitchShifterNode = () => {
  console.log('disconnect Pitch Shifter Node')
  const lastBiquadFilter = (biquads.get(`hz${freqs.at(-1)!}`)!)
  lastBiquadFilter.disconnect()
  lastBiquadFilter.connect(convolver)
  lastBiquadFilter.connect(convolverSourceGainNode)
  pitchShifterNodeLoadStatus = 'unconnect'

  audio!.removeEventListener('playing', connectNode)
  audio!.removeEventListener('pause', disconnectNode)
  audio!.removeEventListener('waiting', disconnectNode)
  audio!.removeEventListener('emptied', disconnectNode)
  connectNode()
}
const loadPitchShifterNode = () => {
  pitchShifterNodeLoadStatus = 'loading'
  initAdvancedAudioFeatures()
  // source -> analyser -> biquadFilter -> audioWorklet(pitch shifter) -> [(convolver & convolverSource)->convolverDynamicsCompressor] -> panner -> gain
  void audioContext.audioWorklet.addModule(new URL(
    /* webpackChunkName: 'pitch_shifter.audioWorklet' */
    './pitch-shifter/phase-vocoder.js',
    import.meta.url,
  )).then(() => {
    console.log('pitch shifter audio worklet loaded')
    // https://github.com/olvb/phaze/issues/26#issuecomment-1574629971
    pitchShifterNode = new AudioWorkletNode(audioContext, 'phase-vocoder-processor', { outputChannelCount: [2] })
    let pitchFactorParam = pitchShifterNode.parameters.get('pitchFactor')
    if (!pitchFactorParam) return
    pitchShifterNodePitchFactor = pitchFactorParam
    pitchShifterNodeLoadStatus = 'unconnect'
    if (pitchShifterNodeTempValue == 1) return

    connectPitchShifterNode()
  })
}

export const setPitchShifter = (val: number) => {
  // console.log('setPitchShifter', val)
  pitchShifterNodeTempValue = val
  switch (pitchShifterNodeLoadStatus) {
    case 'loading':
      break
    case 'none':
      loadPitchShifterNode()
      break
    case 'connected':
      // a: 1 = 半音
      // value = 2 ** (a / 12)
      pitchShifterNodePitchFactor.value = val
      break
    case 'unconnect':
      connectPitchShifterNode()
      break
  }
}

export const hasInitedAdvancedAudioFeatures = (): boolean => audioContext != null

export const setResource = (src: string) => {
  if (audio) audio.src = src
}

export const setPlay = () => {
  void audio?.play()
}

export const setPause = () => {
  audio?.pause()
}

export const setStop = () => {
  if (audio) {
    audio.src = ''
    audio.removeAttribute('src')
  }
}

export const isEmpty = (): boolean => !audio?.src

export const setLoopPlay = (isLoop: boolean) => {
  if (audio) audio.loop = isLoop
}

export const getPlaybackRate = (): number => {
  return audio?.defaultPlaybackRate ?? 1
}

export const setPlaybackRate = (rate: number) => {
  if (!audio) return
  audio.defaultPlaybackRate = rate
  audio.playbackRate = rate
}

export const setPreservesPitch = (preservesPitch: boolean) => {
  if (!audio) return
  audio.preservesPitch = preservesPitch
}

export const getMute = (): boolean => {
  return audio?.muted ?? false
}

export const setMute = (isMute: boolean) => {
  if (audio) audio.muted = isMute
}

export const getCurrentTime = () => {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return audio?.currentTime || 0
}

export const setCurrentTime = (time: number) => {
  if (audio) audio.currentTime = time
}

export const setMediaDeviceId = async(mediaDeviceId: string): Promise<void> => {
  if (!audio) return
  return audio.setSinkId(mediaDeviceId)
}

export const setVolume = (volume: number) => {
  if (audio) audio.volume = volume
}

export const getDuration = () => {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return audio?.duration || 0
}

// export const getPlaybackRate = () => {
//   return audio?.playbackRate ?? 1
// }

type Noop = () => void

export const onPlaying = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('playing', callback)
  return () => {
    audio?.removeEventListener('playing', callback)
  }
}

export const onPause = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio?.addEventListener('pause', callback)
  return () => {
    audio?.removeEventListener('pause', callback)
  }
}

export const onEnded = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('ended', callback)
  return () => {
    audio?.removeEventListener('ended', callback)
  }
}

export const onError = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('error', callback)
  return () => {
    audio?.removeEventListener('error', callback)
  }
}

export const onLoadeddata = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('loadeddata', callback)
  return () => {
    audio?.removeEventListener('loadeddata', callback)
  }
}

export const onLoadstart = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('loadstart', callback)
  return () => {
    audio?.removeEventListener('loadstart', callback)
  }
}

export const onCanplay = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('canplay', callback)
  return () => {
    audio?.removeEventListener('canplay', callback)
  }
}

export const onEmptied = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('emptied', callback)
  return () => {
    audio?.removeEventListener('emptied', callback)
  }
}

export const onTimeupdate = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('timeupdate', callback)
  return () => {
    audio?.removeEventListener('timeupdate', callback)
  }
}

// 缓冲中
export const onWaiting = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('waiting', callback)
  return () => {
    audio?.removeEventListener('waiting', callback)
  }
}

// 可见性改变
export const onVisibilityChange = (callback: Noop) => {
  document.addEventListener('visibilitychange', callback)
  return () => {
    document.removeEventListener('visibilitychange', callback)
  }
}


export const getErrorCode = () => {
  return audio?.error?.code
}

// ===== DJ 节奏音效：WebAudio 合成、点按才触发，串接在主输出增益节点上，
// 不改变音乐自身的处理链路（保留自银河音效扩展） =====

let djNoiseBuffer: AudioBuffer | null = null
const getDjNoise = () => {
  if (djNoiseBuffer) return djNoiseBuffer
  const ctx = getAudioContext()
  const len = Math.floor(ctx.sampleRate * 0.4)
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  djNoiseBuffer = buffer
  return buffer
}

export const playDjEffect = (type: 'clap' | 'twist' | 'jump' | 'shake' | 'leg' | 'knock') => {
  const ctx = getAudioContext()
  const now = ctx.currentTime
  const out = ctx.createGain()
  out.gain.value = 0.9
  out.connect(gainNode)

  const osc = (wave: OscillatorType, freq: number, endFreq: number, dur: number, delay = 0, peak = 0.8) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = wave
    o.frequency.setValueAtTime(freq, now + delay)
    o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + delay + dur)
    g.gain.setValueAtTime(0, now + delay)
    g.gain.linearRampToValueAtTime(peak, now + delay + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur)
    o.connect(g)
    g.connect(out)
    o.start(now + delay)
    o.stop(now + delay + dur + 0.05)
  }
  const noise = (dur: number, delay: number, peak: number, hp: number) => {
    const src = ctx.createBufferSource()
    src.buffer = getDjNoise()
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = hp
    const g = ctx.createGain()
    g.gain.setValueAtTime(peak, now + delay)
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur)
    src.connect(filter)
    filter.connect(g)
    g.connect(out)
    src.start(now + delay)
    src.stop(now + delay + dur + 0.05)
  }

  switch (type) {
    case 'clap': // 拍手：三连噪声脉冲
      noise(0.08, 0, 0.7, 1500)
      noise(0.08, 0.1, 0.6, 1500)
      noise(0.16, 0.2, 0.8, 1200)
      break
    case 'twist': // 扭腰：下扫频
      osc('sawtooth', 900, 120, 0.3, 0, 0.5)
      osc('sawtooth', 900, 120, 0.3, 0.15, 0.4)
      break
    case 'jump': // 蹦跳：上扫频
      osc('square', 200, 900, 0.22, 0, 0.4)
      osc('square', 240, 1100, 0.22, 0.12, 0.35)
      break
    case 'shake': // 摇头：抖动噪声
      for (let i = 0; i < 6; i++) noise(0.05, i * 0.07, 0.4, 4000)
      break
    case 'leg': // 抖腿：快速双低频
      osc('sine', 140, 60, 0.12, 0, 0.9)
      osc('sine', 140, 60, 0.12, 0.16, 0.9)
      osc('sine', 140, 60, 0.12, 0.32, 0.9)
      break
    case 'knock': // 敲桌：木质低频脉冲
      osc('sine', 220, 70, 0.1, 0, 1)
      noise(0.03, 0, 0.3, 800)
      break
  }
}
