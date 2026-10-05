/**
 * 银河音效 2.0 —— 中性配置（neutral）
 *
 * 全链路的核心不变量：**中性配置下整条链必须与直通等价**。
 * 因此每一项的默认值都是"零处理"值：
 *   gain 0dB / ratio 1 / makeup 1 / mix 0 / width 1 / pan 0。
 * 引擎据此判断某个模块是否可以物理旁路，避免出现"没开音效也被套了一层"。
 */

import type { EQBand, FilterSlotConfig, GalaxyDSPConfig } from './types'
import { EQ_FREQUENCIES, GALAXY_FILTER_SLOTS, toEqBands } from './types'

/** 立体声宽度的安全区间：越界会在 mono 播放时严重相位抵消 */
export const STEREO_WIDTH_MIN = 0.7
export const STEREO_WIDTH_MAX = 1.4

/** 强度插值：低于该阈值视为关闭，避免 enabled 这类布尔字段出现"半开"状态 */
export const INTENSITY_EPSILON = 0.01

/** 滤波器的 Q 安全区间：过低无选择性，过高会自激响铃 */
export const FILTER_Q_MIN = 0.1
export const FILTER_Q_MAX = 18

export const createNeutralEq = (): EQBand[] =>
  toEqBands(EQ_FREQUENCIES.map(() => 0))

/** 中性滤波器槽：全部关闭，频率取中频段，避免任何误插 */
export const createNeutralFilters = (): FilterSlotConfig[] =>
  Array.from({ length: GALAXY_FILTER_SLOTS }, () => ({
    enabled: false,
    type: 'peaking' as const,
    frequency: 1000,
    q: 1,
    gain: 0,
  }))

/** 造一份"什么都没开"的完整配置 */
export const createNeutralConfig = (): GalaxyDSPConfig => ({
  enabled: false,
  inputGain: {
    enabled: false,
    gain: 0,
  },
  dcBlock: {
    enabled: false,
    frequency: 10,
  },
  eq: createNeutralEq(),
  bass: {
    enabled: false,
    frequency: 70,
    gain: 0,
    q: 0.8,
    harmonics: 0,
    mix: 0,
  },
  compressor: {
    enabled: false,
    threshold: 0,
    ratio: 1,
    attack: 0.012,
    release: 0.16,
    knee: 18,
    makeup: 1,
  },
  saturation: {
    enabled: false,
    drive: 0,
    mix: 0,
  },
  stereo: {
    width: 1,
    bassMonoHz: 120,
    crossfeed: 0,
    haas: 0,
    centerGain: 1,
  },
  delay: {
    enabled: false,
    time: 0.25,
    feedback: 0,
    mix: 0,
  },
  chorus: {
    enabled: false,
    rate: 0.5,
    depth: 0,
    mix: 0,
  },
  reverb: {
    enabled: false,
    mix: 0,
    roomSize: 0.4,
    decay: 1,
    preDelay: 0,
    damping: 0.45,
  },
  tone: {
    enabled: false,
    frequency: 10000,
    gain: 0,
  },
  balance: {
    enabled: false,
    pan: 0,
  },
  filters: createNeutralFilters(),
  hrtf: {
    enabled: false,
    profile: 'off',
    amount: 0,
    distance: 1,
  },
  limiter: {
    ceiling: -1,
    release: 80,
  },
})

/** 各模块的"是否处于中性"判定，供引擎决定是否旁路 */
export const isEqNeutral = (eq: ReadonlyArray<{ gain: number }>): boolean =>
  eq.every(band => band.gain === 0)
