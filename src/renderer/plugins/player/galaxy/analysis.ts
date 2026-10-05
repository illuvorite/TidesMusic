/**
 * 银河音效 2.0 —— 音频分析（「智能音效」的测量层）
 *
 * 设计稿第十三节把「智能音效」描述为：分析 RMS / LUFS / 频谱 / 低频能量 /
 * 人声区域 / Crest Factor / Stereo Correlation，再反推 DSP 参数。
 *
 * 本文件实现其中**可在纯函数层面完成**的部分，与 Web Audio 完全解耦
 * （只吃 TypedArray），因此可以脱离音频上下文做确定性测试。
 *
 * 起音检测的算法骨架参考 `yin-yizhen/sonic-topography` 的 `beatDetector.ts`：
 * 谱通量 + **自适应阈值**（均值 + k·标准差，而不是固定阈值），
 * 并补上其缺失的按 bin 数归一化（否则阈值会随 fftSize 漂移）。
 *
 * 尚未实现（需要音频线程或更重的分析）：
 *   · LUFS      需 ITU-R BS.1770 的 K 加权滤波 + 门限积分
 *   · 人声区域   需基频/共振峰跟踪，或 ML 模型
 *   · 真峰值     需过采样
 */

// ============================================================
//  输入类型
// ============================================================

/**
 * 频谱输入，两种来源都支持：
 *   · `Uint8Array`   ← `AnalyserNode.getByteFrequencyData()`，按 0~255 归一化
 *   · `Float32Array` ← `AnalyserNode.getFloatFrequencyData()`，单位 dB，转线性幅值
 */
export type SpectrumInput = Uint8Array | Float32Array

/** 静音/极低电平的 dB 下限，避免 -Infinity 流到 UI */
export const DB_FLOOR = -120

/**
 * dB 输入的「视为 0」下限。
 *
 * `AnalyserNode.getFloatFrequencyData()` 返回的 dB 会被 `minDecibels`（默认 −100）
 * 截断，也就是**每个 bin 都有一个 −100dB 的噪声底而不是真正的 0**。
 * 几百个 bin 的底噪累加起来足以把频谱质心拉偏（实测 1031Hz → 1050Hz）。
 * 低于可闻下限的一律按 0 处理，字节输入则天然没有这个问题。
 */
export const MAGNITUDE_FLOOR_DB = -90

const toDb = (amplitude: number): number =>
  amplitude > 1e-12 ? 20 * Math.log10(amplitude) : DB_FLOOR

/** dB → 线性幅值。低于可闻下限的一律按 0（原因见 MAGNITUDE_FLOOR_DB） */
export const dbToMagnitude = (db: number): number =>
  Number.isFinite(db) && db > MAGNITUDE_FLOOR_DB ? Math.pow(10, db / 20) : 0

/** 读取第 i 个 bin 的**线性幅值** */
const readMagnitude = (data: SpectrumInput, index: number, isByte: boolean): number =>
  isByte
    ? (data as Uint8Array)[index] / 255
    : dbToMagnitude((data as Float32Array)[index])

/** AnalyserNode 的 bin 频率：第 i 个 bin 中心位于 i · sampleRate / (2 · bins) */
export const binFrequency = (index: number, bins: number, sampleRate: number): number =>
  bins > 0 ? (index * sampleRate) / (2 * bins) : 0

// ============================================================
//  时域
// ============================================================

export interface TimeDomainStats {
  /** 均方根，dBFS */
  rmsDb: number
  /** 采样峰值，dBFS */
  peakDb: number
  /**
   * 波峰因数 = 峰值 − 均方根，dB。
   * 纯正弦 ≈ 3.01、方波 ≈ 0、明显过压缩的流行乐 < 6、动态好的古典 > 18。
   */
  crestDb: number
  /** 近似静音 */
  silent: boolean
}

