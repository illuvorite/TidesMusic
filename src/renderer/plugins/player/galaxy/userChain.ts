/**
 * 银河音效 2.0 ——「音效制作」通用音效链
 *
 * 这一层回答的问题是：面板上的 34 个效果器条目，**究竟对应哪些 DSP 参数**。
 *
 * 设计原则：
 *  1. **编译为 GalaxyDSPConfig，而不是另开一条链路。**
 *     与「推荐音效」「均衡器」两页一样，产出物是同一份配置、交给同一个引擎，
 *     因此「中性即物理旁路」「参数一律平滑」「连接不累积」这些不变量自动继承。
 *  2. **纯函数。** 不读设置、不碰 Web Audio，因此可以脱离音频上下文做确定性测试。
 *  3. **诚实降级。** 引擎里没有落点的效果（如变调）明确返回 `dropped` 警告，
 *     而不是假装生效；只能近似的（如旋转喇叭）返回 `approximated` 警告。
 *     一个「点了没反应但界面说已启用」的开关，比明说"不支持"要糟得多。
 *
 * ── 效果器 → 引擎段落 的映射总表 ──
 *
 *   增益类   volume / stacker            → inputGain
 *   音色类   eq10 / eq30 / dynamic_eq    → eq（10 段图示）
 *            hifi                          → tone
 *            exciter                       → saturation + tone
 *   低频类   bass / super_bass / virtual_bass → bass
 *   动态类   dynamic / compressor         → compressor
 *            limiter                       → limiter.ceiling
 *   空间类   stereo_wide / wide_field     → stereo.width
 *            delay                         → delay
 *            chorus / rotary               → chorus
 *            impulse / reverb / ambient    → reverb
 *            spatial / surround            → stereo.width + reverb
 *   声像类   balance                       → balance
 *   滤波类   lowpass / highpass / bandpass / notch /
 *            lowshelf / highshelf / bell / tilt → filters（4 个通用槽）
 *   无落点   pitch                         → dropped（提示改用「声学适配」页的变调器）
 */

import type { GalaxyDSPConfig, FilterSlotConfig } from './types'
import { EQ_FREQUENCIES, toEqBands } from './types'
import { FILTER_Q_MAX, FILTER_Q_MIN, createNeutralConfig } from './defaults'
import { EQ_GAIN_MAX, EQ_GAIN_MIN } from '../audioEffects'

// ============================================================
//  类型
// ============================================================

export interface UserFxParamDef {
  key: string
  /** i18n key */
  label: string
  min: number
  max: number
  def: number
}

export interface UserFxDef {
  id: string
  /** i18n key = `player__sound_effect_fx_${id}` */
  params: UserFxParamDef[]
}

export interface UserChainItem {
  uid: string
  fxId: string
  params: Record<string, number>
}

export interface UserChain {
  name: string
  items: UserChainItem[]
}

/** 编译过程中产生的降级说明 */
export interface UserChainWarning {
  fxId: string
  kind: 'dropped' | 'approximated' | 'overflow'
}

export interface UserChainCompileResult {
  config: GalaxyDSPConfig
  /**
   * 这份配置是否要接管主链路 EQ。
   * 只有当链里**真的包含 EQ 类效果**时才为 true ——
   * 否则用户手动拖的十段均衡会被一份全平的 EQ 无声清掉。
   */
  managesEq: boolean
  warnings: UserChainWarning[]
  /** 实际产生了参数的效果 id（按链内顺序，用于 UI 反馈） */
  applied: string[]
}

/** 链内效果数量上限（防御性：损坏/恶意 JSON 不应造成一条几百级的长链） */
export const USER_CHAIN_MAX_ITEMS = 32

// ============================================================
//  效果器目录
//
//  参数取值范围与「量程只有一处定义」的原则一致：所有百分比类参数统一 0~100，
//  这样面板上的数字含义与页面上其它滑条（增强滑条、强度）完全一样。
// ============================================================

const P = (key: string, label: string, min: number, max: number, def: number): UserFxParamDef =>
  ({ key, label, min, max, def })

const BAND_PARAMS: UserFxParamDef[] = EQ_FREQUENCIES.map(frequency =>
  P(`b${EQ_FREQUENCIES.indexOf(frequency)}`, `player__sound_effect_fx_band_${frequency}`, -15, 15, 0))

