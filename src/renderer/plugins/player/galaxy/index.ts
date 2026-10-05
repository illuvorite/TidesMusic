/**
 * 银河音效 2.0 —— 统一入口
 *
 * 三套系统共用同一套 DSP 引擎，只是参数来源不同：
 *
 *              银河音效 2.0
 *                   │
 *        ┌──────────┼──────────┐
 *        ↓          ↓          ↓
 *      音效       均衡器      音效制作
 *        │          │          │
 *     64 FX      24 EQ      自定义 DSP
 *     Preset      Preset     参数
 *        │          │          │
 *        └──────────┼──────────┘
 *                   ↓
 *            GalaxyDSPConfig
 *                   ↓
 *              DSP Engine
 *
 * 「音效」与「均衡器」是**正交的两个维度**：EQ 预设只改 EQ，FX 预设只改其他
 * 模块，两者可自由组合。composeConfig 就是这条组合规则的唯一实现。
 */

import type { EQPreset, FXPreset, GalaxyDSPConfig, UserPreset } from './types'
import { GALAXY_SCHEMA_VERSION, toEqBands } from './types'
import { applyIntensity } from './intensity'
import { createNeutralConfig } from './defaults'

export * from './types'
export * from './defaults'
export * from './eqPresets'
export * from './fxPresets'
export * from './intensity'
export * from './engine'
export * from './response'
export * from './analysis'
export * from './measure'
export * from './smart'
export * from './enhance'
export * from './userChain'

/**
 * 把任意来源（旧版本存档 / 用户 JSON / 在线预设）的配置补齐为当前 schema。
 * 缺失的模块一律以中性值填充 —— 中性值保证对应模块被物理旁路，
 * 因此旧数据迁移后不会突然多出一层音染。
 */
export const migrateGalaxyConfig = (raw: Partial<GalaxyDSPConfig> | null | undefined): GalaxyDSPConfig => {
  const base = createNeutralConfig()
  if (!raw) return base

  return {
    enabled: raw.enabled ?? base.enabled,
    inputGain: { ...base.inputGain, ...raw.inputGain },
    dcBlock: { ...base.dcBlock, ...raw.dcBlock },
    eq: Array.isArray(raw.eq) && raw.eq.length === base.eq.length ? raw.eq : base.eq,
    bass: { ...base.bass, ...raw.bass },
    compressor: { ...base.compressor, ...raw.compressor },
    saturation: { ...base.saturation, ...raw.saturation },
    stereo: { ...base.stereo, ...raw.stereo },
    delay: { ...base.delay, ...raw.delay },
    chorus: { ...base.chorus, ...raw.chorus },
    reverb: { ...base.reverb, ...raw.reverb },
    tone: { ...base.tone, ...raw.tone },
    balance: { ...base.balance, ...raw.balance },
    // 滤波槽是定长数组：长度不符一律退回中性，不做「部分保留」——
    // 槽位与 UI 的顺序强相关，错位保留会让参数落到错误的滤波器上。
    filters: Array.isArray(raw.filters) && raw.filters.length === base.filters.length
      ? raw.filters.map((slot, index) => ({ ...base.filters[index], ...slot }))
      : base.filters,
    hrtf: { ...base.hrtf, ...raw.hrtf },
    limiter: { ...base.limiter, ...raw.limiter },
  }
}

/**
 * 组合 EQ 层与 FX 预设，再套用强度。
 * 这是「EQ = 流行 + FX = 银河核心」这条需求的唯一实现点。
 *
 * @param fx        FX 预设（提供 EQ 之外的模块）
 * @param eq        EQ 层：传 null 表示沿用 FX 预设自带的 EQ 曲线；
 *                  传 EQPreset 用其曲线；传 number[10] 用显式增益（手动十段）
 * @param intensity 强度 0~100
 */
export const composeConfig = (
  fx: FXPreset,
  eq: EQPreset | readonly number[] | null,
  intensity: number,
): GalaxyDSPConfig => {
  const bands = eq === null
    ? null
    : Array.isArray(eq)
      ? toEqBands(eq)
      : toEqBands((eq as EQPreset).bands)
  const merged: GalaxyDSPConfig = bands ? { ...fx.config, eq: bands } : fx.config
  return applyIntensity(merged, intensity)
}

/** 由「音效制作」面板导出的自定义参数生成用户预设 */
export const createUserPreset = (name: string, config: GalaxyDSPConfig): UserPreset => ({
  id: `user-${Date.now().toString(36)}`,
  name,
  type: 'user',
  schemaVersion: GALAXY_SCHEMA_VERSION,
  config,
})
