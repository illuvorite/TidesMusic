/**
 * 银河音效 2.0 —— 设置 ↔ 引擎 的桥接层
 *
 * 这是设置与音频引擎之间**唯一**的转换点。三套系统（音效 / 均衡器 / 音效制作）
 * 最终都归到同一条链，因此这里多了一件事：**决定谁在用这条链**。
 *
 * ── 优先级栈（`resolveAudioChain`）──
 *
 *   1. 「音效制作」用户链   开启且链非空      → compileUserChain
 *   2. 「推荐音效」FX 预设  开启且选中预设    → composeConfig（EQ 层 + 强度）
 *   3. 「均衡器」4 条增强滑条 任一非中性      → createEnhanceConfig
 *   4. 都没有                                → null（引擎整条卸载，直通）
 *
 * 高优先级会**遮蔽**低优先级，但不修改对方的设置 —— 所以关掉用户链，
 * 之前选的 FX 预设与滑条值原样回来。这比「互斥 + 互相清空设置」安全得多。
 *
 * 「智能音效」的补偿叠加层在所有来源之上统一施加（见 `applySmart`）。
 *
 * EQ 的接管权（`manageEq`）：
 *   用户链 —— 只有链里真的含 EQ 效果时才接管；
 *   FX 预设 —— 始终接管；
 *   增强滑条 —— 永不接管（手动十段均衡器归用户所有）。
 */

import type { GalaxyDSPConfig } from './types'
import { EQ_FREQUENCIES, EQ_GAIN_MAX, EQ_GAIN_MIN, toEqBands, toEqGains } from './types'
import { createNeutralConfig } from './defaults'
import type { SmartSuggestion } from './analysis'
import type { SmartOverlay } from './smart'
import {
  applySmartOverlay,
  isSmartOverlayEffective,
  overlayFromSuggestion,
  parseSmartOverlay,
  serializeSmartOverlay,
} from './smart'
import type { EnhanceAmounts } from './enhance'
import { createEnhanceConfig, isEnhanceActive } from './enhance'
import type { UserChain } from './userChain'
import { compileUserChain, parseUserChain, serializeUserChain } from './userChain'
import { composeConfig } from './index'
import { findEQPreset } from './eqPresets'
import { findFXPreset } from './fxPresets'
import { resetEqToLegacy, setGalaxyChain } from '../index'
import { appSetting, updateSetting } from '@renderer/store/setting'

/**
 * 银河链未启用时应用智能补偿所选的基底预设。
 * 用「银河高保真」而不是随便挑一个：它本身几乎不加染色（EQ 接近平坦、
 * 压缩比 1.8、宽度 1.08），智能补偿叠在它上面才接近「只做修正」。
 */
export const SMART_BASE_FX_PRESET_ID = 'galaxy-hifi'

/** clamp 的小工具（±12dB 的 EQ、-60~0dB 的压缩阈值等区间各自就地取用） */
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

// ============================================================
//  读取：设置 → 配置
// ============================================================

/** 玩家手动拖的十段增益（对应 'custom' 模式） */
export const readManualGains = (): number[] =>
  EQ_FREQUENCIES.map(hz => appSetting[`player.soundEffect.biquadFilter.hz${hz}`] ?? 0)

/** 解析 EQ 层增益；返回 null 表示「沿用 FX 预设自带曲线」 */
export const resolveEqGains = (): number[] | null => {
  const source = appSetting['player.soundEffect.galaxy.eqPresetId']
  if (!source) return null
  if (source === 'off') return EQ_FREQUENCIES.map(() => 0)
  if (source === 'custom') return readManualGains()
  const preset = findEQPreset(source)
  return preset ? [...preset.bands] : null
}

/** 「均衡器」页 4 条 DSP 滑条的当前值 */
export const readEnhanceAmounts = (): EnhanceAmounts => ({
  bass: appSetting['player.soundEffect.enhance.bass'],
  hifi: appSetting['player.soundEffect.enhance.hifi'],
  dynamic: appSetting['player.soundEffect.enhance.dynamic'],
  balance: appSetting['player.soundEffect.enhance.balance'],
})

/**
 * 「音效制作」用户链；未启用或数据损坏时返回 null。
 * 损坏的 JSON 直接退化为「无链」而不是抛错 —— 设置文件是用户可编辑的。
 */