/** 百分比参数量程 */
const AMOUNT = (def = 10) => P('amount', 'player__sound_effect_fx_param_amount', 0, 100, def)
const WET = (def = 20) => P('wet', 'player__sound_effect_fx_param_wet', 0, 100, def)
const FREQ = (min: number, max: number, def: number) =>
  P('freq', 'player__sound_effect_fx_param_freq', min, max, def)

export const USER_FX_CATALOG: UserFxDef[] = [
  // ── 基础 ──
  { id: 'volume', params: [P('gain', 'player__sound_effect_fx_param_gain', 0, 200, 100)] },
  { id: 'stacker', params: [P('gain', 'player__sound_effect_fx_param_gain', 0, 200, 100)] },
  { id: 'eq10', params: BAND_PARAMS },
  { id: 'eq30', params: BAND_PARAMS },
  { id: 'dynamic_eq', params: BAND_PARAMS },
  { id: 'limiter', params: [P('threshold', 'player__sound_effect_fx_param_threshold', 0, 100, 20)] },
  { id: 'compressor', params: [P('threshold', 'player__sound_effect_fx_param_threshold', 0, 100, 20)] },
  { id: 'dynamic', params: [AMOUNT(20)] },
  // ── 音色 ──
  { id: 'hifi', params: [AMOUNT(20)] },
  { id: 'exciter', params: [AMOUNT(20)] },
  { id: 'bass', params: [AMOUNT(20)] },
  { id: 'super_bass', params: [AMOUNT(20)] },
  { id: 'virtual_bass', params: [AMOUNT(20)] },
  { id: 'clear_vocal', params: [AMOUNT(20)] },
  // ── 空间 ──
  { id: 'stereo_wide', params: [AMOUNT(20)] },
  { id: 'wide_field', params: [AMOUNT(20)] },
  { id: 'spatial', params: [AMOUNT(20)] },
  { id: 'surround', params: [AMOUNT(20)] },
  { id: 'impulse', params: [WET(20)] },
  { id: 'reverb', params: [WET(20)] },
  { id: 'ambient', params: [WET(20)] },
  { id: 'delay', params: [P('time', 'player__sound_effect_fx_param_time', 0, 1000, 200)] },
  { id: 'chorus', params: [AMOUNT(20)] },
  { id: 'rotary', params: [P('speed', 'player__sound_effect_fx_param_speed', 1, 50, 25)] },
  { id: 'balance', params: [P('pan', 'player__sound_effect_fx_param_pan', -100, 100, 0)] },
  // ── 无落点 ──
  { id: 'pitch', params: [P('rate', 'player__sound_effect_fx_param_rate', 50, 150, 100)] },
  // ── 滤波 ──
  { id: 'lowpass', params: [FREQ(200, 20000, 18000)] },
  { id: 'highpass', params: [FREQ(20, 2000, 100)] },
  { id: 'bandpass', params: [FREQ(100, 10000, 1000)] },
  { id: 'notch', params: [FREQ(100, 10000, 1000)] },
  { id: 'lowshelf', params: [P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
  { id: 'highshelf', params: [P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
  { id: 'bell', params: [FREQ(100, 10000, 1000), P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
  { id: 'tilt', params: [P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
]

export const findUserFx = (id: string): UserFxDef | undefined =>
  USER_FX_CATALOG.find(fx => fx.id === id)

/** 造一个带默认参数的链节点 */
export const createUserChainItem = (fxId: string): UserChainItem => {
  const fx = findUserFx(fxId)
  const params: Record<string, number> = {}
  for (const param of fx?.params ?? []) params[param.key] = param.def
  return {
    uid: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    fxId,
    params,
  }
}

// ============================================================
//  解析 / 序列化
// ============================================================

/** 取参数值，非有限值回退到默认值 */
const readParam = (item: UserChainItem, key: string, fallback: number): number => {
  const raw = item.params?.[key]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback
}

/** 0~100 → 0~1，并夹住越界与非法值 */
const percent = (value: number): number =>
  Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)) / 100

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * 解析任意来源的通用音效链（设置里的 JSON 字符串、导入的 .json 文件内容）。
 *
 * 设置文件与导入文件都是用户可编辑的，因此这里**只做保守解析**：
 * 结构不对就返回 null（退化为「无链」），单个条目非法就丢弃该条目，
 * 绝不抛错 —— 一条坏数据不应该让整个音效面板白屏。
 */
export const parseUserChain = (raw: unknown): UserChain | null => {
  let source: unknown = raw
  if (typeof raw === 'string') {
    const text = raw.trim()
    if (!text) return null
    try {
      source = JSON.parse(text)
    } catch {
      return null
    }
  }
  if (!source || typeof source !== 'object') return null

  const data = source as Record<string, unknown>
  // 兼容两种形态：本模块的 { name, items } 与早期导出的 { name, chain }
  const rawItems = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.chain)
      ? data.chain
      : null
  if (!rawItems) return null

  const items: UserChainItem[] = []
  for (const entry of rawItems.slice(0, USER_CHAIN_MAX_ITEMS)) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const fxId = typeof item.fxId === 'string' ? item.fxId : ''
    if (!findUserFx(fxId)) continue
    const params: Record<string, number> = {}
    if (item.params && typeof item.params === 'object') {
      for (const [key, value] of Object.entries(item.params as Record<string, unknown>)) {
        if (typeof value === 'number' && Number.isFinite(value)) params[key] = value
      }
    }
    items.push({
      uid: typeof item.uid === 'string' && item.uid ? item.uid : createUserChainItem(fxId).uid,
      fxId,
      params,
    })
  }

  return {
    name: typeof data.name === 'string' ? data.name : '',
    items,
  }
}

/** 序列化成导出用的 JSON（带格式标识，便于导入时辨识） */
export const serializeUserChain = (chain: UserChain): string =>
  JSON.stringify({
    type: 'lx-galaxy-general',
    version: 2,
    name: chain.name,
    items: chain.items,
  })

// ============================================================
//  编译
// ============================================================

/** 滤波器槽位分配器：超出上限的部分如实报告，而不是静默丢弃 */
interface FilterAllocator {
  cursor: number
  slots: FilterSlotConfig[]
  overflow: boolean
  add: (slot: Omit<FilterSlotConfig, 'enabled'>) => void
}

const createFilterAllocator = (slots: FilterSlotConfig[]): FilterAllocator => ({
  cursor: 0,
  slots,
  overflow: false,
  add(slot) {
    if (this.cursor >= this.slots.length) {
      this.overflow = true
      return
    }
    this.slots[this.cursor] = {
      ...slot,
      enabled: true,
      q: clamp(slot.q, FILTER_Q_MIN, FILTER_Q_MAX),
    }
    this.cursor++
  },
})

/**
 * 把用户音效链编译成一份 GalaxyDSPConfig。
 *
 * 同类型模块多次出现时**后者覆盖前者**（除 EQ 与 inputGain 是累加），
 * 这与「链」的直觉一致：越靠后的模块越接近最终输出。
 */
export const compileUserChain = (chain: UserChain): UserChainCompileResult => {
  const config = createNeutralConfig()
  config.enabled = chain.items.length > 0

  const warnings: UserChainWarning[] = []
  const applied: string[] = []
  const filters = createFilterAllocator(config.filters)

  const eqGains = EQ_FREQUENCIES.map(() => 0)
  let managesEq = false
  /** 输入增益：volume / stacker 可以叠加，因此累加 dB 而不是覆盖 */
  let inputGainDb = 0

  /**
   * 增益型滤波（shelf / bell / tilt）在 0dB 时**不占用槽位**：
   * 0dB 的双二阶在数学上是恒等滤波器，占一个槽只会让「已启用 N 个滤波」这个
   * 数字虚高，还会把真正需要的滤波挤出 4 个槽。
   */
  const allocGainSlot = (slot: Omit<FilterSlotConfig, 'enabled'>): void => {
    if (slot.gain === 0) return
    filters.add(slot)
  }

  for (const item of chain.items) {
    const amount = (key = 'amount', def = 20) => percent(readParam(item, key, def))

    switch (item.fxId) {
      // ── 增益 ──
      case 'volume':
      case 'stacker': {
        const gain = readParam(item, 'gain', 100)
        // 0 是静音（−Infinity dB），因此下限夹到一个极小的可听值而不是 0
        const db = 20 * Math.log10(Math.max(0.01, gain) / 100)
        inputGainDb += db
        break
      }

      // ── EQ（累加到十段增益）──
      case 'eq10':
      case 'eq30':
      case 'dynamic_eq': {
        managesEq = true
        EQ_FREQUENCIES.forEach((_, index) => {
          eqGains[index] += readParam(item, `b${index}`, 0)
        })
        // 30 段与动态 EQ 都降级为「静态 10 段」：引擎只有 10 个倍频程段，
        // 且没有侧链/包络检测，无法做真正的动态均衡
        if (item.fxId !== 'eq10') warnings.push({ fxId: item.fxId, kind: 'approximated' })
        break
      }

      // ── 动态 ──
      case 'dynamic': {
        const a = amount()
        config.compressor = {
          enabled: a > 0,
          threshold: -6 - a * 18,
          ratio: 1 + a * 3,
          attack: 0.008,
          release: 0.2,
          knee: 12,
          makeup: 1 + a * 0.2,
        }
        break
      }
      case 'compressor': {
        const a = percent(readParam(item, 'threshold', 20))
        config.compressor = {
          enabled: a > 0,
          threshold: -a * 30,
          ratio: 3,
          attack: 0.01,
          release: 0.18,
          knee: 10,
          makeup: 1,
        }
        break
      }
      case 'limiter': {
        const a = percent(readParam(item, 'threshold', 20))
        // 0% → 0dB（不限制）；100% → −6dB，是常见的母带级上限
        config.limiter = { ...config.limiter, ceiling: -a * 6 }
        break
      }

      // ── 低频（三种低音用不同的「干/谐波」配比来区分听感）──
      case 'bass': {
        const a = amount()
        config.bass = {
          enabled: a > 0, frequency: 80, gain: a * 6, q: 0.8, harmonics: a * 0.3, mix: 0,
        }
        break
      }
      case 'super_bass': {
        const a = amount()
        config.bass = {
          enabled: a > 0, frequency: 60, gain: a * 9, q: 0.9, harmonics: a * 0.45, mix: 0,
        }
        break
      }
      case 'virtual_bass': {
        const a = amount()
        // 心理声学低音：几乎不抬低频能量，主要靠谐波让耳机「听出」下潜
        config.bass = {
          enabled: a > 0, frequency: 50, gain: a * 3, q: 1, harmonics: a * 0.7, mix: 0,
        }
        break
      }

      // ── 音色 ──
      case 'hifi': {
        const a = amount()
        config.tone = { enabled: a > 0, frequency: 12000, gain: a * 6 }
        break
      }
      case 'exciter': {
        const a = amount()
        config.saturation = { enabled: a > 0, drive: a, mix: a * 0.6 }
        config.tone = { enabled: a > 0, frequency: 8000, gain: a * 2 }
        break
      }
      case 'clear_vocal': {
        const a = amount()
        // 人声存在感：抬 1k~4k，收 250Hz 以下的浑浊区
        eqGains[2] -= a * 3
        eqGains[3] -= a * 2
        eqGains[5] += a * 3
        eqGains[6] += a * 4
        eqGains[7] += a * 3
        managesEq = true
        break
      }

      // ── 空间 ──
      case 'stereo_wide': {
        const a = amount()
        config.stereo = { ...config.stereo, width: 1 + a * 0.4 }
        break
      }
      case 'wide_field': {
        const a = amount()
        config.stereo = { ...config.stereo, width: 1 + a * 0.6 }
        break
      }
      case 'spatial': {
        const a = amount()
        config.stereo = { ...config.stereo, width: 1 + a * 0.45 }
        config.reverb = {
          enabled: a > 0, mix: a * 0.35, roomSize: 0.8, decay: 2.5, preDelay: 25, damping: 0.45,
        }
        break
      }
      case 'surround': {
        const a = amount()
        config.stereo = { ...config.stereo, width: 1 + a * 0.45 }
        config.reverb = {
          enabled: a > 0, mix: a * 0.5, roomSize: 0.95, decay: 3.5, preDelay: 35, damping: 0.4,
        }
        // 真环绕需要多声道输出；这里只做「宽声场 + 大空间」的近似
        warnings.push({ fxId: item.fxId, kind: 'approximated' })
        break
      }
      case 'impulse': {
        const a = percent(readParam(item, 'wet', 20))
        config.reverb = {
          enabled: a > 0, mix: a * 0.6, roomSize: 0.6, decay: 1.6, preDelay: 20, damping: 0.5,
        }
        break
      }
      case 'reverb': {
        const a = percent(readParam(item, 'wet', 20))
        config.reverb = {
          enabled: a > 0, mix: a * 0.6, roomSize: 0.5, decay: 1.2, preDelay: 12, damping: 0.55,
        }
        break
      }
      case 'ambient': {
        const a = percent(readParam(item, 'wet', 20))
        config.reverb = {
          enabled: a > 0, mix: a * 0.55, roomSize: 0.9, decay: 3.2, preDelay: 40, damping: 0.35,
        }
        break
      }
      case 'delay': {
        const timeMs = readParam(item, 'time', 200)
        const seconds = clamp(timeMs / 1000, 0.001, 2)
        config.delay = { enabled: true, time: seconds, feedback: 0.3, mix: 0.3 }
        break
      }
      case 'chorus': {
        const a = amount()
        config.chorus = { enabled: a > 0, rate: 0.6, depth: a, mix: a * 0.6 }
        break
      }
      case 'rotary': {
        // 旋转喇叭（Leslie）没有原生等价物，用「较慢的合唱」近似其音高摆动的听感
        const speed = readParam(item, 'speed', 25)
        const rate = clamp(0.2 + (speed / 50) * 6.8, 0.2, 7)
        config.chorus = { enabled: true, rate, depth: 0.6, mix: 0.5 }
        warnings.push({ fxId: item.fxId, kind: 'approximated' })
        break
      }

      // ── 声像 ──
      case 'balance': {
        const pan = clamp(readParam(item, 'pan', 0) / 100, -1, 1)
        config.balance = { enabled: pan !== 0, pan }
        break
      }

      // ── 无落点 ──
      case 'pitch':
        // 变调在引擎里没有落点（主链路的变调器是独立节点，不归 DSP 配置管）。
        // 用 continue 而不是 break：不能让它进入 applied，否则界面会显示「已生效」。
        warnings.push({ fxId: item.fxId, kind: 'dropped' })
        continue

      // ── 滤波 ──
      case 'lowpass':
        filters.add({ type: 'lowpass', frequency: readParam(item, 'freq', 18000), q: 0.71, gain: 0 })
        break
      case 'highpass':
        filters.add({ type: 'highpass', frequency: readParam(item, 'freq', 100), q: 0.71, gain: 0 })
        break
      case 'bandpass':
        filters.add({ type: 'bandpass', frequency: readParam(item, 'freq', 1000), q: 1, gain: 0 })
        break
      case 'notch':
        // Q 取 4：太低的 Q 会让陷波宽得听不出「去掉」了什么
        filters.add({ type: 'notch', frequency: readParam(item, 'freq', 1000), q: 4, gain: 0 })
        break
      case 'lowshelf':
        allocGainSlot({
          type: 'lowshelf', frequency: 200, q: 0.71, gain: readParam(item, 'gain', 0),
        })
        break
      case 'highshelf':
        allocGainSlot({
          type: 'highshelf', frequency: 8000, q: 0.71, gain: readParam(item, 'gain', 0),
        })
        break
      case 'bell':
        allocGainSlot({
          type: 'peaking',
          frequency: readParam(item, 'freq', 1000),
          q: 1.4,
          gain: readParam(item, 'gain', 0),
        })
        break
      case 'tilt': {
        // 倾斜（tilt）：以 ~1kHz 为轴，低频与高频反向偏移 —— 需要两个槽
        const gain = clamp(readParam(item, 'gain', 0), -12, 12)
        if (gain !== 0) {
          filters.add({ type: 'lowshelf', frequency: 300, q: 0.71, gain: -gain })
          filters.add({ type: 'highshelf', frequency: 4000, q: 0.71, gain })
        }
        break
      }

      // 目录里没有的 id 在解析阶段已被丢弃，这里兜底以防直接构造的链
      default:
        warnings.push({ fxId: item.fxId, kind: 'dropped' })
        continue
    }

    applied.push(item.fxId)
  }

  if (filters.overflow) warnings.push({ fxId: '', kind: 'overflow' })

  config.eq = toEqBands(eqGains.map(gain => clamp(gain, EQ_GAIN_MIN, EQ_GAIN_MAX)))

  if (inputGainDb !== 0) {
    // 夹在 ±24dB：更大的输入增益只会在限幅器前把信号压成一堵墙
    config.inputGain = {
      enabled: true,
      gain: clamp(inputGainDb, -24, 24),
    }
  }

  // 链为空时必须回到完全中性，否则会挂上一条「什么都不做但仍在路径里」的链
  const hasAnyEffect = applied.length > 0
  config.enabled = hasAnyEffect

  return { config, managesEq, warnings, applied }
}
