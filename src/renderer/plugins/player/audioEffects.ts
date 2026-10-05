/**
 * 高级音效与均衡器预设（移植自 CeruMusic / 澜音 `src/renderer/src/utils/audio/audioManager.ts`
 * 与 `src/renderer/src/store/Equalizer.ts` / `store/AudioEffects.ts` 的常量部分）
 *
 * 这里只放**纯数据与纯函数**：预设表、参数范围、以及环绕混响 IR 的运行时生成。
 * 真正的 Web Audio 节点创建与连接在 `./index.ts` 的音频链中完成。
 */

// ============================================================
//  均衡器（10 段 peaking，Q = 1.0，增益域 ±12dB）
// ============================================================

/** EQ 频段（Hz），与 Web Audio 节点一一对应 */
export const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const

/** EQ 增益范围（dB） */
export const EQ_GAIN_MIN = -12
export const EQ_GAIN_MAX = 12

/** EQ 滤波器 Q 值（CeruMusic 取 1.0） */
export const EQ_Q = 1.0

export interface EqPreset {
  /** 预设显示名（CeruMusic 原样：中文括号标注） */
  label: string
  hz31: number
  hz62: number
  hz125: number
  hz250: number
  hz500: number
  hz1000: number
  hz2000: number
  hz4000: number
  hz8000: number
  hz16000: number
}

/** 内置均衡器预设（名称与「银河音效」面板一致，曲线取自原版 lx-music 与 CeruMusic） */
export const eqPresets: EqPreset[] = [
  { label: '关闭', hz31: 0, hz62: 0, hz125: 0, hz250: 0, hz500: 0, hz1000: 0, hz2000: 0, hz4000: 0, hz8000: 0, hz16000: 0 },
  { label: '流行', hz31: 4, hz62: 2, hz125: 0, hz250: -3, hz500: -6, hz1000: -6, hz2000: -3, hz4000: 0, hz8000: 1, hz16000: 3 },
  { label: '舞曲', hz31: 4, hz62: 3, hz125: -4, hz250: -6, hz500: 0, hz1000: 0, hz2000: 3, hz4000: 4, hz8000: 4, hz16000: 5 },
  { label: '蓝调', hz31: 4, hz62: 3, hz125: 1, hz250: -1, hz500: -2, hz1000: -1, hz2000: 1, hz4000: 2, hz8000: 3, hz16000: 4 },
  { label: '古典', hz31: 4, hz62: 3, hz125: 2, hz250: 1, hz500: -1, hz1000: -1, hz2000: 0, hz4000: 2, hz8000: 3, hz16000: 4 },
  { label: '爵士', hz31: 3, hz62: 2, hz125: 1, hz250: 2, hz500: -2, hz1000: -2, hz2000: 0, hz4000: 2, hz8000: 3, hz16000: 4 },
  { label: '慢歌', hz31: 5, hz62: 4, hz125: 2, hz250: 0, hz500: -2, hz1000: 0, hz2000: 3, hz4000: 6, hz8000: 7, hz16000: 8 },
  { label: '电子乐', hz31: 6, hz62: 5, hz125: 0, hz250: -5, hz500: -4, hz1000: 0, hz2000: 6, hz4000: 8, hz8000: 8, hz16000: 7 },
  { label: '摇滚', hz31: 7, hz62: 6, hz125: 2, hz250: 1, hz500: -3, hz1000: -4, hz2000: 2, hz4000: 1, hz8000: 4, hz16000: 5 },
  { label: '乡村', hz31: 3, hz62: 2, hz125: 0, hz250: -1, hz500: 1, hz1000: 3, hz2000: 4, hz4000: 3, hz8000: 2, hz16000: 1 },
  { label: '人声', hz31: -5, hz62: -6, hz125: -4, hz250: -3, hz500: 3, hz1000: 4, hz2000: 5, hz4000: 4, hz8000: -3, hz16000: -3 },
]

// ============================================================
//  「均衡器」页 6 条增强滑条：量程与映射的**唯一来源**
//
//  ⚠️ 所有满量程与此处的映射函数都只在这里定义一次。
//  历史问题：UI 滑条用 0~50、音频链用「0.3dB/点」、而本文件另有一套
//  `BASS_MAX_GAIN = 12` 的常量且无人引用 —— 三处互不相同，
//  结果就是「滑条上限不是设计里的 100」「同一个位置听起来却不是同一个强度」。
//  以后任何一处要改，都改这里。
//
//  量程统一 0~100（百分比），声道平衡为 -100~100。
// ============================================================