/**
 * 由**累加量**构造时域统计。
 *
 * 单帧分析（analyzeTimeDomain）与跨帧聚合（measure.ts 的采样会话）共用这一套公式，
 * 避免「单帧测出的波峰因数」和「整段测出的波峰因数」用了两份不同定义。
 *
 * 注意波峰因数按整体定义：**全程峰值 ÷ 全程均方根**（而不是逐帧算完再平均），
 * 后者会系统性地低估动态范围。
 */
export const timeStatsFromSums = (sumSquares: number, peak: number, sampleCount: number): TimeDomainStats => {
  const rms = sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0
  const rmsDb = toDb(rms)
  const peakDb = toDb(peak)
  const silent = peak < 1e-4
  return {
    rmsDb,
    peakDb,
    // 静音时 crest 无意义，返回 0 而不是 -120 这种会污染平均值的数
    crestDb: silent ? 0 : peakDb - rmsDb,
    silent,
  }
}

export const analyzeTimeDomain = (data: Float32Array): TimeDomainStats => {
  let sumSquares = 0
  let peak = 0
  for (let i = 0; i < data.length; i++) {
    const value = data[i]
    sumSquares += value * value
    const abs = Math.abs(value)
    if (abs > peak) peak = abs
  }
  return timeStatsFromSums(sumSquares, peak, data.length)
}

/**
 * 频谱质心 / 滚降点用的对数频段密度上限（每倍频程多少个段）。
 *
 * FFT 的 bin 在频率上**线性等距**，所以高频的 bin 数天然远多于低频：
 * 2048 点 / 48kHz 下，20~250Hz 只有 10 个 bin，4k~20kHz 有 682 个。
 * 若直接按 bin 求和算质心，一段完全平坦的频谱会被算成 10kHz，
 * 对「中频饱满、高频稀疏」的素材会误判成「偏亮」——
 * 因为判断的其实是 bin 的条数，不是能量分布。
 *
 * 修正办法：每个 bin 的权重 = 幅值 ÷ 它所在对数频段内的 bin 数，
 * 使每个对数频段贡献的总权重恰好等于该段的平均幅值（等价于在 log f 轴上积分）。
 *
 * ⚠️ 但频段宽度**必须与 FFT 分辨率匹配**：若频段比 bin 间距还窄，
 * 低频段会是空的、被整体跳过，质心又被推高。实测 1/6 倍频程时
 * 平坦谱质心会随 fftSize 从 3335Hz(2048 点) 漂到 5669Hz(128 点)。
 * 因此实际用的密度由 `resolveBandsPerOctave` 按 bin 间距自适应下压，
 * 保证最低频段至少装得下 1 个 bin。2048 点 / 48kHz 下会收敛到 **1 倍频程**。
 */
export const MAX_LOG_BANDS_PER_OCTAVE = 6

/** 对数频段槽位数上限（20Hz~20kHz、1 倍频程共 10 段，留足余量） */
const LOG_BAND_SLOTS = 128

/**
 * 按 FFT 分辨率选定每倍频程的频段数。
 * 条件：最低频段 `[fMin, fMin·(r−1))` 至少要容得下 1 个 bin，
 * 即 `fMin·(r−1) ≥ binHz` ⇒ `1/log2(1 + binHz/fMin)` 个段每倍频程。
 */
export const resolveBandsPerOctave = (bins: number, sampleRate: number, fMin: number): number => {
  const binHz = bins > 0 ? sampleRate / 2 / bins : 0
  if (binHz <= 0 || fMin <= 0) return MAX_LOG_BANDS_PER_OCTAVE
  const fit = 1 / Math.log2(1 + binHz / fMin)
  return Math.max(1, Math.min(MAX_LOG_BANDS_PER_OCTAVE, Math.floor(fit)))
}

// ============================================================
//  频域
// ============================================================

/** 低频 / 中频分界与中频 / 高频分界（Hz） */
export const LOW_MID_CROSSOVER = 250
export const MID_HIGH_CROSSOVER = 4000