export const readUserChain = (): UserChain | null => {
  if (!appSetting['player.soundEffect.galaxy.userChain.enable']) return null
  const chain = parseUserChain(appSetting['player.soundEffect.galaxy.userChain.data'])
  if (!chain || chain.items.length === 0) return null
  return chain
}

/**
 * 当前生效的智能补偿叠加层；未启用或数据损坏时返回 null。
 * 损坏的 JSON 直接退化为「无叠加」而不是抛错——设置文件是用户可编辑的。
 */
export const readSmartOverlay = (): SmartOverlay | null => {
  if (!appSetting['player.soundEffect.galaxy.smart.enable']) return null
  return parseSmartOverlay(appSetting['player.soundEffect.galaxy.smart.overlay'])
}

/**
 * 把智能补偿叠加到任意来源的基底之上；无有效补偿时原样返回
 *
 * 两个必须处理的边界：
 *  1. **基底不接管 EQ** 时（例如「均衡器」页的 4 条滑条），补偿的 EQ 部分没有落点。
 *     这里用「用户手调曲线 + 补偿增量」自己拼一份 EQ 层：既能落地补偿、又不丢用户的曲线。
 *     代价是本配置开始接管 EQ —— 撤掉补偿时由 `syncAudioChain` 还原，来回都是无损的。
 *  2. **完全没有基底** 时，补偿还必须自己把要修改的段落打开，
 *     否则用户点了「应用补偿」什么都听不到。
 *
 * 基底接管 EQ 时（FX 预设 / 含 EQ 效果的用户链）直接用 `merged.eq`，
 * 因为那已经是「预设曲线 + 补偿」的结果。
 */
const applySmart = (
  base: GalaxyDSPConfig | null,
  baseManagesEq: boolean,
): SmartApplied => {
  const overlay = readSmartOverlay()
  if (!overlay || !isSmartOverlayEffective(overlay)) {
    return { config: base, managesEq: baseManagesEq }
  }

  const soleCarrier = base == null
  const merged = applySmartOverlay(base ?? createNeutralConfig(), overlay)

  const needsOwnEq = soleCarrier || !baseManagesEq
  const eq = needsOwnEq
    ? toEqBands(readManualGains().map((gain, index) =>
      clamp(gain + (overlay.eq[index] ?? 0), EQ_GAIN_MIN, EQ_GAIN_MAX)))
    : merged.eq

  return {
    config: {
      ...merged,
      eq,
      // 补偿本身就会产生处理，必须显式打开总开关，否则会被整条旁路掉
      enabled: true,
      bass: {
        ...merged.bass,
        enabled: merged.bass.enabled || (soleCarrier && Math.abs(overlay.bassGainDb) > 1e-6),
      },
      compressor: {
        ...merged.compressor,
        enabled: merged.compressor.enabled ||
          (soleCarrier && Math.abs(overlay.compressorThresholdDb) > 1e-6),
      },
    },
    managesEq: true,
  }
}

/** 纯「FX 预设 + EQ 层 + 强度」的合成结果，不含智能补偿 */
export const buildGalaxyConfig = (): GalaxyDSPConfig | null => {
  if (!appSetting['player.soundEffect.galaxy.enable']) return null
  const fx = findFXPreset(appSetting['player.soundEffect.galaxy.fxPresetId'])
  if (!fx) return null
  return composeConfig(fx, resolveEqGains(), appSetting['player.soundEffect.galaxy.intensity'])
}

/** 当前音频链的来源，供 UI 显示「现在是谁在生效」 */
export type AudioChainSource = 'user-chain' | 'fx-preset' | 'enhance' | 'none'

export interface ResolvedAudioChain {
  config: GalaxyDSPConfig | null
  source: AudioChainSource
  /** 这份配置是否接管主链路 EQ */
  managesEq: boolean
}

/** `applySmart` 的返回值：可能被补偿改写成另一份配置 */
interface SmartApplied {
  config: GalaxyDSPConfig | null
  managesEq: boolean
}