/** 增强滑条满量程（0~100 百分比） */
export const ENHANCE_MAX = 100

/** 声道平衡的满量程（-100 全左 ~ +100 全右） */
export const ENHANCE_BALANCE_MAX = 100

/**
 * 超重低音：低频架转折频率。
 *
 * 取 100Hz：90Hz 只覆盖次低频（很多喇叭/耳机根本放不出来，抬了也听不见），
 * 120Hz 以上又会连带抬起「箱声」区。100Hz 是「够得着低音主体」和「不浑」的折中。
 *
 * ⚠️ 真正让小喇叭「听得见低音」的是**谐波支路**，不是这个低频架：
 *   谐波落在 2f/3f（约 200~300Hz），那是所有设备都能重放的频段。
 */
export const ENHANCE_BASS_FREQ = 100
/**
 * 超重低音满量程时的低频架增益（dB）。
 *
 * 曾经从 +15dB 砍到 +7dB —— 那一刀砍过头了：低频架只对 <100Hz 有效，
 * 而谐波支路当时还写着 highpass（低音谐波一个都没造出来），两者叠加的结果
 * 就是「拉满也听不出低音」。现在谐波支路修好了，这里给回 +9dB。
 */
export const ENHANCE_BASS_MAX_GAIN = 9
/**
 * 超重低音满量程时混入的谐波量（0~1）。
 *
 * 支路是「lowpass 取出低频段 → tanh 软削波」，削出来的 2 次/3 次谐波
 * 落在 200~300Hz —— 小喇叭放不出 100Hz，但放得出 200Hz。
 */
export const ENHANCE_BASS_MAX_HARMONICS = 0.5
// 谐波支路的 lowpass 转折频率不在这里定义：引擎按 `低频架频率 × 2` 推导
// （见 galaxy/engine.ts），这样换转折频率时两支路不会脱节。

/**
 * 高保真度：高频架转折频率。
 *
 * 取 8kHz 而不是 10kHz：10kHz 以上只有「空气感」，在多数设备上几乎听不出差别
 * （笔记本喇叭/入门耳机在 10kHz 以上本来就衰减很多）。
 * 8kHz 的架式覆盖 8~16kHz，量感明显得多；齿音主要在 5~8kHz 的**窄峰**，
 * 用缓坡的 shelf 抬 8k 以上不会把齿音顶出来。
 */
export const ENHANCE_HIFI_FREQ = 8000
/** 高保真度满量程时的高频架增益（dB） */
export const ENHANCE_HIFI_MAX_GAIN = 6

/** 混响强度满量程时的卷积混响湿声增益（内置预设最强也只有 1.2） */
export const ENHANCE_REVERB_MAX_WET = 2

/** 环绕强度满量程时的 Panner 旋转半径 */
export const ENHANCE_SURROUND_MAX_RADIUS = 3

/** 压缩器固定时间常数 */
export const LOUDNESS_ATTACK = 0.003
export const LOUDNESS_RELEASE = 0.25

/** 滑条百分比 → 0~1（越界与非法值都夹住） */
export const enhanceAmount = (value: number): number =>
  Math.max(0, Math.min(ENHANCE_MAX, Number.isFinite(value) ? value : 0)) / ENHANCE_MAX

/**
 * 滑条的**响应曲线**：`量 ^ 0.75`。
 *
 * 线性映射有个可用性陷阱：满量程 +9dB 时，50% 只有 4.5dB、25% 只有 2.25dB ——
 * 而「拖一点点听听看」恰恰是用户最常做的动作，那个区间几乎听不出差别，
 * 结论就是「没效果」。取 0.75 次幂后 25% → 3.2dB、50% → 5.3dB，
 * 低段就有明显听感，而满量程不变。
 *
 * 只作用于「音质类」四条（低音/高保真/动态/环绕半径由各自的量程决定），
 * 混响与平衡保持线性 —— 它们是电平类控制，线性更直觉。
 */
export const enhanceResponse = (amount: number): number =>
  Math.pow(enhanceAmount(amount), 0.75)

/** 混响强度（0~100）→ 卷积混响湿声增益 */
export const reverbWetFromIntensity = (value: number): number =>
  enhanceAmount(value) * ENHANCE_REVERB_MAX_WET

