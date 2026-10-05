/**
 * 银河音效 2.0 —— DSP 参数协议（类型层）
 *
 * 设计要点（相对第一版方案的修正）：
 *  1. **EQ 与 FX 解耦**：EQ Preset 与 FX Preset 是两个独立维度，可自由组合
 *     （EQ = 流行 + FX = 银河核心），不再揉进同一个 state 里二选一。
 *  2. **单位统一**：上一版协议里 attack 用秒、preDelay 用毫秒、makeup 用线性，
 *     混在同一份 JSON 里极易出错。这里统一为：
 *       - 增益类   gain / threshold / ceiling   → dB
 *       - 压缩比   ratio                        → 无量纲（>= 1）
 *       - 时间类   attack / release             → 秒
 *       - 延迟类   preDelay                     → 毫秒
 *       - 比例类   mix / harmonics / width      → 线性（width 为倍数）
 *     字段名上不做单位后缀，统一由本注释与 `docs` 约定，避免 `gainDb` 这类噪音。
 *  3. **结构参数 vs 可缩放参数**：强度（intensity）只能缩放"量"，
 *     不能缩放"结构"（见 intensity.ts）。
 */

import { EQ_FREQUENCIES, EQ_GAIN_MAX, EQ_GAIN_MIN } from '../audioEffects'

export { EQ_FREQUENCIES, EQ_GAIN_MAX, EQ_GAIN_MIN }

/** 预设 schema 版本；结构发生不兼容变更时递增，由 migrateGalaxyConfig 兜底 */
export const GALAXY_SCHEMA_VERSION = 2

// ============================================================
//  基础类型
// ============================================================

/** 与参考图左侧分类一一对应 */
export type GalaxyCategory =
  | 'recommend'
  | 'bass'
  | 'vocal'
  | 'hifi'
  | 'spatial'
  | 'genre'
  | 'scene'
  | 'creative'

/**
 * Web Audio BiquadFilterNode 支持的三种类型。
 * 首尾两段用 shelf 更贴近传统硬件 EQ 的操作习惯：
 *   31Hz → lowshelf、16kHz → highshelf，其余 → peaking。
 */
export type EQBandType = 'lowshelf' | 'peaking' | 'highshelf'

export interface EQBand {
  frequency: number
  gain: number
  q: number
  type: EQBandType
}

export interface BassEnhancerConfig {
  enabled: boolean
  /** 核心频率，Hz */
  frequency: number
  /** 低频增强量，dB */
  gain: number
  q: number
  /** 低频谐波生成量 0~1（心理声学低音：小喇叭也能"听出"下潜） */
  harmonics: number
  /** 干湿比 0~1 */
  mix: number
}

export interface CompressorConfig {
  enabled: boolean
  /** 阈值，dB */
  threshold: number
  /** 压缩比，>= 1 */
  ratio: number
  /** 起攻时间，秒 */
  attack: number
  /** 释放时间，秒 */
  release: number
  /** 拐点软硬，dB */
  knee: number
  /**
   * 补偿增益，**线性**（1 = 不补偿）。
   * 注意：DynamicsCompressorNode 没有 makeup 参数，必须外挂 GainNode 实现。
   */
  makeup: number
}

export interface ReverbConfig {
  enabled: boolean
  /** 干湿比 0~1 */
  mix: number
  /** 房间尺度 0~1（结构参数，不随强度缩放） */
  roomSize: number
  /** 衰减时间，秒（结构参数） */
  decay: number
  /** 预延迟，**毫秒**（结构参数） */
  preDelay: number
  /** 高频阻尼 0~1（结构参数） */
  damping: number
}

export interface StereoConfig {
  /** 0.70 收窄 · 1.00 原始 · 1.40 超宽（不要超过 1.4，否则 mono 下相位抵消） */
  width: number
  /** 该频率以下的低频转单声道，避免低频相位抵消，Hz */
  bassMonoHz: number
  crossfeed: number
  /** Haas 效应延迟量 0~1 */
  haas: number
  centerGain: number
}

export type HrtfProfile = 'off' | 'studio' | 'room' | 'cinema' | 'outdoor' | 'vr'

export interface HrtfConfig {
  enabled: boolean
  profile: HrtfProfile
  amount: number
  distance: number
}