/**
 * 「音效总开关」= `player.soundEffect.enable`。
 *
 * ⚠️ 这个键此前是**死设置**：`defaultSetting.ts` 声明了它、注释也写着「关闭时整条音效链物理旁路，
 * 素音直出；各音效设置保留」，但全仓库**没有任何地方读它**。于是面板表头那个「总开关」
 * 只能靠**把 12 项子设置逐个清零**来假装关闭 —— 用户调好的十段 EQ / 增强滑条 / 卷积选择
 * 会就此永久丢失，也正是 dev 与打包版配置漂移的元凶之一。
 *
 * 现在它才是真正的闸门：关闭 ⇒ 整条链退出（`setGalaxyChain(null)` 会 dispose 引擎），
 * 而**子设置一字不动**，重新打开即原样恢复。
 *
 * 用 `!== false` 而不是真值判断：更早的配置里可能压根没有这个键，
 * 缺失应当视为开启，才与 `defaultSetting` 的默认值 `true` 一致。
 */
export const isSoundEffectEnabled = (): boolean => appSetting['player.soundEffect.enable'] !== false

/** 按优先级栈解析出当前应该挂上引擎的配置 */
export const resolveAudioChain = (): ResolvedAudioChain => {
  // 0. 音效总开关：关闭时整条链退出（setGalaxyChain(null) 会 dispose 引擎），设置原样保留
  if (!isSoundEffectEnabled()) return { config: null, source: 'none', managesEq: false }

  // 1. 「音效制作」用户链
  const chain = readUserChain()
  if (chain) {
    const result = compileUserChain(chain)
    if (result.config.enabled) {
      const smart = applySmart(result.config, result.managesEq)
      return { config: smart.config, source: 'user-chain', managesEq: smart.managesEq }
    }
  }

  // 2. 「推荐音效」FX 预设
  const fx = buildGalaxyConfig()
  if (fx) {
    // 智能补偿叠加在强度**之后**：强度缩放的是预设染色，而补偿是对素材的修正，
    // 若放在之前，强度 0% 会把补偿一起抹掉（详见 smart.ts 的说明）
    const smart = applySmart(fx, true)
    return { config: smart.config, source: 'fx-preset', managesEq: smart.managesEq }
  }

  // 3. 「均衡器」4 条增强滑条
  const amounts = readEnhanceAmounts()
  if (isEnhanceActive(amounts)) {
    const smart = applySmart(createEnhanceConfig(amounts), false)
    return { config: smart.config, source: 'enhance', managesEq: smart.managesEq }
  }

  // 4. 只有智能补偿、没有基底：仍然要挂链，否则补偿没有落点
  const smartOnly = applySmart(null, false)
  if (smartOnly.config) {
    return { config: smartOnly.config, source: 'enhance', managesEq: smartOnly.managesEq }
  }

  return { config: null, source: 'none', managesEq: false }
}

// ============================================================
//  同步：设置 → 引擎
// ============================================================

/** 上一次挂载的配置是否接管了主链路 EQ */
let prevManagesEq = false

/**
 * 把当前设置推给引擎。这是**唯一**调用 `setGalaxyChain` 的地方。
 *
 * 从「接管 EQ」的来源切到「不接管」的来源（或彻底卸载）时，主链路 biquad 里
 * 还留着上一份配置写的 shelf 类型、Q 值与增益，必须还原成用户手调的那一套，
 * 否则会听到一条没被任何界面显示的 EQ 曲线。
 */
export const syncAudioChain = () => {
  const { config, managesEq } = resolveAudioChain()
  setGalaxyChain(config, { manageEq: managesEq })

  const nowManagesEq = config != null && managesEq
  if (prevManagesEq && !nowManagesEq) resetEqToLegacy(readManualGains())
  prevManagesEq = nowManagesEq
}

// ============================================================
//  写入：UI 动作 → 设置
// ============================================================

/**
 * 让出链路控制权：在「推荐音效」或「均衡器」页做出选择时调用。
 *
 * 优先级栈里用户链排在最高，不关掉它，用户在另外两页做的任何选择都会被静默遮蔽
 * ——也就是那个最招人烦的「点了没反应」。只关开关，**数据一字不动**，
 * 用户回到「音效制作」重新打开时一切还在。
 */
export const releaseUserChain = () => {
  if (!appSetting['player.soundEffect.galaxy.userChain.enable']) return
  updateSetting({ 'player.soundEffect.galaxy.userChain.enable': false })
}