/** 环绕强度（0~100）→ Panner 旋转半径 */
export const surroundRadiusFromIntensity = (value: number): number =>
  enhanceAmount(value) * ENHANCE_SURROUND_MAX_RADIUS

/** 声道平衡（-100~100）→ StereoPanner 的 pan（-1~1） */
export const balancePanFromValue = (value: number): number =>
  Math.max(-1, Math.min(1, (Number.isFinite(value) ? value : 0) / ENHANCE_BALANCE_MAX))

/** 超重低音（0~100）→ 低频架增益（dB） */
export const bassGainFromAmount = (value: number): number =>
  enhanceResponse(value) * ENHANCE_BASS_MAX_GAIN

/** 超重低音（0~100）→ 谐波混入量（0~1） */
export const bassHarmonicsFromAmount = (value: number): number =>
  enhanceResponse(value) * ENHANCE_BASS_MAX_HARMONICS

/** 高保真度（0~100）→ 高频架增益（dB） */
export const hifiGainFromAmount = (value: number): number =>
  enhanceResponse(value) * ENHANCE_HIFI_MAX_GAIN

/**
 * 「动态推进」（0~100）→ 压缩器参数。
 *
 * amount = 0 时严格透明（ratio 1，无论阈值多少都不压）。
 * 满量程刻意留有余地：`−24dB / 4:1 / 补偿 +3dB`。
 * 再狠（如 −30dB / 6:1）会让强弱对比被抹平，听感是「抽气」而不是「饱满」。
 *
 * 用响应曲线而不是线性：压缩是**非线性**处理，阈值 −12dB 与 −15dB 在多数素材上
 * 听不出差别，线性映射会让 0~40% 那段像没接上一样。
 */
export const dynamicCompressorParams = (amount: number) => {
  const a = enhanceResponse(amount)
  return {
    threshold: -8 - a * 16,
    ratio: 1 + a * 3,
    knee: 6 + a * 12,
    /** 线性的补偿增益（1 → ≈1.413，即 +3dB） */
    makeupGain: Math.pow(10, (a * 3) / 20),
  }
}

/**
 * 归一化 tanh 软削波曲线，供低频谐波支路与饱和使用。
 *
 * 除以 `tanh(k)` 做归一化：±1 处输出仍为 ±1，即**只增加谐波、不改变峰值电平**
 * （否则「响度变大」会被误认为「音质变好」）。
 */
export const createTanhCurve = (amount: number, length = 1024): Float32Array<ArrayBuffer> => {
  const curve = new Float32Array(length)
  const k = Math.max(0.01, amount)
  for (let i = 0; i < length; i++) {
    const x = (i * 2) / (length - 1) - 1
    curve[i] = Math.tanh(k * x) / Math.tanh(k)
  }
  return curve
}

// ============================================================
//  环绕混响（Surround）：并联卷积混响，运行时生成指数衰减噪声 IR
// ============================================================

export type SurroundMode = 'off' | 'small' | 'medium' | 'large'

interface SurroundParams {
  duration: number
  decay: number
  wet: number
}

export const surroundModes: Record<Exclude<SurroundMode, 'off'>, SurroundParams> = {
  small: { duration: 0.5, decay: 3.0, wet: 0.3 },
  medium: { duration: 1.5, decay: 2.0, wet: 0.5 },
  large: { duration: 3.0, decay: 1.5, wet: 0.8 },
}

/**
 * 生成环绕混响用的脉冲响应：双声道「指数衰减随机噪声」。
 * （与 CeruMusic 完全一致的算法）
 */
export const generateSurroundIR = (
  context: BaseAudioContext,
  mode: Exclude<SurroundMode, 'off'>,
): AudioBuffer => {
  const { duration, decay } = surroundModes[mode]
  const rate = context.sampleRate
  const length = Math.max(1, Math.floor(rate * duration))
  const impulse = context.createBuffer(2, length, rate)
  const left = impulse.getChannelData(0)
  const right = impulse.getChannelData(1)

  for (let i = 0; i < length; i++) {
    // 指数衰减噪声
    const n = i / length
    const vol = Math.pow(1 - n, decay)
    left[i] = (Math.random() * 2 - 1) * vol
    right[i] = (Math.random() * 2 - 1) * vol
  }
  return impulse
}