export interface SaturationConfig {
  enabled: boolean
  /** 驱动量 0~1 */
  drive: number
  mix: number
}

export interface DelayConfig {
  enabled: boolean
  /** 延迟时间，秒（结构参数） */
  time: number
  /** 反馈量 0~1 */
  feedback: number
  mix: number
}

export interface ChorusConfig {
  enabled: boolean
  /** 调制速率，Hz（结构参数） */
  rate: number
  /** 调制深度 0~1 */
  depth: number
  mix: number
}

/**
 * DC 阻断 / 高通（设计稿 DSP 链里的 `HPF / DC` 段）。
 * Web Audio 没有一阶高通，这里用 2 阶 Butterworth 高通实现（Q = 0.707）；
 * 截止频率取 10Hz 量级时对可闻频段完全透明，仅用于去掉直流偏置吃掉的那点余量。
 * 默认关闭 —— 遵守「中性即完全旁路」，绝不无条件塞一个滤波器进链路。
 */
export interface DcBlockConfig {
  enabled: boolean
  /** 截止频率，Hz */
  frequency: number
}

/**
 * 输入增益（链路最前段）。
 *
 * 用途：给整条链一个「推子」位置。想加大饱和/压缩的驱动量时，
 * 应该推动输入增益而不是去改各模块自己的阈值 —— 后者会连带改变
 * 「什么时候开始压缩」这个语义。
 * 中性值 0dB（线性 1），此时该段被物理旁路。
 */
export interface InputGainConfig {
  enabled: boolean
  /** 增益，dB */
  gain: number
}

/**
 * 音色架（高频架 / brilliance）。
 *
 * 这是「高保真度」滑条的 DSP 落点：抬 10kHz 以上做「空气感」，
 * 而不是抬 8kHz —— 8kHz 是齿音刺耳区，抬它只会「更亮更吵」。
 * 之所以不写进 EQ 的 10 段：EQ 归用户（或 EQ 预设）所有，
 * 增强滑条不应该偷偷改用户的均衡曲线。
 */
export interface ToneConfig {
  enabled: boolean
  /** 转折频率，Hz（结构参数，不随强度缩放） */
  frequency: number
  /** 增益，dB */
  gain: number
}

/**
 * 立体声平衡。
 *
 * 与 `stereo.width` 的分工：
 *   width   —— 改的是「左右差异有多大」（M/S 里的 S 分量）
 *   balance —— 改的是「左右两边谁更响」
 * 两者不可互相替代，因此是两个独立段。
 */
export interface BalanceConfig {
  enabled: boolean
  /** -1 全左 ~ +1 全右，0 = 居中 */
  pan: number
}

/**
 * 通用滤波器槽位。
 *
 * 已有 10 段图示 EQ 仍由 `eq` 承载；本段用于「音效制作」里那些
 * 不可归约为倍频程增益的滤波器（lowpass / highpass / bandpass /
 * notch / bell / tilt …），它们需要独立的频率与 Q。
 *
 * 槽位数固定为 `GALAXY_FILTER_SLOTS`，超出部分由编译器丢弃并给出警告 ——
 * 固定长度让 schema 迁移与强度插值都保持简单（无需处理变长数组）。
 */
export type FilterKind =
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'notch'
  | 'peaking'
  | 'lowshelf'
  | 'highshelf'

export interface FilterSlotConfig {
  enabled: boolean
  type: FilterKind
  /** 中心 / 转折频率，Hz（结构参数） */
  frequency: number
  q: number
  /** 增益，dB（仅 peaking / lowshelf / highshelf 使用） */
  gain: number
}

/** 通用滤波器槽位数 */
export const GALAXY_FILTER_SLOTS = 4

export interface LimiterConfig {
  /** 上限，dBTP（负值）。见引擎注释：这是采样域限幅，不是真峰值限幅 */
  ceiling: number
  /** 释放时间，**毫秒** */
  release: number
}

/**
 * 一套完整的 DSP 参数组合 —— 这是引擎唯一认识的输入。
 *
 * 字段顺序 = **链路顺序**，改动时请同步 `engine.ts` 的 `route()`：
 *
 *   inputGain → dcBlock → [EQ · 由主链路 biquad 承载]
 *     → bass → compressor → saturation → stereo → delay → chorus → reverb
 *     → tone → balance → filters → limiter → output
 */