/**
 * 应用一个 FX 预设（推荐音效磁贴）。传 null = 关闭银河链。
 * 换预设时把 EQ 层重置为空，让预设自带的曲线生效。
 */
export const applyGalaxyPreset = (fxId: string | null, intensity?: number) => {
  const patch: Partial<LX.AppSetting> = {
    'player.soundEffect.galaxy.enable': fxId != null,
    'player.soundEffect.galaxy.fxPresetId': fxId ?? '',
    'player.soundEffect.galaxy.eqPresetId': '',
  }
  if (intensity != null) patch['player.soundEffect.galaxy.intensity'] = Math.round(intensity)
  // 让出用户链，否则这次点击会被优先级更高的「音效制作」链遮住
  patch['player.soundEffect.galaxy.userChain.enable'] = false
  updateSetting(patch)
}

/** 强度滑条 */
export const setGalaxyIntensity = (value: number) => {
  updateSetting({ 'player.soundEffect.galaxy.intensity': Math.round(value) })
}

/** 均衡器宫格 */
export const applyGalaxyEqPreset = (eqId: string) => {
  // 同上：EQ 预设只对 FX 路径有意义，用户链开着时它没有落点
  updateSetting({
    'player.soundEffect.galaxy.eqPresetId': eqId,
    'player.soundEffect.galaxy.userChain.enable': false,
  })
}

/** 手动拖十段 → EQ 层切到「手动」（仅在银河链开着时才需要标记） */
export const markGalaxyEqCustom = () => {
  const patch: Partial<LX.AppSetting> = {}
  if (appSetting['player.soundEffect.galaxy.enable'] &&
    appSetting['player.soundEffect.galaxy.eqPresetId'] !== 'custom') {
    patch['player.soundEffect.galaxy.eqPresetId'] = 'custom'
  }
  // 用户链若接管 EQ，手调的十段会被它盖掉 —— 同样先让出
  if (appSetting['player.soundEffect.galaxy.userChain.enable']) {
    patch['player.soundEffect.galaxy.userChain.enable'] = false
  }
  if (Object.keys(patch).length === 0) return
  updateSetting(patch)
}

/**
 * 手动拖「均衡器」页底部的增强滑杆 → 让出链路控制权。
 *
 * 优先级栈里 FX 预设与用户链都排在增强滑条之上，不退出的话滑杆会变成
 * 「能拖但没反应」。这里只关开关、**不清空**预设 id 与用户链数据 ——
 * 用户重新打开时一切都还在。
 */
export const exitGalaxyForManualEnhance = () => {
  const patch: Partial<LX.AppSetting> = {}
  if (appSetting['player.soundEffect.galaxy.enable']) {
    patch['player.soundEffect.galaxy.enable'] = false
  }
  if (appSetting['player.soundEffect.galaxy.userChain.enable']) {
    patch['player.soundEffect.galaxy.userChain.enable'] = false
  }
  if (Object.keys(patch).length === 0) return
  updateSetting(patch)
}

/**
 * 一键关闭（面板表头总开关 / 「关闭」磁贴）。
 * 同时清掉智能补偿：否则它会「潜伏」在设置里，用户下次选任何一个预设时
 * 上一次的补偿又冒出来，看起来像预设本身带的效果。
 */
export const disableGalaxy = () => {
  if (!appSetting['player.soundEffect.galaxy.enable'] &&
    !appSetting['player.soundEffect.galaxy.fxPresetId'] &&
    !appSetting['player.soundEffect.galaxy.smart.enable'] &&
    !appSetting['player.soundEffect.galaxy.smart.overlay'] &&
    !appSetting['player.soundEffect.galaxy.userChain.enable']) return
  updateSetting({
    'player.soundEffect.galaxy.enable': false,
    'player.soundEffect.galaxy.fxPresetId': '',
    'player.soundEffect.galaxy.eqPresetId': '',
    'player.soundEffect.galaxy.smart.enable': false,
    'player.soundEffect.galaxy.smart.overlay': '',
    'player.soundEffect.galaxy.userChain.enable': false,
  })
}

