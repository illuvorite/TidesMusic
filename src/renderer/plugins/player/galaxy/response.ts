/**
 * 银河音效 2.0 —— 频响曲线计算（RBJ Audio EQ Cookbook）
 *
 * 参考实现：`audiojs/filter` 的 `@audio/biquad` 内核（`magnitude(c, f, fs)` 计算 |H(f)|）
 * 与 `audiojs/eq` 的 `eqResponse`。此处按 RBJ Audio EQ Cookbook 自行实现，
 * 不引入依赖 —— 只需要 10 段的合并幅频响应，不需要完整的滤波器内核。
 *
 * 用途：
 *   1. 「均衡器」页画 EQ 曲线（10 段叠加后的实际响应，而不是把滑杆值连成折线）
 *   2. 校验预设曲线的实际听感形状（例：确认低频段是否有过度重叠堆积）
 *
 * 与 Web Audio 的一致性（重要）：
 *   `BiquadFilterNode` 的 lowshelf / highshelf 按 RBJ 公式实现，**S 固定为 1、忽略 Q**；
 *   peaking 使用传入的 Q。本文件严格对齐这一行为，否则算出来的曲线会和实际听感对不上。
 *   参考：Web Audio API 规范 BiquadFilterNode 一节。
 */

import type { EQBand } from './types'

/** RBJ 双二阶系数（已按 a0 归一化） */
export interface BiquadCoefficients {
  b0: number
  b1: number
  b2: number
  a1: number
  a2: number
}

/** 采样率缺省值；调用方应显式传入真实采样率 */
const DEFAULT_SAMPLE_RATE = 44100

const TWO_PI = Math.PI * 2

/** 把「Q」换算成 RBJ 的 alpha（peaking / bandpass 系列） */
const alphaFromQ = (w0: number, q: number): number =>
  Math.sin(w0) / (2 * Math.max(1e-6, q))

/**
 * shelf 滤波器专用的 alpha。
 * RBJ 公式中 alpha = sin(w0)/2 * sqrt((A + 1/A) * (1/S - 1) + 2)。
 * Web Audio 的 shelf 固定 S = 1（且忽略节点的 Q），此时 (1/S - 1) = 0，
 * 化简为 alpha = sin(w0)/2 * sqrt(2)。
 */
const shelfAlpha = (w0: number): number => (Math.sin(w0) / 2) * Math.SQRT2

/** 由频点/增益构造 w0 与 A 的公共部分 */
const common = (frequency: number, gain: number, sampleRate: number) => {
  const w0 = (TWO_PI * frequency) / sampleRate
  // A = 10^(gain/40)：注意是 40 而非 20，因为幅度是增益的平方根
  const A = Math.pow(10, gain / 40)
  return { w0, A, cosw0: Math.cos(w0), sinw0: Math.sin(w0) }
}

/** peaking（参数均衡）：在 fc 处增益恰为 gain dB，两端回到 0 dB */
export const peakingCoefficients = (
  frequency: number,
  gain: number,
  q: number,
  sampleRate = DEFAULT_SAMPLE_RATE,
): BiquadCoefficients => {
  const { w0, A, cosw0 } = common(frequency, gain, sampleRate)
  const alpha = alphaFromQ(w0, q)
  const a0 = 1 + alpha / A
  return {
    b0: (1 + alpha * A) / a0,
    b1: (-2 * cosw0) / a0,
    b2: (1 - alpha * A) / a0,
    a1: (-2 * cosw0) / a0,
    a2: (1 - alpha / A) / a0,
  }
}

/** lowshelf：低频段抬起/下压，高频段回到 0 dB */
export const lowshelfCoefficients = (
  frequency: number,
  gain: number,
  sampleRate = DEFAULT_SAMPLE_RATE,
): BiquadCoefficients => {
  const { w0, A, cosw0 } = common(frequency, gain, sampleRate)
  const alpha = shelfAlpha(w0)
  const sqrtA2alpha = 2 * Math.sqrt(A) * alpha
  const a0 = (A + 1) + (A - 1) * cosw0 + sqrtA2alpha
  return {
    b0: (A * ((A + 1) - (A - 1) * cosw0 + sqrtA2alpha)) / a0,
    b1: (2 * A * ((A - 1) - (A + 1) * cosw0)) / a0,
    b2: (A * ((A + 1) - (A - 1) * cosw0 - sqrtA2alpha)) / a0,
    a1: (-2 * ((A - 1) + (A + 1) * cosw0)) / a0,
    a2: ((A + 1) + (A - 1) * cosw0 - sqrtA2alpha) / a0,
  }
}

