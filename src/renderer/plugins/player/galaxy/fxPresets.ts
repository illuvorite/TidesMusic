/**
 * 银河音效 2.0 —— FX 预设（64 个）
 *
 * 数据来源：设计稿第 8 节的压缩表。这里刻意保留**与表格一一对应的压缩行格式**，
 * 而不是直接铺开成 64 份完整 JSON —— 后者既难核对又极易抄错。
 * `buildFxPreset` 负责把一行展开成完整的 GalaxyDSPConfig。
 *
 * 压缩行格式：
 *   [id, 名称, 分类, EQ 十段增益, Bass 量, [压缩阈值, 压缩比], 混响 | 0, 立体声宽度, HRTF 档位]
 *   混响 = 0 表示该预设不启用混响；否则为 [干湿比, 房间尺度, 衰减秒数]
 *
 * 展开规则（表格未给出、由本文件补齐的参数）：
 *   低音增益   = 量 × 8 dB      （0.85 → 6.8dB，与设计稿「超重低音」示例的 7dB 吻合）
 *   低音谐波   = 量 × 0.4       （0.85 → 0.34，与示例的 0.35 吻合）
 *   低音干湿   = 量
 *   预延迟     = 房间尺度 × 30ms
 *   阻尼       = 0.35 + 房间尺度 × 0.15
 *   压缩时间常数 = 0.012s / 0.16s / knee 18 / makeup 1（线性，取自示例）
 *   限幅       = -1 dBTP / 80ms
 *
 * ⚠️ 这些是"工程起始调音值"，不是针对某首歌/某副耳机测量得到的绝对正确值。
 *    落地时需配合响度匹配（LUFS）+ 真峰值限幅，避免"声音变大"被误认为"音质变好"。
 */

import type {
  FXPreset,
  GalaxyCategory,
  GalaxyDSPConfig,
  HrtfProfile,
} from './types'
import { GALAXY_SCHEMA_VERSION, toEqBands } from './types'
import { createNeutralFilters } from './defaults'

// ============================================================
//  展开常量
// ============================================================

const BASS_GAIN_PER_AMOUNT = 8
const BASS_HARMONICS_PER_AMOUNT = 0.4
const BASS_FREQUENCY = 70
const BASS_Q = 0.8

const COMP_ATTACK = 0.012
const COMP_RELEASE = 0.16
const COMP_KNEE = 18
const COMP_MAKEUP = 1

const REVERB_DAMPING_BASE = 0.35
const REVERB_DAMPING_PER_ROOM = 0.15
const REVERB_PREDELAY_PER_ROOM = 30

const STEREO_BASS_MONO_HZ = 120

const LIMITER_CEILING = -1
const LIMITER_RELEASE = 80

/** HRTF 档位 → 强度（0~1） */
const HRTF_AMOUNT: Record<HrtfProfile, number> = {
  off: 0,
  studio: 0.35,
  room: 0.5,
  cinema: 0.7,
  outdoor: 0.6,
  vr: 0.8,
}

// ============================================================
//  压缩表
// ============================================================

type ReverbCell = readonly [number, number, number] | 0

type FXRow = readonly [
  id: string,
  name: string,
  category: GalaxyCategory,
  eq: readonly number[],
  bass: number,
  comp: readonly [number, number],
  reverb: ReverbCell,
  width: number,
  hrtf: HrtfProfile,
]

