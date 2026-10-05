/**
 * 银河音效 2.0 —— 「智能音效」的补偿叠加层
 *
 * 分析层（analysis.ts）产出的是**增量建议**而不是绝对值，原因在于：
 *   用户选的预设是「口味」，智能补偿是「修正」，两者应当正交相加。
 *   把补偿烘进预设参数里会让「银河核心 + 智能」和「银河核心」变成两个预设，
 *   重新检测一次就得再存一套。
 *
 * 为什么叠加发生在**强度之后**：
 *   强度缩放的是「预设自带的染色」，而智能补偿是对当前素材本身的修正。
 *   若先加补偿再乘强度，强度 0% 会把补偿一并抹掉 —— 那时用户明明开着智能音效
 *   却听不到任何变化，属于最难排查的那类问题。
 *
 * 为什么叠加层不打开任何模块的 enabled：
 *   补偿的职责是「在已有处理的基础上微调」，而不是「替用户决定要开哪些效果」。
 *   某模块本来就是关的，那它对声音没有影响，也就无所谓补偿；
 *   低频/高频的量感修正可以由 EQ 层承担（suggestFromProfile 同时给了 EQ 增量）。
 */

import type { GalaxyDSPConfig } from './types'
import type { SmartSuggestion } from './analysis'
import { EQ_GAIN_MAX, EQ_GAIN_MIN } from './types'

export interface SmartOverlay {
  /** 10 段增量（dB），顺序 31/62/125/250/500/1k/2k/4k/8k/16k */
  eq: number[]
  /** 低音模块增益增量（dB） */
  bassGainDb: number
  /** 压缩阈值增量（dB，负值压得更狠） */
  compressorThresholdDb: number
  /** 立体声宽度增量（倍数，正为展宽） */
  stereoWidth: number
  /** 检测完成时间戳（ms），供 UI 显示「检测于 …」 */
  measuredAt: number
  /** 触发原因（已本地化的人话），随叠加层一起持久化，重开面板仍能解释 */
  reasons: string[]
}

/**
 * 单次补偿的幅度上限。
 *
 * 这些值刻意取小：智能补偿是「修正」不是「重做」，
 * 一次检测就把某段推 6dB 更可能是分析误判而不是音乐真的缺。
 * 用户如果觉得不够，可以再检测一次叠加（每次都在钳位范围内）。
 */
export const SMART_LIMITS = {
  /** 单段 EQ 增量上限（dB） */
  eqDb: 3,
  /** 低音增益增量上限（dB） */
  bassDb: 3,
  /** 压缩阈值增量上限（dB） */
  compressorDb: 6,
  /** 宽度增量上限（倍数） */
  width: 0.2,
} as const

/** 宽度安全区间（与 defaults.ts 一致；越界会带来相位问题） */
export const SMART_WIDTH_MIN = 0.7
export const SMART_WIDTH_MAX = 1.4

export const createEmptySmartOverlay = (): SmartOverlay => ({
  eq: new Array<number>(10).fill(0),
  bassGainDb: 0,
  compressorThresholdDb: 0,
  stereoWidth: 0,
  measuredAt: 0,
  reasons: [],
})

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** 分析结果 → 可持久化的叠加层（带上时间戳，供 UI 显示「检测于 …」） */
export const overlayFromSuggestion = (
  suggestion: SmartSuggestion,
  measuredAt = Date.now(),
): SmartOverlay => ({
  eq: new Array<number>(10).fill(0).map((_, index) => clamp(
    Number.isFinite(suggestion.eqDelta[index]) ? suggestion.eqDelta[index] : 0,
    -SMART_LIMITS.eqDb,
    SMART_LIMITS.eqDb,
  )),
  bassGainDb: clamp(suggestion.bassGainDeltaDb || 0, -SMART_LIMITS.bassDb, SMART_LIMITS.bassDb),
  compressorThresholdDb: clamp(
    suggestion.compressorThresholdDeltaDb || 0,
    -SMART_LIMITS.compressorDb,
    SMART_LIMITS.compressorDb,
  ),
  stereoWidth: clamp(suggestion.stereoWidthDelta || 0, -SMART_LIMITS.width, SMART_LIMITS.width),
  measuredAt,
  reasons: [...suggestion.reasons],
})

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

/**
 * 解析持久化的叠加层（设置里存的是 JSON 字符串）。
 *
 * 任何非法输入都退化为 null（而不是抛错或部分接受）：
 * 叠加层来自用户可编辑的设置文件，坏数据不应该让整条音频链挂掉。
 */