export interface GalaxyDSPConfig {
  enabled: boolean
  /** 输入增益（链路最前） */
  inputGain: InputGainConfig
  /** DC 阻断 / 高通 */
  dcBlock: DcBlockConfig
  eq: EQBand[]
  bass: BassEnhancerConfig
  compressor: CompressorConfig
  saturation: SaturationConfig
  stereo: StereoConfig
  delay: DelayConfig
  chorus: ChorusConfig
  reverb: ReverbConfig
  /** 音色架（高频架） */
  tone: ToneConfig
  /** 立体声平衡 */
  balance: BalanceConfig
  /** 通用滤波器槽位（固定长度 GALAXY_FILTER_SLOTS） */
  filters: FilterSlotConfig[]
  hrtf: HrtfConfig
  limiter: LimiterConfig
}

// ============================================================
//  预设
// ============================================================

/** 纯 EQ 预设：只描述 10 段增益，不携带任何 FX */
export interface EQPreset {
  id: string
  name: string
  type: 'eq'
  /** 10 段增益（dB），顺序 31/62/125/250/500/1k/2k/4k/8k/16k */
  bands: number[]
}

/** 内置 FX 预设：一整套 DSP 参数 */
export interface FXPreset {
  id: string
  name: string
  category: GalaxyCategory
  schemaVersion: number
  config: GalaxyDSPConfig
}

/** 用户自定义预设（「保存为 Preset」产出的结构） */
export interface UserPreset {
  id: string
  name: string
  type: 'user'
  schemaVersion: number
  config: GalaxyDSPConfig
}

// ============================================================
//  EQ 段辅助：把 10 段增益展开成带类型的 EQBand
// ============================================================

/** 首段 lowshelf、末段 highshelf，中间 peaking */
export const eqBandTypeAt = (index: number): EQBandType =>
  index === 0
    ? 'lowshelf'
    : index === EQ_FREQUENCIES.length - 1
      ? 'highshelf'
      : 'peaking'

/**
 * Q 值。
 *
 * peaking 段取 **√2 ≈ 1.414** —— 经典倍频程图示均衡器的取值。
 * 依据：RBJ 的半增益带宽公式 BW(oct) = (2/ln2)·asinh(1/(2Q))，代入 Q = √2 得 BW ≈ 1.00，
 * 即「比峰值低一半」的两个频点正好落在中心频率 **±0.5 八度** —— 也就是本十段的
 * **频段边界**。于是每段宽度恰为一个倍频程，相邻段在边界处首尾相接。
 *
 * 实测（+12dB @1kHz / 48kHz，见 galaxy/response.ts）：
 *   Q = √2  → 半增益带宽 0.997 oct；±0.5 八度(边界) = 5.98dB ≈ 半增益；±1 八度(相邻频点) = 2.49dB
 *   Q = 1.0 → 半增益带宽 1.388 oct；±1 八度 = 3.96dB（各段变宽，相邻段互相压入）
 * 注意区分：±1 八度处是**相邻频点**，不是半增益点，此处不该期望半增益。
 *
 * shelf 段：Web Audio 对 lowshelf/highshelf **不使用 Q**（内部按 RBJ 的 S = 1 实现），
 * 此处的 0.71 仅为 schema 完整性保留，写入节点不产生任何影响。
 */
export const eqBandQAt = (index: number): number =>
  index === 0 || index === EQ_FREQUENCIES.length - 1 ? 0.71 : Math.SQRT2

export const toEqBands = (gains: readonly number[]): EQBand[] =>
  EQ_FREQUENCIES.map((frequency, index) => ({
    frequency,
    gain: gains[index] ?? 0,
    q: eqBandQAt(index),
    type: eqBandTypeAt(index),
  }))

/** 反向：EQBand[] → 10 段增益（供 UI 滑杆绑定） */
export const toEqGains = (bands: readonly EQBand[]): number[] =>
  EQ_FREQUENCIES.map((frequency, index) =>
    bands.find(band => band.frequency === frequency)?.gain ?? 0)