export interface SpectrumStats {
  /**
   * < 250Hz 频段**平均幅值**占比 0~1。
   *
   * ⚠️ 这里是「按频段取均值」而不是「求和」。FFT 的 bin 在频率上是线性等距的，
   * 20~250Hz 在 256 bin / 48kHz 下只占 2 个 bin，而 4k~20kHz 占 171 个；
   * 直接求和会让高频因为 bin 数多而虚高（一段完全平坦的频谱会算出 lowRatio ≈ 0.9%，
   * 从而误判成「低频严重不足」）。取均值即消除这个 bin 数偏差。
   */
  lowRatio: number
  /** 250Hz ~ 4kHz 频段平均幅值占比 0~1 */
  midRatio: number
  /** > 4kHz 频段平均幅值占比 0~1 */
  highRatio: number
  /** 频谱质心，Hz（能量加权平均频率，「亮度」的一阶矩；按对数频段归一化，与 fftSize 无关） */
  centroid: number
  /** 85% 累计能量滚降点，Hz（同样按对数频段归一化） */
  rolloff: number
}

const EMPTY_SPECTRUM: SpectrumStats = {
  lowRatio: 0, midRatio: 0, highRatio: 0, centroid: 0, rolloff: 0,
}

export const analyzeSpectrum = (
  data: SpectrumInput,
  sampleRate = 44100,
  fMin = 20,
  fMax = 20000,
): SpectrumStats => {
  const bins = data.length
  if (bins === 0) return { ...EMPTY_SPECTRUM }

  const isByte = data instanceof Uint8Array
  const nyquist = sampleRate / 2
  const bandsPerOctave = resolveBandsPerOctave(bins, sampleRate, fMin)

  let lowSum = 0
  let lowCount = 0
  let midSum = 0
  let midCount = 0
  let highSum = 0
  let highCount = 0
  const bandSum = new Float64Array(LOG_BAND_SLOTS)
  const bandCount = new Int32Array(LOG_BAND_SLOTS)

  // 第一遍：分段均值 + 累积各对数频段的幅值
  for (let i = 0; i < bins; i++) {
    const frequency = (i * nyquist) / bins
    if (frequency < fMin || frequency > fMax) continue
    const magnitude = readMagnitude(data, i, isByte)
    if (frequency < LOW_MID_CROSSOVER) {
      lowSum += magnitude
      lowCount++
    } else if (frequency <= MID_HIGH_CROSSOVER) {
      midSum += magnitude
      midCount++
    } else {
      highSum += magnitude
      highCount++
    }
    const band = Math.floor(Math.log2(frequency / fMin) * bandsPerOctave)
    if (band >= 0 && band < LOG_BAND_SLOTS) {
      bandSum[band] += magnitude
      bandCount[band]++
    }
  }

  const meanLow = lowCount > 0 ? lowSum / lowCount : 0
  const meanMid = midCount > 0 ? midSum / midCount : 0
  const meanHigh = highCount > 0 ? highSum / highCount : 0
  const bandTotal = meanLow + meanMid + meanHigh

  /**
   * 一个对数频段在 log f 轴上的「代表频率」。
   *
   * 不能用该段内 bin 频率的**算术**均值：bin 在频率上线性等距，
   * 段内高频侧的 bin 更多，算术均值会系统性偏高（实测 +5%）。
   * 正确值是 f 在 [fLo, fHi] 上对 log f 的均值：(fHi − fLo) / ln(fHi / fLo)。
   */
  const bandPosition = (band: number): number => {
    const fLo = fMin * Math.pow(2, band / bandsPerOctave)
    const fHi = Math.min(fMax, fMin * Math.pow(2, (band + 1) / bandsPerOctave))
    if (!(fHi > fLo)) return fLo
    return (fHi - fLo) / Math.log(fHi / fLo)
  }

  const bandWeight = (band: number): number =>
    bandCount[band] > 0 ? bandSum[band] / bandCount[band] : 0

  // 第二遍：按对数频段求质心与滚降点（权重口径一致，在 log f 轴上积分）
  let weightTotal = 0
  let weighted = 0
  for (let band = 0; band < LOG_BAND_SLOTS; band++) {
    const weight = bandWeight(band)
    if (weight <= 0) continue
    weightTotal += weight
    weighted += weight * bandPosition(band)
  }

  if (weightTotal <= 1e-12 && bandTotal <= 1e-12) return { ...EMPTY_SPECTRUM }

  // 85% 累计权重滚降点（从低频往高频扫；报告该频段的上边界）
  let rolloff = fMax
  if (weightTotal > 1e-12) {
    const target = weightTotal * 0.85
    let accumulated = 0
    for (let band = 0; band < LOG_BAND_SLOTS; band++) {
      const weight = bandWeight(band)
      if (weight <= 0) continue
      accumulated += weight
      if (accumulated >= target) {
        rolloff = Math.min(fMax, fMin * Math.pow(2, (band + 1) / bandsPerOctave))
        break
      }
    }
  }

  return {
    lowRatio: bandTotal > 0 ? meanLow / bandTotal : 0,
    midRatio: bandTotal > 0 ? meanMid / bandTotal : 0,
    highRatio: bandTotal > 0 ? meanHigh / bandTotal : 0,
    centroid: weightTotal > 0 ? weighted / weightTotal : 0,
    rolloff,
  }
}

