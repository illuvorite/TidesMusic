/**
 * 音效面板的预设数据与设置映射。
 *
 * 面板外观按「图片化」设计（矢量渐变磁贴 + 圆形质感滑块 + 浅灰按钮网格），
 * 但每一项都直接对应现有音频逻辑的真实设置键，交互结果与原有实现完全一致。
 */
import { freqs, eqPresets, surroundModes } from '@renderer/plugins/player'
import type { SurroundMode } from '@renderer/plugins/player/audioEffects'

/** 一套完整的音效状态（切换预设时会整体写入，保证结果确定） */
export interface SoundEffectState {
  eq: number[]
  /** 高保真度 0~100 */
  hifi: number
  /** 混响强度 0~100 */
  reverb: number
  /** 环绕强度 0~100 */
  surroundStrength: number
  /** 超重低音 0~100 */
  bass: number
  /** 动态推进 0~100 */
  dynamic: number
  /** 声道平衡 -50 ~ 50 */
  balance: number
  /** 混响模式（生成 IR） */
  reverbMode: SurroundMode
  convolutionFileName: string
  playbackRate: number
}

export const defaultEffectState = (): SoundEffectState => ({
  eq: freqs.map(() => 0),
  hifi: 0,
  reverb: 0,
  surroundStrength: 0,
  bass: 0,
  dynamic: 0,
  balance: 0,
  reverbMode: 'off',
  convolutionFileName: '',
  playbackRate: 1,
})

/** 从应用设置中读出当前音效状态 */
export const readEffectState = (appSetting: Record<string, any>): SoundEffectState => ({
  eq: freqs.map(item => appSetting[`player.soundEffect.biquadFilter.hz${item}`] ?? 0),
  hifi: appSetting['player.soundEffect.hifi'] ?? 0,
  reverb: appSetting['player.soundEffect.reverb'] ?? 0,
  surroundStrength: appSetting['player.soundEffect.surroundStrength'] ?? 0,
  bass: appSetting['player.soundEffect.bass'] ?? 0,
  dynamic: appSetting['player.soundEffect.dynamic'] ?? 0,
  balance: appSetting['player.soundEffect.balance'] ?? 0,
  reverbMode: (appSetting['player.soundEffect.reverbMode'] ?? 'off') as SurroundMode,
  convolutionFileName: appSetting['player.soundEffect.convolution.fileName'] ?? '',
  playbackRate: appSetting['player.soundEffect.pitchShifter.playbackRate'] ?? 1,
})

/** 把音效状态转换成可直接写入的设置对象 */
export const effectStateToPayload = (state: SoundEffectState): Record<string, any> => {
  const payload: Record<string, any> = {
    'player.soundEffect.hifi': state.hifi,
    'player.soundEffect.reverb': state.reverb,
    'player.soundEffect.surroundStrength': state.surroundStrength,
    'player.soundEffect.bass': state.bass,
    'player.soundEffect.dynamic': state.dynamic,
    'player.soundEffect.balance': state.balance,
    'player.soundEffect.reverbMode': state.reverbMode,
    'player.soundEffect.convolution.fileName': state.convolutionFileName,
    'player.soundEffect.pitchShifter.playbackRate': state.playbackRate,
  }
  freqs.forEach((item, index) => {
    payload[`player.soundEffect.biquadFilter.hz${item}`] = state.eq[index] ?? 0
  })
  return payload
}

/** 取某条内置预设的 10 段增益 */
export const eqGains = (label: string): number[] => {
  const preset = eqPresets.find(item => item.label === label)
  if (!preset) return freqs.map(() => 0)
  return freqs.map(item => Number((preset as unknown as Record<string, number>)[`hz${item}`] ?? 0))
}

/** 环绕模式对应的默认混响强度（0~100） */
export const modeReverbAmount = (mode: Exclude<SurroundMode, 'off'>): number =>
  Math.round(surroundModes[mode].wet / 0.8 * 100)

// ============================================================
//  精选音效（一键组合预设，对应参考图的彩色磁贴网格）
// ============================================================