export const parseSmartOverlay = (raw: unknown): SmartOverlay | null => {
  let source: unknown = raw
  if (typeof raw === 'string') {
    if (!raw.trim()) return null
    try {
      source = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!source || typeof source !== 'object') return null
  const data = source as Partial<SmartOverlay>
  // 必须恰好 10 段。长度不符说明数据被截断或来自别的版本 ——
  // 补齐缺段会产出一份「只改了一半」的补偿，用户看不见却听得出，比整份丢弃更糟。
  if (!Array.isArray(data.eq) || data.eq.length !== 10) return null

  const eq = new Array<number>(10)
  for (let i = 0; i < 10; i++) {
    eq[i] = clamp(finiteOr(data.eq[i], 0), -SMART_LIMITS.eqDb, SMART_LIMITS.eqDb)
  }

  return {
    eq,
    bassGainDb: clamp(finiteOr(data.bassGainDb, 0), -SMART_LIMITS.bassDb, SMART_LIMITS.bassDb),
    compressorThresholdDb: clamp(
      finiteOr(data.compressorThresholdDb, 0),
      -SMART_LIMITS.compressorDb,
      SMART_LIMITS.compressorDb,
    ),
    stereoWidth: clamp(finiteOr(data.stereoWidth, 0), -SMART_LIMITS.width, SMART_LIMITS.width),
    measuredAt: Math.max(0, Math.floor(finiteOr(data.measuredAt, 0))),
    reasons: Array.isArray(data.reasons)
      ? data.reasons.filter((item): item is string => typeof item === 'string').slice(0, 8)
      : [],
  }
}

export const serializeSmartOverlay = (overlay: SmartOverlay): string =>
  JSON.stringify({
    eq: overlay.eq.map(value => Math.round(value * 100) / 100),
    bassGainDb: overlay.bassGainDb,
    compressorThresholdDb: overlay.compressorThresholdDb,
    stereoWidth: overlay.stereoWidth,
    measuredAt: overlay.measuredAt,
    reasons: overlay.reasons,
  })

/** 叠加层是否有实际作用（全零 / 无理由 = 什么都没做） */
export const isSmartOverlayEffective = (overlay: SmartOverlay | null): boolean => {
  if (!overlay) return false
  return overlay.eq.some(value => Math.abs(value) > 1e-6) ||
    Math.abs(overlay.bassGainDb) > 1e-6 ||
    Math.abs(overlay.compressorThresholdDb) > 1e-6 ||
    Math.abs(overlay.stereoWidth) > 1e-6
}

/**
 * 把补偿叠加到配置上。返回**新对象**，不修改入参。
 *
 * 注意各模块的钳位目标不同：
 *   · EQ 段 → 与滑杆同域（±12dB），否则曲线会和滑杆显示对不上
 *   · 压缩阈值 → 上限 0dB（0dB = 完全不压缩），下限 -60dB
 *   · 宽度 → 安全区间 0.7~1.4，越界会有相位问题
 */
export const applySmartOverlay = (
  config: GalaxyDSPConfig,
  overlay: SmartOverlay | null,
): GalaxyDSPConfig => {
  if (!overlay || !isSmartOverlayEffective(overlay)) return config

  return {
    ...config,
    eq: config.eq.map((band, index) => ({
      ...band,
      gain: clamp(band.gain + (overlay.eq[index] ?? 0), EQ_GAIN_MIN, EQ_GAIN_MAX),
    })),
    bass: {
      ...config.bass,
      gain: Math.max(0, config.bass.gain + overlay.bassGainDb),
    },
    compressor: {
      ...config.compressor,
      threshold: clamp(config.compressor.threshold + overlay.compressorThresholdDb, -60, 0),
    },
    stereo: {
      ...config.stereo,
      width: clamp(config.stereo.width + overlay.stereoWidth, SMART_WIDTH_MIN, SMART_WIDTH_MAX),
    },
  }
}

export interface SmartChip {
  label: string
  value: string
}

/**
 * 把叠加层摊成「改了哪些东西」的标签，供 UI 在应用前列出。
 * 只在应用后给一句「已优化」，用户永远不知道自己被改了什么。
 */
export const smartOverlayChips = (overlay: SmartOverlay | null): SmartChip[] => {
  if (!overlay) return []
  const chips: SmartChip[] = []
  const frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

  overlay.eq.forEach((value, index) => {
    if (Math.abs(value) <= 1e-6) return
    const frequency = frequencies[index]
    const text = frequency >= 1000 ? `${frequency / 1000}k` : `${frequency}`
    chips.push({ label: `${text}Hz`, value: `${value > 0 ? '+' : ''}${value.toFixed(1)}dB` })
  })

  if (Math.abs(overlay.bassGainDb) > 1e-6) {
    chips.push({ label: '低音', value: `${overlay.bassGainDb > 0 ? '+' : ''}${overlay.bassGainDb.toFixed(1)}dB` })
  }
  if (Math.abs(overlay.compressorThresholdDb) > 1e-6) {
    chips.push({ label: '动态', value: `${overlay.compressorThresholdDb > 0 ? '+' : ''}${overlay.compressorThresholdDb.toFixed(1)}dB` })
  }
  if (Math.abs(overlay.stereoWidth) > 1e-6) {
    chips.push({ label: '声场', value: `${overlay.stereoWidth > 0 ? '+' : ''}${overlay.stereoWidth.toFixed(2)}` })
  }
  return chips
}