// ============================================================
//  立体声
// ============================================================

export interface StereoStats {
  /** 相关系数 −1~1：1 = 完全同相（等价单声道），0 = 无关，−1 = 反相 */
  correlation: number
  /** 侧声道能量占比 0~1，越大表示声场越"宽"（也可能是相位风险） */
  sideRatio: number
}

/** 立体声相关度所需的累加量（跨帧直接相加即可，比值与帧数无关） */
export interface StereoSums {
  sumLR: number
  sumLL: number
  sumRR: number
  sumMid: number
  sumSide: number
}

export const EMPTY_STEREO_SUMS = (): StereoSums => ({
  sumLR: 0, sumLL: 0, sumRR: 0, sumMid: 0, sumSide: 0,
})

/** 由累加量构造立体声统计 —— 单帧与跨帧聚合共用 */
export const stereoStatsFromSums = (sums: StereoSums): StereoStats => {
  const denominator = Math.sqrt(sums.sumLL * sums.sumRR)
  const stereoEnergy = sums.sumMid + sums.sumSide
  return {
    // 分母过小时（几乎静音）相关系数没有意义，返回 0 而不是 NaN
    correlation: denominator > 1e-12 ? sums.sumLR / denominator : 0,
    sideRatio: stereoEnergy > 1e-12 ? sums.sumSide / stereoEnergy : 0,
  }
}

export const analyzeStereo = (left: Float32Array, right: Float32Array): StereoStats => {
  const n = Math.min(left.length, right.length)
  if (n === 0) return { correlation: 0, sideRatio: 0 }

  const sums = EMPTY_STEREO_SUMS()
  for (let i = 0; i < n; i++) {
    const l = left[i]
    const r = right[i]
    sums.sumLR += l * r
    sums.sumLL += l * l
    sums.sumRR += r * r
    const mid = (l + r) / 2
    const side = (l - r) / 2
    sums.sumMid += mid * mid
    sums.sumSide += side * side
  }

  return stereoStatsFromSums(sums)
}

// ============================================================
//  起音检测（谱通量 + 自适应阈值）
// ============================================================

export interface OnsetDetectorOptions {
  /** 通量历史长度（帧）。90 帧 ≈ 1.5s @60fps */
  historySize?: number
  /** 阈值 = 均值 + k · 标准差。越大越保守 */
  thresholdStdDevGain?: number
  /** 阈值下限：静音段避免乱触发 */
  thresholdFloor?: number
  /** 最小触发通量 */
  minTriggerFlux?: number
  /** 两次触发的最小间隔（秒） */
  cooldownSeconds?: number
  /** 通量一阶平滑系数 0~1 */
  smoothing?: number
}

