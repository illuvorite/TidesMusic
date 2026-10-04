/**
 * 音质工具（移植自 CeruMusic / 澜音 `src/common/utils/quality.ts`）
 *
 * 提供统一音质阶梯、中文显示名、以及"最优可用音质"降级匹配算法。
 * 无任何外部依赖，纯函数，可在主进程 / 渲染进程 / 音源脚本中复用。
 *
 * 说明：在 CeruMusic 原始阶梯（master → 128k）基础上，补充了 lx-music 音源
 * 会返回的 `ape` / `wav` 两档（按无损级别插入），其余顺序与语义保持完全一致。
 */
export const QUALITY_ORDER = [
  'master',
  'atmos_plus',
  'atmos',
  'hires',
  'wav',
  'flac24bit',
  'ape',
  'flac',
  '320k',
  '192k',
  '128k',
] as const

export type KnownQuality = (typeof QUALITY_ORDER)[number]
export type QualityInput = KnownQuality | string | { type: string, size?: string }

const DISPLAY_NAME_MAP: Record<string, string> = {
  '128k': '标准',
  '192k': '高品',
  '320k': '超高',
  flac: '无损',
  ape: '无损',
  wav: '无损',
  flac24bit: '超高解析',
  hires: '高清臻音',
  atmos: '全景环绕',
  atmos_plus: '全景增强',
  master: '超清母带',
}

/**
 * 统一获取音质中文显示名称
 */
export function getQualityDisplayName(quality: QualityInput | null | undefined): string {
  if (!quality) return ''
  const type = typeof quality === 'object' ? quality.type : quality
  return DISPLAY_NAME_MAP[type] ?? String(type || '')
}

/**
 * 比较两个音质优先级（返回负数表示 a 优于 b）
 */
export function compareQuality(aType: string, bType: string): number {
  const ia = QUALITY_ORDER.indexOf(aType as KnownQuality)
  const ib = QUALITY_ORDER.indexOf(bType as KnownQuality)
  const va = ia === -1 ? QUALITY_ORDER.length : ia
  const vb = ib === -1 ? QUALITY_ORDER.length : ib
  return va - vb
}

/**
 * 规范化 types，兼容 string 与 {type,size}
 */
export function normalizeTypes(
  types: Array<string | { type: string, size?: string }> | null | undefined,
): string[] {
  if (!types || !Array.isArray(types)) return []
  return types
    .map(t => (typeof t === 'object' ? t.type : t))
    .filter((t): t is string => Boolean(t))
}

/**
 * 获取数组中最高音质类型
 */
export function getHighestQualityType(
  types: Array<string | { type: string, size?: string }> | null | undefined,
): string | null {
  const arr = normalizeTypes(types)
  if (!arr.length) return null
  return arr.sort(compareQuality)[0]
}

/**
 * 构建并按优先级排序的 [{type, size}] 列表
 * 支持传入数组 `[{type,size}]`，或 `_types` 映射 `{ [type]: { size } }`
 */
export function buildQualityFormats(
  input:
  | Array<{ type: string, size?: string }>
  | Record<string, { size?: string }>
  | null
  | undefined,
): Array<{ type: string, size?: string }> {
  if (!input) return []
  let list: Array<{ type: string, size?: string }>
  if (Array.isArray(input)) {
    list = input.map(i => (typeof i === 'string' ? { type: i } : { type: i.type, size: i.size }))
  } else {
    list = Object.keys(input).map(k => ({ type: k, size: input[k]?.size }))
  }
  return list.sort((a, b) => compareQuality(a.type, b.type))
}

/**
 * 计算最佳匹配音质（降级逻辑）
 *
 * 在可用音质中寻找「不高于目标音质」的**最高**音质：
 * - 目标音质可用 → 直接返回；
 * - 否则取可用列表中优先级不高于目标的最高者；
 * - 若全部可用音质都高于目标（例如目标 128k 但只有 320k），返回其中最低的（最接近目标）。
 *
 * @param availableTypes 可用音质列表
 * @param targetQuality 目标音质
 * @returns 最佳匹配音质；无任何可用音质时返回 null
 */
export function calculateBestQuality(
  availableTypes: Array<string | { type: string, size?: string }> | null | undefined,
  targetQuality: string,
): string | null {
  const normalizedTypes = normalizeTypes(availableTypes)
  if (!normalizedTypes.length) return null

  if (normalizedTypes.includes(targetQuality)) return targetQuality

  const targetIndex = QUALITY_ORDER.indexOf(targetQuality as KnownQuality)
  // 目标音质未知（不在阶梯中）→ 回退到最高可用音质
  if (targetIndex === -1) return getHighestQualityType(normalizedTypes)

  // 筛出不高于目标音质的候选（QUALITY_ORDER 中索引越小音质越高）
  const candidates = normalizedTypes.filter((t) => {
    const index = QUALITY_ORDER.indexOf(t as KnownQuality)
    return index !== -1 && index >= targetIndex
  })
  if (candidates.length > 0) return candidates.sort(compareQuality)[0]

  // 全部高于目标 → 取最低（最接近目标）
  return normalizedTypes.sort(compareQuality)[normalizedTypes.length - 1]
}
