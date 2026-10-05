/**
 * 银河音效 2.0 —— 强度（intensity）插值
 *
 * 目标：一个预设 × 强度 0~100% = 数百种听感，而不用存几百套参数。
 *
 * ⚠️ 上一版方案的插值公式有一个隐患：它把所有参数一视同仁地线性缩放。
 *    但 DSP 参数分两类，必须区别对待：
 *
 *    ┌─ 可缩放（"量"）─────────────────────────────────────┐
 *    │ 决定"处理多少"：增益、干湿比、谐波量、驱动量、宽度偏移   │
 *    │ → 随强度线性缩放，强度 0 时必须回到中性值             │
 *    └──────────────────────────────────────────────────┘
 *    ┌─ 不可缩放（"结构"）─────────────────────────────────┐
 *    │ 决定"听起来像什么"：混响房间尺度/衰减/预延迟、滤波器   │
 *    │ 中心频率与 Q、延迟时间、调制速率、限幅上限           │
 *    │ → 全程保持不变。缩放它们会改变音色本质，            │
 *    │   例如把 roomSize 从 0.9 缩到 0.3 会把"大教堂"变成   │
 *    │   "小房间"，而不是"弱一点的大教堂"                   │
 *    └──────────────────────────────────────────────────┘
 *
 * ⚠️ 布尔字段（enabled）无法插值 —— 用 INTENSITY_EPSILON 阈值判定。
 * ⚠️ 压缩阈值必须用**乘法**而非线性插值：threshold × t，t=0 时 → 0dB（无压缩）。
 *    若用线性插值，t=0 会停在 -11dB 之类的位置，等于"关不掉"。
 */

import type { GalaxyDSPConfig } from './types'
import { FILTER_Q_MAX, FILTER_Q_MIN, INTENSITY_EPSILON, STEREO_WIDTH_MAX, STEREO_WIDTH_MIN } from './defaults'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** 从中性值出发向目标值插值（t=0 → 中性值） */
const blend = (neutral: number, target: number, t: number): number =>
  neutral + (target - neutral) * t

/** 把 0~100 的强度归一化到 0~1 */
export const normalizeIntensity = (intensity: number): number =>
  clamp(intensity, 0, 100) / 100

/**
 * 按强度缩放一套配置。纯函数，不修改入参。
 *
 * @param config    预设的完整参数（按 100% 强度定义）
 * @param intensity 0~100
 */
export const applyIntensity = (config: GalaxyDSPConfig, intensity: number): GalaxyDSPConfig => {
  const t = normalizeIntensity(intensity)
  const on = t > INTENSITY_EPSILON

  return {
    // 强度为 0 时整套效果视为关闭，链路回到直通
    enabled: config.enabled && on,

    // 输入增益：纯"量"，但从中性 0dB 出发插值（t=0 → 0dB）
    inputGain: {
      enabled: config.inputGain.enabled && on,
      gain: blend(0, config.inputGain.gain, t),
    },

    // DC 阻断属安全性参数，不随强度缩放（关掉它只会让直流偏置吃掉余量）
    dcBlock: { ...config.dcBlock },

    // EQ：增益是纯"量"，直接按比例缩放
    eq: config.eq.map(band => ({ ...band, gain: band.gain * t })),

    bass: {
      enabled: config.bass.enabled && on,
      // frequency / q 是结构参数 → 保持
      frequency: config.bass.frequency,
      q: config.bass.q,
      gain: config.bass.gain * t,
      harmonics: config.bass.harmonics * t,
      mix: config.bass.mix * t,
    },

    compressor: {
      enabled: config.compressor.enabled && on,
      // 乘法：t=0 → 0dB，等于完全不压缩
      threshold: config.compressor.threshold * t,
      // 从中性压缩比 1 出发 → t=0 时 ratio 1 = 无压缩
      ratio: blend(1, config.compressor.ratio, t),
      // attack / release / knee 是结构参数 → 保持
      attack: config.compressor.attack,
      release: config.compressor.release,
      knee: config.compressor.knee,
      makeup: blend(1, config.compressor.makeup, t),
    },

    saturation: {
      enabled: config.saturation.enabled && on,
      drive: config.saturation.drive * t,
      mix: config.saturation.mix * t,
    },

    stereo: {
      // 从中性宽度 1.0 出发，向目标宽度插值，并强制落在安全区间
      width: clamp(blend(1, config.stereo.width, t), STEREO_WIDTH_MIN, STEREO_WIDTH_MAX),
      bassMonoHz: config.stereo.bassMonoHz,
      crossfeed: config.stereo.crossfeed * t,
      haas: config.stereo.haas * t,
      centerGain: blend(1, config.stereo.centerGain, t),
    },

    delay: {
      enabled: config.delay.enabled && on,
      // time 是结构参数 → 保持
      time: config.delay.time,
      feedback: config.delay.feedback * t,
      mix: config.delay.mix * t,
    },

    chorus: {
      enabled: config.chorus.enabled && on,
      // rate 是结构参数 → 保持
      rate: config.chorus.rate,
      depth: config.chorus.depth * t,
      mix: config.chorus.mix * t,
    },

    reverb: {
      enabled: config.reverb.enabled && on,
      // 只缩放干湿比；房间尺度 / 衰减 / 预延迟 / 阻尼全部保持，
      // 否则"大教堂 30%"会变成"小房间 100%"而不是"大教堂的三成"
      mix: config.reverb.mix * t,
      roomSize: config.reverb.roomSize,
      decay: config.reverb.decay,
      preDelay: config.reverb.preDelay,
      damping: config.reverb.damping,
    },

    // 音色架：增益是"量"，频率是结构参数
    tone: {
      enabled: config.tone.enabled && on,
      frequency: config.tone.frequency,
      gain: config.tone.gain * t,
    },

    // 平衡：从中性 0（居中）出发插值
    balance: {
      enabled: config.balance.enabled && on,
      pan: clamp(blend(0, config.balance.pan, t), -1, 1),
    },

    // 通用滤波器槽：增益按"量"缩放；频率与 Q 是结构参数，必须保持 ——
    // 把 Q 从 8 缩到 2.4 会把"尖锐的陷波"变成"宽而浅的凹陷"，是换音色而非减强度。
    filters: config.filters.map(slot => ({
      ...slot,
      // 强度为 0 时整槽关闭；判据用增益或 Q 的偏离量，lowpass/highpass 这类无增益的槽
      // 只要能改变频谱就应视为"有处理"，因此直接用原 enabled
      enabled: slot.enabled && on,
      q: clamp(slot.q, FILTER_Q_MIN, FILTER_Q_MAX),
      gain: slot.gain * t,
      frequency: slot.frequency,
    })),

    hrtf: {
      enabled: config.hrtf.enabled && on,
      // profile / distance 是结构参数 → 保持
      profile: config.hrtf.profile,
      distance: config.hrtf.distance,
      amount: config.hrtf.amount * t,
    },

    // 限幅是安全底线，永不随强度缩放
    limiter: { ...config.limiter },
  }
}

/** 强度百分比的中文描述，供 UI 气泡使用 */
export const intensityLabel = (intensity: number): string => {
  const value = Math.round(clamp(intensity, 0, 100))
  if (value === 0) return '关闭'
  if (value <= 30) return '轻微'
  if (value <= 60) return '适中'
  if (value <= 85) return '明显'
  return '强烈'
}