export interface OnsetResult {
  /** 本帧是否检测到起音 */
  onset: boolean
  /** 平滑后的谱通量 */
  flux: number
  /** 当前自适应阈值 */
  threshold: number
  /** 通量历史的均值 */
  meanFlux: number
  /** 触发置信度 0~1 */
  confidence: number
}

export interface OnsetDetector {
  push: (spectrum: SpectrumInput, deltaSeconds: number) => OnsetResult
  reset: () => void
}

const DEFAULT_ONSET_OPTIONS: Required<OnsetDetectorOptions> = {
  historySize: 90,
  thresholdStdDevGain: 1.8,
  thresholdFloor: 0.028,
  minTriggerFlux: 0.045,
  cooldownSeconds: 0.12,
  smoothing: 0.35,
}

export const createOnsetDetector = (options: OnsetDetectorOptions = {}): OnsetDetector => {
  const historySize = Math.max(8, Math.floor(options.historySize ?? DEFAULT_ONSET_OPTIONS.historySize))
  const stdDevGain = options.thresholdStdDevGain ?? DEFAULT_ONSET_OPTIONS.thresholdStdDevGain
  const floor = options.thresholdFloor ?? DEFAULT_ONSET_OPTIONS.thresholdFloor
  const minTriggerFlux = options.minTriggerFlux ?? DEFAULT_ONSET_OPTIONS.minTriggerFlux
  const cooldownSeconds = options.cooldownSeconds ?? DEFAULT_ONSET_OPTIONS.cooldownSeconds
  const smoothing = Math.min(1, Math.max(0.01, options.smoothing ?? DEFAULT_ONSET_OPTIONS.smoothing))

  let previousSpectrum: Float64Array | null = null
  let history = new Float64Array(historySize)
  let historyIndex = 0
  let historyFilled = 0
  let smoothedFlux = 0
  let previousSmoothedFlux = 0
  let cooldownRemaining = 0

  const reset = () => {
    previousSpectrum = null
    history = new Float64Array(historySize)
    historyIndex = 0
    historyFilled = 0
    smoothedFlux = 0
    previousSmoothedFlux = 0
    cooldownRemaining = 0
  }

  const push = (spectrum: SpectrumInput, deltaSeconds: number): OnsetResult => {
    const bins = spectrum.length
    const delta = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0)
    if (bins === 0) {
      return { onset: false, flux: 0, threshold: floor, meanFlux: 0, confidence: 0 }
    }

    const isByte = spectrum instanceof Uint8Array
    if (previousSpectrum === null || previousSpectrum.length !== bins) {
      previousSpectrum = new Float64Array(bins)
      for (let i = 0; i < bins; i++) previousSpectrum[i] = readMagnitude(spectrum, i, isByte)
      return { onset: false, flux: 0, threshold: floor, meanFlux: 0, confidence: 0 }
    }

    // 正向谱通量，按 bin 数归一化 —— 否则换 fftSize 就会让阈值失效
    let flux = 0
    for (let i = 0; i < bins; i++) {
      const magnitude = readMagnitude(spectrum, i, isByte)
      const magnitudeDelta = magnitude - previousSpectrum[i]
      if (magnitudeDelta > 0) flux += magnitudeDelta
      previousSpectrum[i] = magnitude
    }
    flux /= bins

    smoothedFlux += (flux - smoothedFlux) * smoothing

    // 自适应阈值：历史均值 + k·标准差
    let mean = 0
    const count = Math.max(1, historyFilled)
    for (let i = 0; i < count; i++) mean += history[i]
    mean /= count
    let variance = 0
    for (let i = 0; i < count; i++) variance += (history[i] - mean) ** 2
    variance /= count
    const threshold = Math.max(floor, mean + Math.sqrt(variance) * stdDevGain)

    cooldownRemaining = Math.max(0, cooldownRemaining - delta)
    // 峰值拾取：上一帧超过阈值、且已经开始回落、且高于最小通量
    const isPeak = previousSmoothedFlux > threshold &&
      previousSmoothedFlux >= smoothedFlux &&
      previousSmoothedFlux >= minTriggerFlux
    const onset = cooldownRemaining <= 0 && isPeak
    const displayedFlux = onset ? previousSmoothedFlux : smoothedFlux

    history[historyIndex] = smoothedFlux
    historyIndex = (historyIndex + 1) % historySize
    if (historyFilled < historySize) historyFilled++

    previousSmoothedFlux = smoothedFlux
    if (onset) cooldownRemaining = cooldownSeconds

    return {
      onset,
      flux: displayedFlux,
      threshold,
      meanFlux: mean,
      confidence: Math.min(1, displayedFlux / Math.max(1e-6, threshold * 2.2)),
    }
  }

  return { push, reset }
}