/** highshelf：高频段抬起/下压，低频段回到 0 dB */
export const highshelfCoefficients = (
  frequency: number,
  gain: number,
  sampleRate = DEFAULT_SAMPLE_RATE,
): BiquadCoefficients => {
  const { w0, A, cosw0 } = common(frequency, gain, sampleRate)
  const alpha = shelfAlpha(w0)
  const sqrtA2alpha = 2 * Math.sqrt(A) * alpha
  const a0 = (A + 1) - (A - 1) * cosw0 + sqrtA2alpha
  return {
    b0: (A * ((A + 1) + (A - 1) * cosw0 + sqrtA2alpha)) / a0,
    b1: (-2 * A * ((A - 1) + (A + 1) * cosw0)) / a0,
    b2: (A * ((A + 1) + (A - 1) * cosw0 - sqrtA2alpha)) / a0,
    a1: (2 * ((A - 1) - (A + 1) * cosw0)) / a0,
    a2: ((A + 1) - (A - 1) * cosw0 - sqrtA2alpha) / a0,
  }
}

/** 按段类型分派到对应的系数公式 */
export const bandCoefficients = (
  band: Pick<EQBand, 'type' | 'frequency' | 'gain' | 'q'>,
  sampleRate = DEFAULT_SAMPLE_RATE,
): BiquadCoefficients => {
  switch (band.type) {
    case 'lowshelf':
      return lowshelfCoefficients(band.frequency, band.gain, sampleRate)
    case 'highshelf':
      return highshelfCoefficients(band.frequency, band.gain, sampleRate)
    default:
      return peakingCoefficients(band.frequency, band.gain, band.q, sampleRate)
  }
}

/**
 * 单个双二阶在指定频率上的幅值（dB）。
 *
 *   H(z) = (b0 + b1·z⁻¹ + b2·z⁻²) / (1 + a1·z⁻¹ + a2·z⁻²)，z = e^{jω}
 * 用欧拉展开成实部/虚部后取模：|H| = sqrt(Re² + Im²)
 */
export const magnitudeDb = (
  coefficients: BiquadCoefficients,
  frequency: number,
  sampleRate = DEFAULT_SAMPLE_RATE,
): number => {
  const { b0, b1, b2, a1, a2 } = coefficients
  const w = (TWO_PI * frequency) / sampleRate
  const cos1 = Math.cos(w)
  const sin1 = Math.sin(w)
  const cos2 = Math.cos(2 * w)
  const sin2 = Math.sin(2 * w)

  const numRe = b0 + b1 * cos1 + b2 * cos2
  const numIm = -(b1 * sin1 + b2 * sin2)
  const denRe = 1 + a1 * cos1 + a2 * cos2
  const denIm = -(a1 * sin1 + a2 * sin2)

  const numSq = numRe * numRe + numIm * numIm
  const denSq = denRe * denRe + denIm * denIm
  if (denSq <= 0) return 0

  const magnitude = Math.sqrt(numSq / denSq)
  // 幅度 → dB；magnitude 为 0 时返回极小的下限，避免 -Infinity 传到 UI
  return magnitude > 0 ? 20 * Math.log10(magnitude) : -120
}

/**
 * 十段 EQ 在指定频率上的**合成**响应（dB）。
 * 各段是串联的，因此幅度相乘 = dB 相加。
 */
export const eqMagnitudeDb = (
  bands: ReadonlyArray<Pick<EQBand, 'type' | 'frequency' | 'gain' | 'q'>>,
  frequency: number,
  sampleRate = DEFAULT_SAMPLE_RATE,
): number => bands.reduce(
  (sum, band) => sum + magnitudeDb(bandCoefficients(band, sampleRate), frequency, sampleRate),
  0,
)

/** 曲线采样点 */
export interface ResponsePoint {
  frequency: number
  gain: number
}

export interface ResponseCurveOptions {
  /** 采样点数（含首尾），默认 256 */
  points?: number
  sampleRate?: number
  /** 起始频率，默认 20Hz */
  minFrequency?: number
  /** 结束频率，默认音源奈奎斯特频率（不超过 20kHz） */
  maxFrequency?: number
}

/**
 * 生成用于绘图的**对数等距**频响曲线。
 * 对数等距是关键：线性等距会把 20Hz~200Hz 整段压成一个像素点。
 */
export const eqResponseCurve = (
  bands: ReadonlyArray<Pick<EQBand, 'type' | 'frequency' | 'gain' | 'q'>>,
  options: ResponseCurveOptions = {},
): ResponsePoint[] => {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE
  const points = Math.max(2, Math.floor(options.points ?? 256))
  const minFrequency = options.minFrequency ?? 20
  const nyquist = sampleRate / 2
  const maxFrequency = Math.min(options.maxFrequency ?? 20000, nyquist * 0.999)

  const logMin = Math.log10(minFrequency)
  const logMax = Math.log10(maxFrequency)
  const curve: ResponsePoint[] = []

  for (let i = 0; i < points; i++) {
    const t = i / (points - 1)
    const frequency = Math.pow(10, logMin + (logMax - logMin) * t)
    curve.push({ frequency, gain: eqMagnitudeDb(bands, frequency, sampleRate) })
  }
  return curve
}

/** 曲线上的最大增益（dB），用于判断需要预留多少余量（headroom） */
export const curvePeakDb = (curve: readonly ResponsePoint[]): number =>
  curve.reduce((max, point) => (point.gain > max ? point.gain : max), -Infinity)
