/**
 * 银河音效 2.0 —— 「智能音效」的采样会话
 *
 * analysis.ts 提供的是「给定一段数据，算出画像」的纯函数；
 * 本文件负责把 AnalyserNode 的**连续若干帧**汇总成那一段数据。
 *
 * 三个必须守住的细节（都踩过）：
 *  1. **预热帧要丢弃**：AnalyserNode 的 FFT 缓冲区在接入后的头几帧还没被真实音频填满，
 *     直接把这几帧算进去，频谱会明显偏暗。
 *  2. **静音帧不计入**：播放暂停 / 歌曲淡出时的低电平帧没有信息量，
 *     计进去只会把频谱均值往下拉、把 RMS 拉低。
 *  3. **频谱要按帧取均值的「线性幅值」**，而不是对 dB 取平均。
 *     dB 平均在数学上无意义（20·log 是单调但非线性的），会把低声压的 bin 抬高。
 */

import type { AudioProfile } from './analysis'
import {
  analyzeSpectrum,
  dbToMagnitude,
  DB_FLOOR,
  EMPTY_STEREO_SUMS,
  stereoStatsFromSums,
  timeStatsFromSums,
} from './analysis'

/**
 * AnalyserNode 的最小结构化接口 —— 只要求两个 getFloat* 方法与缓冲区尺寸。
 *
 * 只用 `getFloat*` 系列：`getByteFrequencyData` 的结果被 min/maxDecibels 压过，
 * 拿不到真实动态范围，而智能补偿正是要看动态。
 *
 * ⚠️ 参数必须显式写成 `Float32Array<ArrayBuffer>`（与 lib.dom 的签名逐字一致），
 * 不能图省事写裸 `Float32Array`（= `Float32Array<ArrayBufferLike>`）。
 * 原因：本文件用函数属性写法（仓库 ESLint 的 `method-signature-style` 只允许这种），
 * 而函数属性受 `strictFunctionTypes` 的参数**逆变**检查：
 * `ArrayBufferLike` 可能是 SharedArrayBuffer，于是 `AnalyserNode` 赋不进来。
 * 更隐蔽的是这个错误在 `tsc -p tsconfig.json` 下**不出现**，只有 ts-loader 会拦，
 * 所以别把「tsc 通过」当成交付依据。
 */
export interface AnalyserLike {
  readonly fftSize: number
  readonly frequencyBinCount: number
  getFloatTimeDomainData: (array: Float32Array<ArrayBuffer>) => void
  getFloatFrequencyData: (array: Float32Array<ArrayBuffer>) => void
}

export interface SmartAnalyserSet {
  /** 频谱分析（单声道下混，标准做法） */
  spectrum: AnalyserLike
  /** 左声道时域 */
  left: AnalyserLike
  /** 右声道时域 */
  right: AnalyserLike
}

export interface SmartSamplerOptions {
  /** 丢弃的前若干帧（缓冲区预热） */
  warmupFrames?: number
  /** 需要的有效帧数 */
  maxFrames?: number
  /** 低于此 RMS（dBFS）的帧视为静音、不参与统计 */
  silenceRmsDb?: number
}

export interface SmartSamplerState {
  /** 0~1 */
  progress: number
  done: boolean
  /** 已采纳的有效帧数 */
  accepted: number
}

export interface SmartSampler {
  push: () => SmartSamplerState
  /** 结束并产出画像；有效样本不足（一直在静音）时返回 null */
  finish: () => AudioProfile | null
  reset: () => void
}

export const DEFAULT_FRAME_INTERVAL_MS = 60
export const DEFAULT_WARMUP_FRAMES = 5
export const DEFAULT_MAX_FRAMES = 45
export const DEFAULT_SILENCE_RMS_DB = -60