// ============================================================
//  综合画像
// ============================================================

export interface AudioProfile {
  time: TimeDomainStats
  spectrum: SpectrumStats
  stereo: StereoStats
}

export interface AnalyzeOptions {
  sampleRate?: number
  /** 时域数据（getFloatTimeDomainData） */
  timeDomain?: Float32Array
  /** 频谱数据（getByteFrequencyData / getFloatFrequencyData） */
  spectrum?: SpectrumInput
  /** 左右声道时域数据，用于相关度分析 */
  left?: Float32Array
  right?: Float32Array
}

const EMPTY_TIME: TimeDomainStats = { rmsDb: DB_FLOOR, peakDb: DB_FLOOR, crestDb: 0, silent: true }
const EMPTY_STEREO: StereoStats = { correlation: 0, sideRatio: 0 }

export const analyzeProfile = (options: AnalyzeOptions): AudioProfile => ({
  time: options.timeDomain ? analyzeTimeDomain(options.timeDomain) : { ...EMPTY_TIME },
  spectrum: options.spectrum
    ? analyzeSpectrum(options.spectrum, options.sampleRate ?? 44100)
    : { ...EMPTY_SPECTRUM },
  stereo: options.left && options.right
    ? analyzeStereo(options.left, options.right)
    : { ...EMPTY_STEREO },
})

// ============================================================
//  「智能音效」：画像 → 参数建议
// ============================================================

export interface SmartSuggestion {
  /** 建议叠加到 10 段上的增量（dB），顺序 31/62/125/250/500/1k/2k/4k/8k/16k */
  eqDelta: number[]
  /** 低音增益增量（dB） */
  bassGainDeltaDb: number
  /** 压缩阈值增量（dB，负值为压得更狠） */
  compressorThresholdDeltaDb: number
  /** 立体声宽度增量（倍数） */
  stereoWidthDelta: number
  /** 触发原因，供 UI 展示 —— 不可解释的"智能"没人敢用 */
  reasons: string[]
}

const EQ_BAND_COUNT = 10
const EQ_BAND_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

const indexOfFrequency = (frequency: number): number =>
  EQ_BAND_FREQUENCIES.indexOf(frequency)

/**
 * 依据画像给出参数建议。返回的是**增量**而非绝对值，
 * 调用方可以在用户当前设置上叠加，也可以选择忽略。
 *
 * 阈值都是经验值，且刻意取保守值：宁可少调，也不要让"智能"把声音改坏。
 */
/**
 * 「智能音效」的全部判据阈值 —— **唯一来源**。
 *
 * ⚠️ 这些是**经验初值，没有用真实曲库校准过**。
 * 之所以集中在这里而不是散落在判断语句里，是为了让校准时只改一处，
 * 也为了让「到底按什么标准判断」这件事可以被 review。
 *
 * 为什么不做「自动校准」：把阈值校准到「用户曲库的分布」会让判据失去意义 ——
 * 如果整个曲库都低频偏少，那么「低频不足」永远检测不出来。
 * 这些阈值描述的是**混音本身是否失衡**，必须以通用的平坦基线为参照，
 * 而不是相对于用户听的东西。
 *
 * 参考口径：
 *   · 三个频段占比是**按对数频段取均值**后的归一化结果，完全平坦时各 ≈ 0.333
 *   · 质心同样是 LOG_BANDS 归一化口径，完全平坦时 ≈ 2890Hz（见 centroid 相关注释）
 */