export interface SoundPreset {
  key: string
  label: string
  icon: string
  colors: string
  /** 磁贴背景图（AI 生成，256px JPEG） */
  image: string
  state: SoundEffectState
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const tileImg = (name: string): string => require(`@renderer/assets/images/sound-effect/${name}.jpg`) as string

const makeState = (patch: Partial<SoundEffectState>): SoundEffectState => Object.assign(defaultEffectState(), patch)

export const soundPresets: SoundPreset[] = [
  {
    key: 'off',
    label: '关闭',
    icon: '',
    colors: 'linear-gradient(135deg, #f07b7b, #cf3f3f)',
    image: tileImg('off'),
    state: makeState({}),
  },
  {
    key: 'smart',
    label: '智能音效',
    icon: 'crown',
    colors: 'linear-gradient(135deg, #8f7bd8, #5b3fd6)',
    image: tileImg('smart'),
    state: makeState({ bass: 35, dynamic: 45, hifi: 25 }),
  },
  {
    key: 'dj',
    label: '超嗨DJ',
    icon: 'lightning-bolt',
    colors: 'linear-gradient(135deg, #4fa3e3, #2a5fb0)',
    image: tileImg('dj'),
    state: makeState({ bass: 80, dynamic: 70, surroundStrength: 35 }),
  },
  {
    key: 'panorama',
    label: '全景环绕',
    icon: 'compass',
    colors: 'linear-gradient(135deg, #6ee7a8, #1f9d6b)',
    image: tileImg('panorama'),
    state: makeState({ reverbMode: 'large', reverb: modeReverbAmount('large') }),
  },
  {
    key: 'surround51',
    label: '5.1 立体声',
    icon: 'headphones',
    colors: 'linear-gradient(135deg, #7f8fd8, #3f4fb0)',
    image: tileImg('surround51'),
    state: makeState({
      reverbMode: 'medium',
      reverb: modeReverbAmount('medium'),
      surroundStrength: 60,
    }),
  },
  {
    key: 'bass',
    label: '超重低音',
    icon: 'volume-low-outline',
    colors: 'linear-gradient(135deg, #4fd3c4, #1f8f8a)',
    image: tileImg('bass'),
    state: makeState({ bass: 80 }),
  },
  {
    key: 'vocal',
    label: '清澈人声',
    icon: 'music',
    colors: 'linear-gradient(135deg, #5ee7df, #3d8fd8)',
    image: tileImg('vocal'),
    state: makeState({ eq: eqGains('人声') }),
  },
  {
    key: 'live',
    label: '现场律动',
    icon: 'equalizer',
    colors: 'linear-gradient(135deg, #3fd0c9, #1a7f8c)',
    image: tileImg('live'),
    state: makeState({
      reverbMode: 'medium',
      reverb: modeReverbAmount('medium'),
      dynamic: 55,
    }),
  },
  {
    key: 'outdoor',
    label: '外放环绕',
    icon: 'volume-high-outline',
    colors: 'linear-gradient(135deg, #c8a8f0, #8a5bd6)',
    image: tileImg('outdoor'),
    state: makeState({ hifi: 60, surroundStrength: 50 }),
  },
  {
    key: 'chinese',
    label: '中国风',
    icon: 'compass',
    colors: 'linear-gradient(135deg, #e08f8f, #a8443f)',
    image: tileImg('chinese'),
    state: makeState({
      eq: eqGains('古典'),
      reverbMode: 'small',
      reverb: modeReverbAmount('small'),
    }),
  },
]

/** 当前设置命中的精选音效（未命中返回空字符串 = 自定义） */
export const matchSoundPreset = (current: SoundEffectState): string => {
  const equal = (a: SoundEffectState) =>
    JSON.stringify(a.eq) === JSON.stringify(current.eq) &&
    a.hifi === current.hifi &&
    a.reverb === current.reverb &&
    a.surroundStrength === current.surroundStrength &&
    a.bass === current.bass &&
    a.dynamic === current.dynamic &&
    a.balance === current.balance &&
    a.reverbMode === current.reverbMode &&
    (a.convolutionFileName || '') === (current.convolutionFileName || '') &&
    Math.abs(a.playbackRate - current.playbackRate) < 0.001
  const hit = soundPresets.find(item => equal(item.state))
  return hit?.key ?? ''
}

// ============================================================
//  均衡器网格（参考图：浅灰按钮网格，选中 = 绿框 + 绿勾）
// ============================================================

export interface EqTile {
  key: string
  label: string
  gains: number[]
}

/** 均衡器预设格（最后一项「自定义」仅作状态提示，不可点击） */
export const eqTiles: EqTile[] = [
  ...eqPresets.map(item => ({
    key: item.label,
    label: item.label,
    gains: eqGains(item.label),
  })),
  { key: 'custom', label: '自定义', gains: [] },
]

/** 当前 EQ 命中的格（未命中 = 自定义） */
export const matchEqTile = (eq: number[]): string => {
  const hit = eqTiles.find(item => item.gains.length > 0 && JSON.stringify(item.gains) === JSON.stringify(eq))
  return hit?.key ?? 'custom'
}

// ============================================================
//  环绕混响模式磁贴
// ============================================================

export const surroundTiles: Array<{ key: SurroundMode, label: string, icon: string, colors: string }> = [
  { key: 'off', label: '关闭', icon: '', colors: 'linear-gradient(135deg, #9aa4b2, #66717f)' },
  { key: 'small', label: '小房间', icon: 'home-outline', colors: 'linear-gradient(135deg, #7fd8ff, #3d8fd8)' },
  { key: 'medium', label: '中厅堂', icon: 'compass', colors: 'linear-gradient(135deg, #6ee7a8, #1f9d6b)' },
  { key: 'large', label: '大教堂', icon: 'crown', colors: 'linear-gradient(135deg, #a17bf5, #5b3fd6)' },
]

/** 面板底部 6 个连续音效参数的定义（顺序与参考图一致） */
export const effectSliders = [
  { key: 'hifi', label: '高保真度', min: 0, max: 100, suffix: '' },
  { key: 'reverb', label: '混响强度', min: 0, max: 100, suffix: '' },
  { key: 'surroundStrength', label: '环绕强度', min: 0, max: 100, suffix: '' },
  { key: 'bass', label: '超重低音', min: 0, max: 100, suffix: '' },
  { key: 'dynamic', label: '动态推进', min: 0, max: 100, suffix: '' },
  { key: 'balance', label: '声道平衡', min: -50, max: 50, suffix: '' },
] as const