export const createSmartSampler = (
  analysers: SmartAnalyserSet,
  sampleRate: number,
  options: SmartSamplerOptions = {},
): SmartSampler => {
  const warmupFrames = Math.max(0, Math.floor(options.warmupFrames ?? DEFAULT_WARMUP_FRAMES))
  const maxFrames = Math.max(1, Math.floor(options.maxFrames ?? DEFAULT_MAX_FRAMES))
  const silenceRmsDb = options.silenceRmsDb ?? DEFAULT_SILENCE_RMS_DB

  /**
   * 硬上限：静音时不能无限等下去（否则用户点了检测按钮界面就永远转圈）。
   * 留 60% 冗余是为了容忍播放中的短暂安静段 —— 采样窗口内允许有约 1/3 的静音帧，
   * 超过这个比例才判定「没采集到有效音频」。
   */
  const hardCap = Math.max(1, Math.round(warmupFrames + maxFrames * 1.6))

  const bins = analysers.spectrum.frequencyBinCount
  const leftBuffer = new Float32Array(Math.max(1, analysers.left.fftSize))
  const rightBuffer = new Float32Array(Math.max(1, analysers.right.fftSize))
  const spectrumBuffer = new Float32Array(Math.max(1, bins))
  const frameLength = Math.min(leftBuffer.length, rightBuffer.length)

  let spectrumSums = new Float64Array(bins)
  let stereoSums = EMPTY_STEREO_SUMS()
  let framesSeen = 0
  let accepted = 0
  let sumSquares = 0
  let peak = 0
  let sampleCount = 0

  const reset = () => {
    spectrumSums = new Float64Array(bins)
    stereoSums = EMPTY_STEREO_SUMS()
    framesSeen = 0
    accepted = 0
    sumSquares = 0
    peak = 0
    sampleCount = 0
  }

  const push = (): SmartSamplerState => {
    framesSeen++
    // 前 warmupFrames 帧只用来暖机，不采纳
    const isWarmup = framesSeen <= warmupFrames

    analysers.left.getFloatTimeDomainData(leftBuffer)
    analysers.right.getFloatTimeDomainData(rightBuffer)

    // 第一遍：只算本帧的电平，用来判断是否值得采纳
    let frameSumSquares = 0
    let framePeak = 0
    for (let i = 0; i < frameLength; i++) {
      const l = leftBuffer[i]
      const r = rightBuffer[i]
      frameSumSquares += l * l + r * r
      const absL = Math.abs(l)
      const absR = Math.abs(r)
      if (absL > framePeak) framePeak = absL
      if (absR > framePeak) framePeak = absR
    }
    const frameRms = frameLength > 0 ? Math.sqrt(frameSumSquares / (frameLength * 2)) : 0
    const frameRmsDb = frameRms > 1e-12 ? 20 * Math.log10(frameRms) : DB_FLOOR
    const silent = framePeak < 1e-4 || frameRmsDb < silenceRmsDb

    if (!isWarmup && !silent && bins > 0) {
      accepted++
      for (let i = 0; i < frameLength; i++) {
        const l = leftBuffer[i]
        const r = rightBuffer[i]
        const mid = (l + r) / 2
        const side = (l - r) / 2
        stereoSums.sumLR += l * r
        stereoSums.sumLL += l * l
        stereoSums.sumRR += r * r
        stereoSums.sumMid += mid * mid
        stereoSums.sumSide += side * side
      }
      sumSquares += frameSumSquares
      sampleCount += frameLength * 2
      if (framePeak > peak) peak = framePeak

      analysers.spectrum.getFloatFrequencyData(spectrumBuffer)
      for (let i = 0; i < bins; i++) spectrumSums[i] += dbToMagnitude(spectrumBuffer[i])
    }

    return {
      // 主指标是「有效样本进度」；再叠一个只走一半的兜底项，
      // 让长时间静音时的进度条也在缓慢前进，不至于看起来像卡死
      progress: Math.min(1, Math.max(accepted / maxFrames, (framesSeen / hardCap) * 0.5)),
      done: accepted >= maxFrames || framesSeen >= hardCap,
      accepted,
    }
  }

  const finish = (): AudioProfile | null => {
    if (accepted === 0) return null

    const time = timeStatsFromSums(sumSquares, peak, sampleCount)
    // 采样全程都在近乎静音，画像没有意义
    if (time.silent) return null

    // 线性幅值取均值 → 转回 dB，复用 analyzeSpectrum 的「按频段取均值」口径
    const meanDb = new Float32Array(bins)
    for (let i = 0; i < bins; i++) {
      const mean = spectrumSums[i] / accepted
      meanDb[i] = mean > 1e-12 ? 20 * Math.log10(mean) : DB_FLOOR
    }

    return {
      time,
      spectrum: analyzeSpectrum(meanDb, sampleRate),
      stereo: stereoStatsFromSums(stereoSums),
    }
  }

  return { push, finish, reset }
}

// ============================================================
//  驱动：按固定间隔推进采样
// ============================================================

export interface SmartMeasurementOptions extends SmartSamplerOptions {
  intervalMs?: number
  onProgress?: (progress: number) => void
  /** 注入定时器（测试用同步实现即可让整段测量瞬间跑完） */
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}

export interface SmartMeasurement {
  promise: Promise<AudioProfile | null>
  cancel: () => void
}

/**
 * 按 `intervalMs` 采样若干帧后产出画像。
 *
 * 间隔取 60ms：analyser 的时域窗口是 fftSize/sampleRate（2048/48000 ≈ 43ms），
 * 60ms 采样意味着窗口之间只有约 30% 重叠 —— 重叠太多会把同一段音频反复计入，
 * 让「跨帧聚合」退化成「单帧放大」。
 */
export const runSmartMeasurement = (
  analysers: SmartAnalyserSet,
  sampleRate: number,
  options: SmartMeasurementOptions = {},
): SmartMeasurement => {
  const intervalMs = Math.max(10, options.intervalMs ?? DEFAULT_FRAME_INTERVAL_MS)
  const sampler = createSmartSampler(analysers, sampleRate, options)
  const setTimer = options.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms) as unknown)
  const clearTimer = options.clearTimer ?? ((handle: unknown) => {
    clearTimeout(handle as ReturnType<typeof setTimeout>)
  })

  let cancelled = false
  let timer: unknown = null
  let settle: (profile: AudioProfile | null) => void = () => undefined

  const promise = new Promise<AudioProfile | null>((resolve) => {
    settle = resolve
  })

  const tick = () => {
    if (cancelled) return
    const state = sampler.push()
    options.onProgress?.(state.progress)
    if (state.done) {
      settle(sampler.finish())
      return
    }
    timer = setTimer(tick, intervalMs)
  }

  timer = setTimer(tick, intervalMs)

  return {
    promise,
    cancel: () => {
      if (cancelled) return
      cancelled = true
      clearTimer(timer)
      settle(null)
    },
  }
}