export const SMART_THRESHOLDS = {
  /** 低频（< 250Hz）占比低于此值判为「低频不足」；平坦基线为 0.333 */
  lowDeficient: 0.30,
  /** 低频占比高于此值判为「低频偏多」 */
  lowExcess: 0.65,
  /** 高频（> 4kHz）占比低于此值判为「空气感不足」 */
  highDeficient: 0.06,
  /** 高频占比高于此值判为「偏亮易发刺」 */
  highExcess: 0.22,
  /** 质心低于此值判为「音色偏闷」，高于 highCentroid 判为「偏亮」；中间为死区 */
  lowCentroid: 900,
  highCentroid: 3200,
  /** 波峰因数高于此值判为「动态偏大」 */
  crestHigh: 18,
  /** 波峰因数低于此值判为「已被压得很紧」 */
  crestLow: 6,
  /** 侧声道占比高于此值：低频相位有风险 */
  sideRatioHigh: 0.5,
  /** 相关度低于此值：声场已很宽或存在相位问题 */
  correlationLow: 0.2,
  /** 相关度高于此值且侧声道占比低于 sideRatioLow：声场偏窄 */
  correlationHigh: 0.85,
  sideRatioLow: 0.15,
  /** 各类修正的幅度（dB / 宽度倍数） */
  gain: {
    /** 低频不足时 62Hz / 125Hz 的补偿量 */
    lowBoost: 1.5,
    lowBoostMinor: 1.0,
    /** 低频偏多时 62Hz / 125Hz 的收敛量 */
    lowCut: -1.5,
    lowCutMinor: -1.0,
    /** 空气感（8k / 16kHz）的提 / 收量 */
    airBoost: 1.0,
    airCut: -1.2,
    /** 存在感（2k / 4kHz）的提 / 收量 */
    presenceBoost: 0.8,
    presenceCut: -0.8,
    /** 侧声道过强时 62Hz 的收敛量 */
    sideBassCut: -1.0,
  },
  /** 压缩阈值修正量（dB）与立体声宽度修正量 */
  compressorHighDynamicDeltaDb: -4,
  compressorLowDynamicDeltaDb: 3,
  widthNarrowDelta: 0.12,
  widthWideDelta: -0.15,
} as const

