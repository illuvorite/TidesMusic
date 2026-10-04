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
  { label: '流行', hz31: 6, hz62: 5, hz125: -3, hz250: -2, hz500: 5, hz1000: 4, hz2000: -4, hz4000: -3, hz8000: 6, hz16000: 4 },
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
//  低音增强（Bass Boost）：lowshelf 200Hz
// ============================================================

export const BASS_BOOST_FREQ = 200
/** 「超重低音」滑块满值时的 lowshelf 增益（dB） */
export const BASS_MAX_GAIN = 12

// ============================================================
//  高保真度：highshelf 8kHz
// ============================================================

export const HIFI_FREQ = 8000
/** 「高保真度」滑块满值时的 highshelf 增益（dB） */
export const HIFI_MAX_GAIN = 9

// ============================================================
//  面板连续参数的映射上限
// ============================================================

/** 「混响强度」满值时的湿声增益 */
export const REVERB_MAX_WET = 0.8
/** 「环绕强度」满值时的 Panner 旋转半径 */
export const SURROUND_MAX_SOUND_R = 30

/**
 * 「动态推进」：把 0~100 的强度插值成压缩器参数。
 * amount = 0 时为完全透明（threshold 0dB / ratio 1 / makeup 1），听感无任何影响。
 */
export const dynamicCompressorParams = (amount: number) => {
  const a = Math.max(0, Math.min(100, amount)) / 100
  return {
    threshold: -30 * a,
    ratio: 1 + 4 * a,
    knee: 30 - 18 * a,
    makeup: 1 + 0.7 * a,
  }
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

// ============================================================
//  动态推进（DynamicsCompressor）：参数由 dynamicCompressorParams 插值
// ============================================================

/** 压缩器固定时间常数 */
export const LOUDNESS_ATTACK = 0.003
export const LOUDNESS_RELEASE = 0.25
