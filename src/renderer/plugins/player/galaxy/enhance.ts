/**
 * 「均衡器」页底部 4 条 DSP 滑条 → GalaxyDSPConfig 的编译器。
 *
 * ── 为什么要有这个文件 ──
 * 历史上「增强效果链」是与银河引擎并行的**第二套节点链**（自己一套
 * GainNode / BiquadFilter / DynamicsCompressor 与自己的路由函数）。
 * 两套链的后果是：
 *   · 互斥关系要靠 `exitGalaxyForManualEnhance()` 手工维持，漏调一处就出现
 *     「能拖但没反应」；
 *   · 滑条享受不到引擎里已经做好的实现（带谐波生成的低音、安全限幅、
 *     参数平滑与「中性即物理旁路」不变量）；
 *   · 路由代码两份，同一个坑（外部重连时断掉子链内部连线）要踩两次。
 *
 * 现在统一成一条链：这 4 条滑条被**编译成一份 GalaxyDSPConfig**，交给同一个引擎。
 * 本文件是纯函数，不接触 Web Audio，也不读设置 —— 设置由 `bridge.ts` 读取。
 *
 * ── 映射表 ──
 *   超重低音 (0~100)  → bass      （低频架 90Hz + 并联谐波支路）
 *   高保真度 (0~100)  → tone      （高频架 10kHz）
 *   动态推进 (0~100)  → compressor（−8~−22dB / 1:1~3.5:1 / 补偿 0~+2.5dB）
 *   声道平衡 (-100~100) → balance  （pan −1~+1）
 *
 * 另外两条滑条**不在这里**，因为它们不是 DSP 参数：
 *   混响强度 → 主链路的卷积湿声增益（用户自选 IR，与引擎内的生成式混响不是一回事）
 *   环绕强度 → PannerNode 的旋转半径（一个 novelty 效果，不是音质处理）
 */

import type { GalaxyDSPConfig } from './types'
import {
  ENHANCE_BALANCE_MAX,
  ENHANCE_BASS_FREQ,
  ENHANCE_HIFI_FREQ,
  ENHANCE_MAX,
  LOUDNESS_ATTACK,
  LOUDNESS_RELEASE,
  balancePanFromValue,
  bassGainFromAmount,
  bassHarmonicsFromAmount,
  dynamicCompressorParams,
  hifiGainFromAmount,
} from '../audioEffects'
import { createNeutralConfig } from './defaults'

export interface EnhanceAmounts {
  /** 超重低音 0~100 */
  bass: number
  /** 高保真度 0~100 */
  hifi: number
  /** 动态推进 0~100 */
  dynamic: number
  /** 声道平衡 -100 ~ +100 */
  balance: number
}

export const EMPTY_ENHANCE_AMOUNTS: EnhanceAmounts = {
  bass: 0,
  hifi: 0,
  dynamic: 0,
  balance: 0,
}

/** 非有限值一律按中性处理：设置损坏时宁可无效，也不要突然很响 */
const finite = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? value : fallback

/**
 * 4 条滑条里是否有任何一项在起作用。
 * 这是「要不要挂上引擎」的唯一判据 —— 全部为中性时必须返回 false，
 * 让引擎整条旁路（`enabled: false` 等价于 `input → output` 直连）。
 */
export const isEnhanceActive = (amounts: EnhanceAmounts): boolean =>
  finite(amounts.bass) > 0 ||
  finite(amounts.hifi) > 0 ||
  finite(amounts.dynamic) > 0 ||
  finite(amounts.balance) !== 0

/**
 * 把 4 条滑条编译成一份 DSP 配置。
 *
 * 注意 EQ 段保持全平：手动十段均衡器归用户所有，增强滑条不碰它。
 * 调用方需要通过 `setGalaxyChain(config, { manageEq: false })` 告诉引擎
 * 不要用这份（全平的）EQ 去覆盖主链路 biquad。
 */
export const createEnhanceConfig = (amounts: EnhanceAmounts): GalaxyDSPConfig => {
  const base = createNeutralConfig()
  const bass = finite(amounts.bass)
  const hifi = finite(amounts.hifi)
  const dynamic = finite(amounts.dynamic)
  const balance = finite(amounts.balance)

  const bassGain = bassGainFromAmount(bass)
  const harmonics = bassHarmonicsFromAmount(bass)
  const hifiGain = hifiGainFromAmount(hifi)
  const comp = dynamicCompressorParams(dynamic)

  return {
    ...base,
    enabled: isEnhanceActive(amounts),
    bass: {
      enabled: bass > 0,
      frequency: ENHANCE_BASS_FREQ,
      gain: bassGain,
      q: 0.8,
      harmonics,
      /*
       * mix 取 0 而不是量：引擎里 `bassDry.gain = 1 − mix × 0.5`，
       * 而增强链的低音是「低频架 + 并联加料」——干路必须满幅保留，
       * 只有谐波支路按量注入。这与 FX 预设里 mix > 0 的「干湿并行」语义不同。
       */
      mix: 0,
    },
    compressor: {
      /*
       * 用 `dynamic > 0` 而不是「参数是否非中性」来判定启用。
       * 原因：DynamicsCompressorNode 在 Chromium 里有约 6ms 的 lookahead 延迟，
       * 一个 ratio=1 的压缩器虽然数学上透明，却会平白引入延迟。
       */
      enabled: dynamic > 0,
      threshold: comp.threshold,
      ratio: comp.ratio,
      attack: LOUDNESS_ATTACK,
      release: LOUDNESS_RELEASE,
      knee: comp.knee,
      makeup: comp.makeupGain,
    },
    tone: {
      enabled: hifi > 0,
      frequency: ENHANCE_HIFI_FREQ,
      gain: hifiGain,
    },
    balance: {
      enabled: balance !== 0,
      pan: balancePanFromValue(balance),
    },
  }
}

/** 供 UI 显示用的量程（与 audioEffects.ts 保持单一来源） */
export const ENHANCE_RANGE = {
  max: ENHANCE_MAX,
  balanceMax: ENHANCE_BALANCE_MAX,
} as const