export const suggestFromProfile = (profile: AudioProfile): SmartSuggestion => {
  const eqDelta = new Array<number>(EQ_BAND_COUNT).fill(0)
  const reasons: string[] = []
  let bassGainDeltaDb = 0
  let compressorThresholdDeltaDb = 0
  let stereoWidthDelta = 0
  const T = SMART_THRESHOLDS

  const add = (frequency: number, gain: number) => {
    const index = indexOfFrequency(frequency)
    if (index >= 0) eqDelta[index] += gain
  }

  if (profile.time.silent) {
    return {
      eqDelta,
      bassGainDeltaDb: 0,
      compressorThresholdDeltaDb: 0,
      stereoWidthDelta: 0,
      reasons: ['当前接近静音，不做任何调整'],
    }
  }

  // ── 低频不足 ──（设计稿示例：62Hz +1.5dB、125Hz +1dB）
  if (profile.spectrum.lowRatio > 0 && profile.spectrum.lowRatio < T.lowDeficient) {
    add(62, T.gain.lowBoost)
    add(125, T.gain.lowBoostMinor)
    reasons.push(`低频段能量占比 ${(profile.spectrum.lowRatio * 100).toFixed(0)}%（平坦基线 33%），偏低 → 62/125Hz 小幅补偿`)
  } else if (profile.spectrum.lowRatio > T.lowExcess) {
    add(62, T.gain.lowCut)
    add(125, T.gain.lowCutMinor)
    reasons.push(`低频段能量占比 ${(profile.spectrum.lowRatio * 100).toFixed(0)}%，偏多 → 62/125Hz 小幅收敛`)
  }

  // ── 高频不足 / 过亮 ──
  if (profile.spectrum.highRatio > 0 && profile.spectrum.highRatio < T.highDeficient) {
    add(8000, T.gain.airBoost)
    add(16000, T.gain.airBoost)
    reasons.push(`高频段能量占比 ${(profile.spectrum.highRatio * 100).toFixed(0)}%，空气感不足 → 8k/16kHz 微提`)
  } else if (profile.spectrum.highRatio > T.highExcess) {
    add(8000, T.gain.airCut)
    add(16000, T.gain.airCut)
    reasons.push(`高频段能量占比 ${(profile.spectrum.highRatio * 100).toFixed(0)}%，偏亮易发刺 → 8k/16kHz 微收`)
  }

  // ── 音色偏闷 / 偏尖（频谱质心）──
  //
  // ⚠️ 这两个阈值是**对数频段归一化之后**的尺度，不能沿用线性-bin 质心的经验值。
  // 参考点：完全平坦的频谱在本口径下质心 ≈ 2890Hz。
  // 真实音乐的整体倾斜（低频远多于高频）会把它压到 1k~2.5k 区间，
  // 所以死区取得很宽，只有在明显异常时才动手。
  if (profile.spectrum.centroid > 0 && profile.spectrum.centroid < T.lowCentroid) {
    add(2000, T.gain.presenceBoost)
    add(4000, T.gain.airBoost)
    reasons.push(`频谱质心 ${profile.spectrum.centroid.toFixed(0)}Hz，音色偏闷 → 2k/4kHz 微提清晰度`)
  } else if (profile.spectrum.centroid > T.highCentroid) {
    add(2000, T.gain.presenceCut)
    add(4000, T.gain.airCut)
    reasons.push(`频谱质心 ${profile.spectrum.centroid.toFixed(0)}Hz，音色偏亮 → 2k/4kHz 微收`)
  }

  // ── 动态范围 ──
  if (profile.time.crestDb > T.crestHigh) {
    compressorThresholdDeltaDb += T.compressorHighDynamicDeltaDb
    reasons.push(`波峰因数 ${profile.time.crestDb.toFixed(1)}dB，动态偏大 → 压缩阈值下调 ${-T.compressorHighDynamicDeltaDb}dB`)
  } else if (profile.time.crestDb > 0 && profile.time.crestDb < T.crestLow) {
    compressorThresholdDeltaDb += T.compressorLowDynamicDeltaDb
    reasons.push(`波峰因数仅 ${profile.time.crestDb.toFixed(1)}dB，已被压得很紧 → 压缩放宽 ${T.compressorLowDynamicDeltaDb}dB，把动态还给音乐`)
  }

  // ── 立体声 ──
  if (profile.stereo.sideRatio > T.sideRatioHigh) {
    add(62, T.gain.sideBassCut)
    reasons.push('侧声道能量过高，低频相位有风险 → 62Hz 微收')
  }
  if (profile.stereo.correlation < T.correlationLow) {
    stereoWidthDelta += T.widthWideDelta
    reasons.push(`声道相关度仅 ${profile.stereo.correlation.toFixed(2)}，声场已很宽或存在相位问题 → 不建议再展宽`)
  } else if (profile.stereo.correlation > T.correlationHigh && profile.stereo.sideRatio < T.sideRatioLow) {
    stereoWidthDelta += T.widthNarrowDelta
    reasons.push('声道几乎完全同相，声场偏窄 → 可适度展宽')
  }

  if (reasons.length === 0) reasons.push('各项指标均在舒适区间，无需调整')

  return { eqDelta, bassGainDeltaDb, compressorThresholdDeltaDb, stereoWidthDelta, reasons }
}