export const FX_ROWS: readonly FXRow[] = [
  // ── A. 推荐音效 01~08 ──
  ['smart', '智能音效', 'recommend', [0, 1, 1, 0, 0, 1, 1, 1, 0, 0], 0.15, [-20, 2.0], [0.05, 0.35, 0.8], 1.05, 'off'],
  ['galaxy-hifi', '银河高保真', 'recommend', [0, 1, 1, 0, 0, 0, 1, 1, 1, 1], 0.10, [-18, 1.8], [0.04, 0.3, 0.7], 1.08, 'studio'],
  ['party-dj', '超嗨 DJ', 'recommend', [4, 6, 4, 1, -1, 1, 3, 3, 2, 1], 0.55, [-20, 3.2], [0.08, 0.6, 1.3], 1.25, 'off'],
  ['concert-hall', '全景音乐厅', 'recommend', [1, 1, 0, 0, 0, 1, 1, 1, 1, 1], 0.12, [-18, 1.8], [0.24, 0.85, 2.8], 1.32, 'room'],
  ['surround-51', '5.1 环绕', 'recommend', [1, 2, 1, 0, 0, 1, 2, 1, 1, 0], 0.15, [-19, 2.2], [0.14, 0.7, 1.8], 1.38, 'cinema'],
  ['bass-super', '超重低音', 'recommend', [5, 7, 5, 2, -1, 0, 1, 1, 0, 0], 0.85, [-22, 3.5], [0.02, 0.2, 0.4], 1.05, 'off'],
  ['vocal-clear', '清澈人声', 'recommend', [-2, -1, -1, -1, 0, 2, 4, 3, 2, 1], 0.05, [-18, 2.4], [0.04, 0.25, 0.6], 1.02, 'off'],
  ['live-show', '现场演绎', 'recommend', [2, 3, 2, 0, 0, 1, 2, 2, 1, 0], 0.20, [-19, 2.5], [0.20, 0.8, 2.2], 1.28, 'room'],

  // ── B. 低音增强 09~16 ──
  ['bass-deep', '深沉低音', 'bass', [5, 7, 5, 2, -1, 0, 0, 0, 0, 0], 0.75, [-21, 3.0], 0, 1.00, 'off'],
  ['bass-extreme', '超级 Bass', 'bass', [7, 9, 6, 2, -2, 0, 0, 0, 0, 0], 0.95, [-23, 3.8], 0, 1.02, 'off'],
  ['bass-club', 'Club Bass', 'bass', [5, 8, 5, 1, -1, 1, 2, 2, 1, 0], 0.80, [-20, 3.5], [0.06, 0.4, 1.0], 1.18, 'off'],
  ['bass-808', '808 Bass', 'bass', [4, 9, 6, 1, -2, 0, 1, 1, 0, 0], 0.90, [-24, 4.0], 0, 1.00, 'off'],
  ['bass-edm', 'EDM Bass', 'bass', [5, 7, 4, 1, 0, 1, 2, 2, 1, 0], 0.70, [-20, 3.2], [0.08, 0.5, 1.0], 1.22, 'off'],
  ['bass-latenight', '深夜低频', 'bass', [3, 6, 5, 2, 0, 0, 0, 0, -1, -1], 0.65, [-18, 2.5], [0.10, 0.55, 1.5], 0.92, 'off'],
  ['bass-impact', '低频冲击', 'bass', [6, 8, 6, 2, -1, 0, 1, 1, 0, 0], 0.85, [-24, 4.2], [0.03, 0.3, 0.7], 1.05, 'off'],
  ['bass-cinema', '影院低音', 'bass', [4, 7, 5, 2, 0, 1, 1, 1, 0, 0], 0.75, [-21, 3.0], [0.18, 0.75, 2.5], 1.20, 'cinema'],

  // ── C. 人声 17~24 ──
  ['vocal-crystal', '清澈人声', 'vocal', [-2, -1, -1, -1, 0, 2, 4, 3, 2, 1], 0.05, [-18, 2.4], [0.04, 0.25, 0.6], 1.02, 'off'],
  ['vocal-lead', '主唱突出', 'vocal', [-2, -2, -1, 0, 0, 2, 4, 4, 2, 1], 0, [-20, 3.0], [0.03, 0.2, 0.5], 1.00, 'off'],
  ['vocal-female', '女声甜美', 'vocal', [-2, -1, 0, 0, 0, 2, 4, 4, 3, 2], 0.05, [-19, 2.2], [0.08, 0.35, 0.8], 1.08, 'off'],
  ['vocal-male', '男声厚重', 'vocal', [2, 2, 2, 1, 0, 2, 2, 1, 0, 0], 0.25, [-20, 2.8], [0.04, 0.3, 0.7], 1.02, 'off'],
  ['vocal-podcast', '播客', 'vocal', [-3, -2, -1, 0, 1, 3, 3, 2, 1, 0], 0, [-24, 3.5], 0, 1.00, 'off'],
  ['vocal-ktv', 'KTV', 'vocal', [1, 1, 0, 0, 0, 2, 3, 3, 2, 1], 0.10, [-19, 2.5], [0.14, 0.65, 1.7], 1.18, 'room'],
  ['vocal-radio', '电台人声', 'vocal', [-4, -2, -1, 1, 2, 3, 3, 2, 0, -1], 0, [-23, 4.0], 0, 0.98, 'off'],
  ['vocal-concert', '演唱会主唱', 'vocal', [0, 1, 1, 0, 0, 2, 3, 3, 2, 1], 0.10, [-20, 3.0], [0.20, 0.8, 2.2], 1.25, 'room'],

  // ── D. Hi-Fi / 发烧 25~32 ──
  ['hifi-natural', 'HiFi 原声', 'hifi', [0, 1, 1, 0, 0, 0, 1, 1, 1, 1], 0.08, [-16, 1.5], [0.03, 0.25, 0.6], 1.04, 'studio'],
  ['hifi-analytic', '发烧解析', 'hifi', [0, 1, 0, -1, 0, 1, 2, 2, 2, 1], 0.05, [-14, 1.4], [0.02, 0.2, 0.5], 1.08, 'studio'],
  ['hifi-air', '空气感', 'hifi', [0, 0, 0, 0, 0, 1, 2, 3, 4, 3], 0, [-15, 1.5], [0.05, 0.35, 0.8], 1.12, 'studio'],
  ['hifi-detail', '细节增强', 'hifi', [0, 1, 0, -1, 0, 1, 3, 3, 3, 2], 0.05, [-16, 1.8], [0.03, 0.25, 0.6], 1.08, 'studio'],
  ['hifi-warm', '温暖 HiFi', 'hifi', [2, 2, 1, 1, 0, 0, -1, 0, 1, 1], 0.20, [-17, 1.7], [0.07, 0.4, 1.0], 1.04, 'studio'],
  ['hifi-tape', '模拟磁带', 'hifi', [2, 3, 2, 1, 0, -1, -1, -1, -2, -2], 0.25, [-19, 2.0], [0.08, 0.35, 1.0], 1.02, 'off'],
  ['hifi-vinyl', '黑胶唱片', 'hifi', [3, 3, 2, 1, 0, 0, -1, -1, -2, -3], 0.20, [-18, 1.8], [0.12, 0.45, 1.4], 1.02, 'off'],
  ['hifi-hires', '高解析', 'hifi', [0, 0, 0, -1, 0, 1, 2, 2, 2, 2], 0.05, [-14, 1.3], [0.02, 0.2, 0.4], 1.10, 'studio'],

  // ── E. 空间 / 环绕 33~40 ──
  ['spatial-widefield', '宽场环绕', 'spatial', [1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 0.10, [-18, 2.0], [0.10, 0.65, 1.6], 1.38, 'room'],
  ['spatial-ultrawide', '超宽声场', 'spatial', [0, 1, 0, 0, 0, 1, 2, 2, 1, 0], 0.05, [-17, 1.8], [0.08, 0.55, 1.4], 1.48, 'room'],
  ['spatial-3d', '3D 环绕', 'spatial', [1, 1, 0, 0, 0, 1, 2, 2, 2, 1], 0.10, [-18, 2.2], [0.15, 0.7, 2.0], 1.40, 'cinema'],
  ['spatial-vr', 'VR 旷野', 'spatial', [1, 1, 0, 0, 0, 1, 1, 2, 2, 1], 0.10, [-18, 1.8], [0.22, 0.9, 3.2], 1.32, 'outdoor'],
  ['spatial-cinema', '电影院', 'spatial', [3, 3, 2, 1, 0, 0, 1, 1, 0, -1], 0.35, [-21, 3.0], [0.28, 0.95, 3.5], 1.30, 'cinema'],
  ['spatial-hall', '音乐厅', 'spatial', [1, 1, 0, 0, 0, 1, 1, 1, 1, 1], 0.10, [-17, 1.8], [0.30, 0.95, 3.8], 1.28, 'room'],
  ['spatial-church', '教堂', 'spatial', [1, 1, 0, 0, 0, 0, 1, 1, 1, 1], 0.05, [-16, 1.5], [0.42, 1.0, 5.5], 1.25, 'room'],
  ['spatial-galaxy', '星空空间', 'spatial', [0, 1, 0, 0, 0, 1, 2, 2, 2, 2], 0.05, [-16, 1.5], [0.35, 0.95, 4.5], 1.42, 'outdoor'],

  // ── F. 音乐风格 41~48 ──
  ['genre-pop', '流行', 'genre', [2, 2, 1, 0, 0, 1, 2, 2, 1, 0], 0.20, [-19, 2.5], [0.06, 0.4, 1.0], 1.12, 'off'],
  ['genre-rock', '摇滚', 'genre', [3, 4, 2, 0, -1, 1, 3, 2, 1, 0], 0.35, [-20, 3.0], [0.05, 0.3, 0.8], 1.16, 'off'],
  ['genre-metal', '金属', 'genre', [3, 4, 2, 0, -2, 1, 4, 3, 2, 1], 0.40, [-22, 3.5], [0.04, 0.25, 0.6], 1.20, 'off'],
  ['genre-classical', '古典', 'genre', [1, 1, 0, 0, 0, 1, 1, 1, 1, 1], 0.05, [-14, 1.5], [0.22, 0.85, 2.8], 1.20, 'room'],
  ['genre-jazz', '爵士', 'genre', [2, 2, 1, 0, 0, 1, 2, 2, 2, 1], 0.15, [-16, 1.8], [0.18, 0.7, 2.0], 1.15, 'room'],
  ['genre-electronic', '电子', 'genre', [4, 6, 4, 0, -1, 1, 3, 3, 2, 1], 0.60, [-21, 3.5], [0.10, 0.55, 1.4], 1.28, 'off'],
  ['genre-hiphop', 'Hip-Hop', 'genre', [4, 7, 5, 1, -1, 0, 2, 2, 1, 0], 0.65, [-22, 3.8], [0.05, 0.35, 0.9], 1.15, 'off'],
  ['genre-lofi', 'Lo-Fi', 'genre', [3, 4, 3, 1, 0, -1, -2, -2, -3, -4], 0.30, [-19, 2.0], [0.12, 0.5, 1.4], 0.98, 'off'],

  // ── G. 场景模拟 49~56 ──
  ['scene-studio', '录音棚', 'scene', [0, 0, 0, 0, 0, 1, 1, 1, 1, 0], 0.05, [-17, 1.8], [0.08, 0.4, 0.9], 1.05, 'studio'],
  ['scene-stage', '现场舞台', 'scene', [2, 3, 2, 0, 0, 1, 2, 2, 1, 0], 0.25, [-20, 2.8], [0.20, 0.8, 2.3], 1.30, 'room'],
  ['scene-stadium', '体育场', 'scene', [3, 4, 2, 1, 0, 1, 2, 2, 1, 0], 0.30, [-21, 3.0], [0.32, 0.95, 3.5], 1.42, 'outdoor'],
  ['scene-nightclub', '夜店', 'scene', [5, 7, 5, 1, -1, 1, 3, 3, 2, 0], 0.75, [-23, 4.0], [0.16, 0.65, 1.8], 1.35, 'off'],
  ['scene-cafe', '咖啡厅', 'scene', [2, 2, 1, 0, 0, 1, 1, 1, 0, 0], 0.10, [-15, 1.5], [0.14, 0.45, 1.2], 1.02, 'room'],
  ['scene-car', '车载音响', 'scene', [4, 5, 3, 0, -1, 1, 2, 2, 1, 0], 0.55, [-21, 3.0], [0.04, 0.3, 0.7], 1.12, 'off'],
  ['scene-speaker', '手机外放', 'scene', [-2, 3, 4, 2, 0, 2, 3, 1, -1, -2], 0.35, [-18, 3.0], 0, 0.92, 'off'],
  ['scene-headphone', '耳机增强', 'scene', [2, 2, 1, 0, 0, 1, 2, 2, 1, 1], 0.20, [-17, 2.0], [0.05, 0.3, 0.8], 1.08, 'studio'],

  // ── H. 创意 / 极端 57~64 ──
  ['creative-cyberpunk', 'Cyberpunk', 'creative', [4, 5, 2, -1, -2, 1, 3, 4, 3, 2], 0.55, [-22, 3.5], [0.18, 0.7, 2.2], 1.38, 'cinema'],
  ['creative-futurebass', 'Future Bass', 'creative', [5, 7, 5, 0, -1, 1, 3, 3, 2, 1], 0.70, [-22, 4.0], [0.14, 0.65, 1.8], 1.32, 'off'],
  ['creative-neon', 'Neon Night', 'creative', [2, 4, 3, 0, 0, 1, 2, 3, 3, 2], 0.40, [-19, 2.8], [0.24, 0.75, 2.5], 1.35, 'room'],
  ['creative-space', 'Space Odyssey', 'creative', [1, 2, 1, 0, 0, 1, 2, 2, 2, 2], 0.20, [-17, 1.8], [0.40, 0.95, 5.0], 1.45, 'outdoor'],
  ['creative-underwater', 'Underwater', 'creative', [4, 5, 3, 1, -1, -2, -3, -4, -5, -5], 0.50, [-20, 2.5], [0.30, 0.9, 3.5], 1.18, 'room'],
  ['creative-dream', 'Dream', 'creative', [1, 2, 1, 0, 0, 1, 2, 3, 3, 2], 0.15, [-16, 1.8], [0.38, 0.9, 4.2], 1.35, 'room'],
  ['creative-glitch', 'Glitch', 'creative', [3, 5, 2, -2, -3, 2, 4, 5, 3, 1], 0.40, [-24, 5.0], [0.20, 0.7, 1.8], 1.48, 'cinema'],
  ['creative-galaxy-core', '银河核心', 'creative', [3, 4, 3, 0, 0, 1, 2, 3, 2, 1], 0.45, [-21, 3.0], [0.25, 0.85, 3.0], 1.40, 'cinema'],
]

// ============================================================
//  展开
// ============================================================

const round1 = (value: number): number => Math.round(value * 10) / 10
const round2 = (value: number): number => Math.round(value * 100) / 100

/** 把一行压缩表展开成完整配置 */
export const buildFxConfig = (row: FXRow): GalaxyDSPConfig => {
  const [, , , eq, bass, comp, reverb, width, hrtf] = row
  const [threshold, ratio] = comp
  const hasReverb = reverb !== 0
  const [reverbMix, roomSize, decay] = hasReverb ? reverb : [0, 0.4, 1]

  return {
    enabled: true,
    // 输入增益/音色架/平衡/通用滤波槽都不在 64 个预设的调音表里，
    // 一律取中性值（= 物理旁路），需要时由「音效制作」显式开启
    inputGain: { enabled: false, gain: 0 },
    // DC 阻断是「安全」参数而非「效果」参数，预设不主动启用它
    dcBlock: { enabled: false, frequency: 10 },
    eq: toEqBands(eq),
    bass: {
      enabled: bass > 0,
      frequency: BASS_FREQUENCY,
      gain: round1(bass * BASS_GAIN_PER_AMOUNT),
      q: BASS_Q,
      harmonics: round2(bass * BASS_HARMONICS_PER_AMOUNT),
      mix: bass,
    },
    compressor: {
      enabled: true,
      threshold,
      ratio,
      attack: COMP_ATTACK,
      release: COMP_RELEASE,
      knee: COMP_KNEE,
      makeup: COMP_MAKEUP,
    },
    saturation: { enabled: false, drive: 0, mix: 0 },
    stereo: {
      width,
      bassMonoHz: STEREO_BASS_MONO_HZ,
      crossfeed: 0,
      haas: 0,
      centerGain: 1,
    },
    delay: { enabled: false, time: 0.25, feedback: 0, mix: 0 },
    chorus: { enabled: false, rate: 0.5, depth: 0, mix: 0 },
    reverb: {
      enabled: hasReverb,
      mix: reverbMix,
      roomSize,
      decay,
      preDelay: Math.round(roomSize * REVERB_PREDELAY_PER_ROOM),
      damping: round1(REVERB_DAMPING_BASE + roomSize * REVERB_DAMPING_PER_ROOM),
    },
    tone: { enabled: false, frequency: 10000, gain: 0 },
    balance: { enabled: false, pan: 0 },
    filters: createNeutralFilters(),
    hrtf: {
      enabled: hrtf !== 'off',
      profile: hrtf,
      amount: HRTF_AMOUNT[hrtf],
      distance: 1,
    },
    limiter: { ceiling: LIMITER_CEILING, release: LIMITER_RELEASE },
  }
}

export const FX_PRESETS: FXPreset[] = FX_ROWS.map(row => ({
  id: row[0],
  name: row[1],
  category: row[2],
  schemaVersion: GALAXY_SCHEMA_VERSION,
  config: buildFxConfig(row),
}))

export const findFXPreset = (id: string): FXPreset | undefined =>
  FX_PRESETS.find(preset => preset.id === id)

export const FXPresetsByCategory = (category: GalaxyCategory): FXPreset[] =>
  FX_PRESETS.filter(preset => preset.category === category)

export const GALAXY_CATEGORY_LABEL: Record<GalaxyCategory, string> = {
  recommend: '推荐音效',
  bass: '低音增强',
  vocal: '人声增强',
  hifi: 'Hi-Fi / 发烧',
  spatial: '空间 / 环绕',
  genre: '音乐风格',
  scene: '场景模拟',
  creative: '创意 / 极端',
}
