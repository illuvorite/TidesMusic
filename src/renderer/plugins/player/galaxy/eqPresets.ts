/**
 * 银河音效 2.0 —— 纯 EQ 预设（与 FX 预设完全解耦）
 *
 * 这些预设**只描述 10 段增益**，不携带 Bass / Compressor / Reverb / Stereo / HRTF。
 * 用户可以任意组合：EQ = 流行 + FX = 银河核心，而不是二选一。
 *
 * 增益范围 ±12dB，顺序固定为 31 / 62 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k。
 * 前 11 条沿用项目原有 eqPresets 的曲线（保持与旧版听感一致），后 13 条为新增。
 */

import type { EQPreset } from './types'

export const EQ_PRESETS: EQPreset[] = [
  // ── 基础 ──
  {
    id: 'eq-off',
    name: '关闭',
    type: 'eq',
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'eq-pop',
    name: '流行',
    type: 'eq',
    // 定稿曲线（对齐 QQ 音乐参考图实测：两端微抬、500/1k 大幅下陷、高频轻提）
    bands: [4, 2, 0, -3, -6, -6, -3, 0, 1, 3],
  },
  {
    id: 'eq-dance',
    name: '舞曲',
    type: 'eq',
    bands: [4, 3, -4, -6, 0, 0, 3, 4, 4, 5],
  },
  {
    id: 'eq-blues',
    name: '蓝调',
    type: 'eq',
    bands: [4, 3, 1, -1, -2, -1, 1, 2, 3, 4],
  },
  {
    id: 'eq-classical',
    name: '古典',
    type: 'eq',
    bands: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  },
  {
    id: 'eq-jazz',
    name: '爵士',
    type: 'eq',
    bands: [3, 2, 1, 2, -2, -2, 0, 2, 3, 4],
  },
  {
    id: 'eq-slow',
    name: '慢歌',
    type: 'eq',
    bands: [5, 4, 2, 0, -2, 0, 3, 6, 7, 8],
  },
  {
    id: 'eq-electronic',
    name: '电子',
    type: 'eq',
    bands: [6, 5, 0, -5, -4, 0, 6, 8, 8, 7],
  },
  {
    id: 'eq-rock',
    name: '摇滚',
    type: 'eq',
    bands: [7, 6, 2, 1, -3, -4, 2, 1, 4, 5],
  },
  {
    id: 'eq-country',
    name: '乡村',
    type: 'eq',
    bands: [3, 2, 0, -1, 1, 3, 4, 3, 2, 1],
  },
  {
    id: 'eq-vocal',
    name: '人声',
    type: 'eq',
    bands: [-5, -6, -4, -3, 3, 4, 5, 4, -3, -3],
  },

  // ── 曲风扩展 ──
  {
    id: 'eq-hiphop',
    name: 'Hip-Hop',
    type: 'eq',
    bands: [7, 8, 4, 1, -2, 0, 1, 2, 1, 0],
  },
  {
    id: 'eq-rnb',
    name: 'R&B',
    type: 'eq',
    bands: [4, 5, 3, 1, 0, 1, 3, 3, 2, 1],
  },
  {
    id: 'eq-metal',
    name: 'Metal',
    type: 'eq',
    bands: [6, 5, 1, 0, -4, -2, 3, 5, 4, 2],
  },
  {
    id: 'eq-lofi',
    name: 'Lo-Fi',
    type: 'eq',
    // 高频整体滚降，制造"老磁带"的钝感
    bands: [3, 4, 3, 1, 0, -1, -3, -4, -6, -8],
  },
  {
    id: 'eq-kpop',
    name: 'K-Pop',
    type: 'eq',
    bands: [5, 5, 2, 0, 0, 1, 3, 4, 4, 3],
  },
  {
    id: 'eq-jpop',
    name: 'J-Pop',
    type: 'eq',
    bands: [4, 4, 2, 1, 0, 1, 3, 4, 4, 4],
  },
  {
    id: 'eq-acoustic',
    name: 'Acoustic',
    type: 'eq',
    bands: [3, 3, 2, 1, 0, 1, 2, 3, 3, 2],
  },
  {
    id: 'eq-folk',
    name: '民谣',
    type: 'eq',
    bands: [3, 3, 1, 0, 0, 1, 2, 3, 3, 2],
  },

  // ── 用途型 ──
  {
    id: 'eq-podcast',
    name: 'Podcast',
    type: 'eq',
    // 砍掉 200Hz 以下隆隆声，抬 1k~2k 保证语音可懂度
    bands: [-6, -5, -3, 0, 2, 4, 4, 3, 1, 0],
  },
  {
    id: 'eq-movie',
    name: '电影',
    type: 'eq',
    bands: [7, 6, 3, 1, -1, 0, 1, 2, 2, 1],
  },
  {
    id: 'eq-game',
    name: '游戏',
    type: 'eq',
    // 突出脚步/定位所在的中高频，弱化爆炸掩盖
    bands: [5, 4, 1, -1, 0, 1, 3, 4, 3, 2],
  },
  {
    id: 'eq-nightclub',
    name: '夜店',
    type: 'eq',
    bands: [7, 8, 5, 1, -2, 0, 3, 4, 3, 2],
  },
  {
    id: 'eq-hifi',
    name: 'HiFi',
    type: 'eq',
    // 近乎透明，只做极轻微的频响修整
    bands: [1, 1, 0, 0, 0, 0, 1, 1, 1, 1],
  },
]

/** 按 id 取 EQ 预设 */
export const findEQPreset = (id: string): EQPreset | undefined =>
  EQ_PRESETS.find(preset => preset.id === id)

/** 增益数组命中哪个 EQ 预设（未命中返回 null = 自定义） */
export const matchEQPreset = (bands: readonly number[]): EQPreset | null =>
  EQ_PRESETS.find(preset => preset.bands.every((gain, index) => gain === (bands[index] ?? 0))) ?? null