/** 当前生效的 FX 预设 id（供磁贴高亮；银河关闭时为空） */
export const activeGalaxyPresetId = (): string =>
  appSetting['player.soundEffect.galaxy.enable']
    ? appSetting['player.soundEffect.galaxy.fxPresetId']
    : ''

/** 当前强度值（0~100） */
export const currentIntensity = (): number =>
  appSetting['player.soundEffect.galaxy.intensity']

// ============================================================
//  「音效制作」：用户链 → 设置
// ============================================================

/** 写入用户链数据（编辑器每次改动都调用） */
export const saveUserChain = (chain: UserChain) => {
  updateSetting({
    'player.soundEffect.galaxy.userChain.data': serializeUserChain(chain),
  })
}

/** 开关用户链 */
export const setUserChainEnabled = (enabled: boolean) => {
  updateSetting({ 'player.soundEffect.galaxy.userChain.enable': enabled })
}

/** 当前用户链（即使未启用也返回数据，供编辑器加载）。数据缺失/损坏时给空链 */
export const loadUserChainForEdit = (): UserChain =>
  parseUserChain(appSetting['player.soundEffect.galaxy.userChain.data']) ?? { name: '', items: [] }

/** 清空用户链（同时关闭开关） */
export const clearUserChain = () => {
  updateSetting({
    'player.soundEffect.galaxy.userChain.enable': false,
    'player.soundEffect.galaxy.userChain.data': '',
  })
}

// ============================================================
//  「智能音效」：分析结果 → 设置
// ============================================================

/**
 * 把一次检测结果落成补偿叠加层并启用。
 *
 * 刻意**不重置** fxPresetId / eqPresetId —— 用户选的预设是口味，
 * 补偿是修正，检测一次就换掉用户的预设是最不能接受的行为。
 * 只有在银河链本来就关着时才挑一个中性基底（SMART_BASE_FX_PRESET_ID），
 * 否则 bass / 压缩 / 声场这三项修正根本没有落点。
 */
export const applySmartSuggestion = (suggestion: SmartSuggestion): SmartOverlay => {
  const overlay = overlayFromSuggestion(suggestion)

  const patch: Partial<LX.AppSetting> = {
    'player.soundEffect.galaxy.smart.enable': true,
    'player.soundEffect.galaxy.smart.overlay': serializeSmartOverlay(overlay),
  }
  if (!appSetting['player.soundEffect.galaxy.enable']) {
    patch['player.soundEffect.galaxy.enable'] = true
  }
  if (!findFXPreset(appSetting['player.soundEffect.galaxy.fxPresetId'])) {
    patch['player.soundEffect.galaxy.fxPresetId'] = SMART_BASE_FX_PRESET_ID
  }
  updateSetting(patch)
  return overlay
}

/** 撤销智能补偿（保留预设与强度，只是把叠加层摘掉） */
export const clearSmartSuggestion = () => {
  if (!appSetting['player.soundEffect.galaxy.smart.enable'] &&
    !appSetting['player.soundEffect.galaxy.smart.overlay']) return
  updateSetting({
    'player.soundEffect.galaxy.smart.enable': false,
    'player.soundEffect.galaxy.smart.overlay': '',
  })
}

/** 智能补偿当前是否生效（开关打开且有可用叠加层） */
export const isSmartActive = (): boolean => readSmartOverlay() != null

/** 智能补偿的检测时间戳（ms）；未检测过为 0 */
export const smartMeasuredAt = (): number => readSmartOverlay()?.measuredAt ?? 0

/** 智能补偿的触发原因；未检测过为空数组 */
export const smartReasons = (): string[] => readSmartOverlay()?.reasons ?? []

/**
 * 「当前听到的 EQ 曲线」十段增益，供智能预览做对比参照。
 * 取**合成后**的结果（已含来源优先级、强度与已生效的补偿）；
 * 没有任何来源时退回用户手调的十段。
 */
export const currentEqGainsForPreview = (): number[] => {
  // 总开关关闭时实际听到的是**全平**（链路整体旁路，见 isSoundEffectEnabled），
  // 不能报用户手调的那条 —— 否则「对比参照」会把没有生效的曲线当成现状
  if (!isSoundEffectEnabled()) return EQ_FREQUENCIES.map(() => 0)
  const { config } = resolveAudioChain()
  return config ? toEqGains(config.eq) : readManualGains()
}

