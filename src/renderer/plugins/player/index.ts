import {
  EQ_Q,
  eqPresets,
  BASS_BOOST_FREQ,
  BASS_MAX_GAIN,
  HIFI_FREQ,
  HIFI_MAX_GAIN,
  REVERB_MAX_WET,
  SURROUND_MAX_SOUND_R,
  dynamicCompressorParams,
  generateSurroundIR,
  LOUDNESS_ATTACK,
  LOUDNESS_RELEASE,
} from './audioEffects'
import type { SurroundMode } from './audioEffects'

interface HTMLAudioElementChrome extends HTMLAudioElement {
  setSinkId: (id: string) => Promise<void>
}
let audio: HTMLAudioElementChrome | null = null
let audioContext: AudioContext
let mediaSource: MediaElementAudioSourceNode
let analyser: AnalyserNode
// https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext
// https://benzleung.gitbooks.io/web-audio-api-mini-guide/content/chapter5-1.html
export const freqs = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const
type Freqs = (typeof freqs)[number]
let biquads: Map<`hz${Freqs}`, BiquadFilterNode>
// 均衡器预设：改用 CeruMusic（澜音）的 8 条预设（含中文显示名 label）
export const freqsPreset = eqPresets
export const convolutions = [
  { name: 'telephone', mainGain: 0.0, sendGain: 3.0, source: 'filter-telephone.wav' }, // 电话
  { name: 's2_r4_bd', mainGain: 1.8, sendGain: 0.9, source: 's2_r4_bd.wav' }, // 教堂
  { name: 'bright_hall', mainGain: 0.8, sendGain: 2.4, source: 'bright-hall.wav' },
  { name: 'cinema_diningroom', mainGain: 0.6, sendGain: 2.3, source: 'cinema-diningroom.wav' },
  { name: 'dining_living_true_stereo', mainGain: 0.6, sendGain: 1.8, source: 'dining-living-true-stereo.wav' },
  { name: 'living_bedroom_leveled', mainGain: 0.6, sendGain: 2.1, source: 'living-bedroom-leveled.wav' },
  { name: 'spreader50_65ms', mainGain: 1, sendGain: 2.5, source: 'spreader50-65ms.wav' },
  // { name: 'spreader25_125ms', mainGain: 1, sendGain: 2.5, source: 'spreader25-125ms.wav' },
  // { name: 'backslap', mainGain: 1.8, sendGain: 0.8, source: 'backslap1.wav' },
  { name: 's3_r1_bd', mainGain: 1.8, sendGain: 0.8, source: 's3_r1_bd.wav' },
  { name: 'matrix_1', mainGain: 1.5, sendGain: 0.9, source: 'matrix-reverb1.wav' },
  { name: 'matrix_2', mainGain: 1.3, sendGain: 1, source: 'matrix-reverb2.wav' },
  { name: 'cardiod_35_10_spread', mainGain: 1.8, sendGain: 0.6, source: 'cardiod-35-10-spread.wav' },
  { name: 'tim_omni_35_10_magnetic', mainGain: 1, sendGain: 0.2, source: 'tim-omni-35-10-magnetic.wav' },
  // { name: 'spatialized', mainGain: 1.8, sendGain: 0.8, source: 'spatialized8.wav' },
  // { name: 'zing_long_stereo', mainGain: 0.8, sendGain: 1.8, source: 'zing-long-stereo.wav' },
  { name: 'feedback_spring', mainGain: 1.8, sendGain: 0.8, source: 'feedback-spring.wav' },
  // { name: 'tim_omni_rear_blend', mainGain: 1.8, sendGain: 0.8, source: 'tim-omni-rear-blend.wav' },
] as const
// 半音
// export const semitones = [-1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] as const

let convolver: ConvolverNode
let convolverSourceGainNode: GainNode
let convolverOutputGainNode: GainNode
let convolverDynamicsCompressor: DynamicsCompressorNode
let gainNode: GainNode
let panner: PannerNode
// 高级音效节点（移植自 CeruMusic / 澜音）
let bassBoostNode: BiquadFilterNode
let hifiNode: BiquadFilterNode
let balanceNode: StereoPannerNode
let loudnessCompressorNode: DynamicsCompressorNode
let loudnessMakeupNode: GainNode
let pitchShifterNode: AudioWorkletNode
let pitchShifterNodePitchFactor: AudioParam
let pitchShifterNodeLoadStatus: 'none' | 'loading' | 'unconnect' | 'connected' = 'none'
let pitchShifterNodeTempValue = 1
let defaultChannelCount = 2
export const soundR = 0.5


export const createAudio = () => {
  if (audio) return
  audio = new window.Audio() as HTMLAudioElementChrome
  audio.controls = false
  audio.autoplay = true
  audio.preload = 'auto'
  audio.crossOrigin = 'anonymous'

  // https://developer.chrome.com/blog/autoplay
  audio.addEventListener('playing', () => {
    if (audioContext?.state == 'suspended') {
      void audioContext.resume().catch((err) => {
        console.error('Resume audio context failed:', err)
        throw err
      })
    }
  })
}

const initAnalyser = () => {
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
}

const initBiquadFilter = () => {
  biquads = new Map()
  let i

  for (const item of freqs) {
    const filter = audioContext.createBiquadFilter()
    biquads.set(`hz${item}`, filter)
    filter.type = 'peaking'
    filter.frequency.value = item
    // Q 值取自 CeruMusic（澜音）：1.0（原版为 1.4）
    filter.Q.value = EQ_Q
    filter.gain.value = 0
  }

  for (i = 1; i < freqs.length; i++) {
    (biquads.get(`hz${freqs[i - 1]}`)!).connect(biquads.get(`hz${freqs[i]}`)!)
  }
}

const initConvolver = () => {
  convolverSourceGainNode = audioContext.createGain()
  convolverOutputGainNode = audioContext.createGain()
  convolverDynamicsCompressor = audioContext.createDynamicsCompressor()
  // 混响链的压缩器默认设置为「透明」（threshold 0dB / ratio 1），
  // 只有混响真正出声时才由 setSurroundMode/setConvolver 收紧，
  // 避免干声在没有任何音效时被动态压缩（听感上的"加工感"来源之一）。
  convolverDynamicsCompressor.threshold.value = 0
  convolverDynamicsCompressor.knee.value = 30
  convolverDynamicsCompressor.ratio.value = 1
  convolverDynamicsCompressor.attack.value = 0.003
  convolverDynamicsCompressor.release.value = 0.25
  convolver = audioContext.createConvolver()
  convolver.connect(convolverOutputGainNode)
  convolverSourceGainNode.connect(convolverDynamicsCompressor)
  convolverOutputGainNode.connect(convolverDynamicsCompressor)
}

const initPanner = () => {
  panner = audioContext.createPanner()
}

const initGain = () => {
  gainNode = audioContext.createGain()
}

// ===== 高级音效节点（移植自 CeruMusic / 澜音）：低音增强 / 声道平衡 / 响度均衡 =====
// 关闭时全部处于「参数恒等」状态；当所有音效都关闭时，整条音效链会被物理旁路
// （见 setAudioGraphBypass），因此默认状态下不会有任何听感染色。
const initAudioEffects = () => {
  // 低音增强：lowshelf 200Hz，增益 0 ~ +12dB（面板「超重低音」）
  bassBoostNode = audioContext.createBiquadFilter()
  bassBoostNode.type = 'lowshelf'
  bassBoostNode.frequency.value = BASS_BOOST_FREQ
  bassBoostNode.gain.value = 0

  // 高保真度：highshelf 8kHz，增益 0 ~ +9dB（面板「高保真度」）
  hifiNode = audioContext.createBiquadFilter()
  hifiNode.type = 'highshelf'
  hifiNode.frequency.value = HIFI_FREQ
  hifiNode.gain.value = 0

  // 声道平衡：StereoPanner（pan = 0 对立体声输入为恒等）
  balanceNode = audioContext.createStereoPanner()
  balanceNode.pan.value = 0

  // 动态推进：压缩器 + makeup gain（默认参数恒等 = 透明）
  const transparentParams = dynamicCompressorParams(0)
  loudnessCompressorNode = audioContext.createDynamicsCompressor()
  loudnessCompressorNode.threshold.value = transparentParams.threshold
  loudnessCompressorNode.ratio.value = transparentParams.ratio
  loudnessCompressorNode.knee.value = transparentParams.knee
  loudnessCompressorNode.attack.value = LOUDNESS_ATTACK
  loudnessCompressorNode.release.value = LOUDNESS_RELEASE

  loudnessMakeupNode = audioContext.createGain()
  loudnessMakeupNode.gain.value = transparentParams.makeup
}

/** 平滑设置 AudioParam，避免开关音效时的爆音 */
const setAudioParam = (param: AudioParam, value: number, timeConstant = 0.05) => {
  try {
    param.setTargetAtTime(value, audioContext.currentTime, timeConstant)
  } catch {
    param.value = value
  }
}

// ===== 零音效物理旁路 =====
// 所有音效（均衡器 / 低音增强 / 混响环绕 / 声道平衡 / 响度均衡 / 3D 环绕 / 变调）
// 都关闭时，让信号直接从 analyser 进 gain，完全跳过中间所有处理节点。
// 原因：即使各节点参数为 0dB / 1.0（数学上恒等），IIR 滤波器的相位响应、
// Panner 的立体声下混与重采样等仍会累积成可听的染色，
// 表现为「没开任何音效，却像叠加了一层音效」。只有物理旁路才能保证素音干净。
let graphBypassed = false

const routeAnalyserOutput = () => {
  if (!analyser) return
  analyser.disconnect()
  if (graphBypassed) analyser.connect(gainNode)
  else analyser.connect(biquads.get(`hz${freqs[0]}`)!)
}

export const setAudioGraphBypass = (bypass: boolean) => {
  initAdvancedAudioFeatures()
  if (bypass === graphBypassed) return
  graphBypassed = bypass
  if (isConnected) routeAnalyserOutput()
}

export const isAudioGraphBypassed = () => graphBypassed

const initAdvancedAudioFeatures = () => {
  if (audioContext) return
  if (!audio) throw new Error('audio not defined')
  audioContext = new window.AudioContext({ latencyHint: 'playback' })
  defaultChannelCount = audioContext.destination.channelCount

  initAnalyser()
  initBiquadFilter()
  initConvolver()
  initPanner()
  initGain()
  initAudioEffects()
  // 音频链（处理顺序移植自 CeruMusic，末端保留 lx-music 原有的 3D 环绕与变调）：
  // source -> analyser -> biquadFilter(EQ×10) -> bassBoost
  //        -> [(convolverSource & convolver) -> convolverDynamicsCompressor]
  //        -> balance(StereoPanner) -> loudness(Compressor -> Makeup)
  //        -> panner -> gain -> destination
  mediaSource = audioContext.createMediaElementSource(audio)
  mediaSource.connect(analyser)
  analyser.connect(biquads.get(`hz${freqs[0]}`)!)
  const lastBiquadFilter = (biquads.get(`hz${freqs.at(-1)!}`)!)
  lastBiquadFilter.connect(bassBoostNode)
  bassBoostNode.connect(hifiNode)
  hifiNode.connect(convolverSourceGainNode)
  hifiNode.connect(convolver)
  convolverDynamicsCompressor.connect(balanceNode)
  balanceNode.connect(loudnessCompressorNode)
  loudnessCompressorNode.connect(loudnessMakeupNode)
  loudnessMakeupNode.connect(panner)
  panner.connect(gainNode)
  gainNode.connect(audioContext.destination)

  // 音频输出设备改变时刷新 audio node 连接
  window.app_event.on('playerDeviceChanged', handleMediaListChange)

  // audio.addEventListener('playing', connectAudioNode)
  // audio.addEventListener('pause', disconnectAudioNode)
  // audio.addEventListener('waiting', disconnectAudioNode)
  // audio.addEventListener('emptied', disconnectAudioNode)
  // if (!audio.paused) connectAudioNode()
}

const handleMediaListChange = () => {
  mediaSource.disconnect()
  mediaSource.connect(analyser)
}

// let isConnected = true
// const connectAudioNode = () => {
//   if (isConnected) return
//   console.log('connect Node')
//   mediaSource.connect(analyser)
//   isConnected = true
//   if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
//     disconnectPitchShifterNode()
//   }
// }

// const disconnectAudioNode = () => {
//   if (!isConnected) return
//   console.log('disconnect Node')
//   mediaSource.disconnect()
//   isConnected = false
//   if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
//     disconnectPitchShifterNode()
//   }
// }

export const getAudioContext = () => {
  initAdvancedAudioFeatures()
  return audioContext
}

let unsubMediaListChangeEvent: (() => void) | null = null
export const setMaxOutputChannelCount = (enable: boolean) => {
  if (enable) {
    initAdvancedAudioFeatures()
    audioContext.destination.channelCountMode = 'max'
    audioContext.destination.channelCount = audioContext.destination.maxChannelCount
    // navigator.mediaDevices.addEventListener('devicechange', handleMediaListChange)
    if (!unsubMediaListChangeEvent) {
      let handleMediaListChange = () => {
        setMaxOutputChannelCount(true)
      }
      window.app_event.on('playerDeviceChanged', handleMediaListChange)
      unsubMediaListChangeEvent = () => {
        window.app_event.off('playerDeviceChanged', handleMediaListChange)
        unsubMediaListChangeEvent = null
      }
    }
  } else {
    unsubMediaListChangeEvent?.()
    if (audioContext && audioContext.destination.channelCountMode != 'explicit') {
      audioContext.destination.channelCount = defaultChannelCount
      // audioContext.destination.channelInterpretation
      audioContext.destination.channelCountMode = 'explicit'
    }
  }
}

export const getAnalyser = (): AnalyserNode | null => {
  initAdvancedAudioFeatures()
  return analyser
}

export const getBiquadFilter = () => {
  initAdvancedAudioFeatures()
  return biquads
}

// let isConvolverConnected = false
export const setConvolver = (buffer: AudioBuffer | null, mainGain: number, sendGain: number) => {
  initAdvancedAudioFeatures()
  convolver.buffer = buffer
  // console.log(mainGain, sendGain)
  if (buffer) {
    convolverSourceGainNode.gain.value = mainGain
    convolverOutputGainNode.gain.value = sendGain
    // 混响出声时才启用压缩器，抑制混响尾巴的峰值
    setAudioParam(convolverDynamicsCompressor.threshold, -24)
    setAudioParam(convolverDynamicsCompressor.ratio, 12)
  } else {
    convolverSourceGainNode.gain.value = 1
    convolverOutputGainNode.gain.value = 0
    // 无混响时保持透明，避免干声被动态压缩
    setAudioParam(convolverDynamicsCompressor.threshold, 0)
    setAudioParam(convolverDynamicsCompressor.ratio, 1)
  }
}

export const setConvolverMainGain = (gain: number) => {
  if (convolverSourceGainNode.gain.value == gain) return
  // console.log(gain)
  convolverSourceGainNode.gain.value = gain
}

// ============================================================
//  均衡器 / 高级音效控制（移植自 CeruMusic / 澜音）
// ============================================================

/** 直接设置某个 EQ 频段增益（dB，范围 ±12） */
export const setEqBandGain = (index: number, gain: number) => {
  initAdvancedAudioFeatures()
  const node = biquads.get(`hz${freqs[index]}`)
  if (node) setAudioParam(node.gain, gain)
}

/** 超重低音：0~100 → lowshelf 200Hz 增益 0~+12dB */
export const setBassAmount = (amount: number) => {
  initAdvancedAudioFeatures()
  setAudioParam(bassBoostNode.gain, Math.max(0, Math.min(100, amount)) / 100 * BASS_MAX_GAIN)
}

/** 高保真度：0~100 → highshelf 8kHz 增益 0~+9dB */
export const setHifiAmount = (amount: number) => {
  initAdvancedAudioFeatures()
  setAudioParam(hifiNode.gain, Math.max(0, Math.min(100, amount)) / 100 * HIFI_MAX_GAIN)
}

/** 混响强度：0~100 → 卷积混响湿声 0~0.8（干声始终直通） */
export const setReverbAmount = (amount: number) => {
  initAdvancedAudioFeatures()
  setAudioParam(convolverOutputGainNode.gain, Math.max(0, Math.min(100, amount)) / 100 * REVERB_MAX_WET, 0.2)
}

/** 环绕强度：0~100 → 3D 环绕旋转半径（0 = 关闭并复位到正中） */
export const setSurroundStrength = (amount: number) => {
  initAdvancedAudioFeatures()
  const value = Math.max(0, Math.min(100, amount))
  setPannerSoundR(value / 100 * SURROUND_MAX_SOUND_R)
  if (value > 0) startPanner()
  else stopPanner()
}

/** 声道平衡：-1（全左）~ 1（全右），0 = 居中 */
export const setBalance = (value: number) => {
  initAdvancedAudioFeatures()
  setAudioParam(balanceNode.pan, Math.max(-1, Math.min(1, value)))
}

/**
 * 环绕混响模式（CeruMusic）：off / small / medium / large
 * 使用运行时生成的指数衰减噪声 IR，直接复用 lx-music 的卷积混响节点，
 * 因此不会额外引入第二套混响链路。
 */
export const setSurroundMode = (mode: SurroundMode) => {
  initAdvancedAudioFeatures()
  if (mode === 'off') {
    convolver.buffer = null
    setAudioParam(convolverSourceGainNode.gain, 1)
    setAudioParam(convolverOutputGainNode.gain, 0, 0.1)
    // 无混响时把混响链压缩器恢复透明
    setAudioParam(convolverDynamicsCompressor.threshold, 0)
    setAudioParam(convolverDynamicsCompressor.ratio, 1)
    return
  }
  convolver.buffer = generateSurroundIR(audioContext, mode)
  setAudioParam(convolverSourceGainNode.gain, 1)
  // 湿声大小由「混响强度」统一控制（setReverbAmount），避免两处互相覆盖
  // 混响真正出声时才启用压缩器，抑制混响尾巴的峰值
  setAudioParam(convolverDynamicsCompressor.threshold, -24)
  setAudioParam(convolverDynamicsCompressor.ratio, 12)
}

/**
 * 动态推进：0~100 → 压缩器强度（把动态范围过大的曲目压平，并用 makeup gain 补回平均能量）。
 * 0 时参数恢复恒等（透明），对听感无任何影响。
 */
export const setDynamicAmount = (amount: number) => {
  initAdvancedAudioFeatures()
  const p = dynamicCompressorParams(amount)
  setAudioParam(loudnessCompressorNode.threshold, p.threshold)
  setAudioParam(loudnessCompressorNode.ratio, p.ratio)
  setAudioParam(loudnessCompressorNode.knee, p.knee)
  setAudioParam(loudnessMakeupNode.gain, p.makeup)
}

let pannerInfo = {
  x: 0,
  y: 0,
  z: 0,
  soundR: 0.5,
  rad: 0,
  speed: 1,
  intv: null as NodeJS.Timeout | null,
}
const setPannerXYZ = (nx: number, ny: number, nz: number) => {
  pannerInfo.x = nx
  pannerInfo.y = ny
  pannerInfo.z = nz
  // console.log(pannerInfo)
  panner.positionX.value = nx * pannerInfo.soundR
  panner.positionY.value = ny * pannerInfo.soundR
  panner.positionZ.value = nz * pannerInfo.soundR
}
export const setPannerSoundR = (r: number) => {
  pannerInfo.soundR = r
}

export const setPannerSpeed = (speed: number) => {
  pannerInfo.speed = speed
  if (pannerInfo.intv) startPanner()
}
export const stopPanner = () => {
  if (pannerInfo.intv) {
    clearInterval(pannerInfo.intv)
    pannerInfo.intv = null
    pannerInfo.rad = 0
  }
  panner.positionX.value = 0
  panner.positionY.value = 0
  panner.positionZ.value = 0
}

export const startPanner = () => {
  initAdvancedAudioFeatures()
  if (pannerInfo.intv) {
    clearInterval(pannerInfo.intv)
    pannerInfo.intv = null
    pannerInfo.rad = 0
  }
  pannerInfo.intv = setInterval(() => {
    pannerInfo.rad += 1
    if (pannerInfo.rad > 360) pannerInfo.rad -= 360
    setPannerXYZ(Math.sin(pannerInfo.rad * Math.PI / 180), Math.cos(pannerInfo.rad * Math.PI / 180), Math.cos(pannerInfo.rad * Math.PI / 180))
  }, pannerInfo.speed * 10)
}

let isConnected = true
const connectNode = () => {
  if (isConnected) return
  console.log('connect Node')
  routeAnalyserOutput()
  isConnected = true
  if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
    disconnectPitchShifterNode()
  }
}
const disconnectNode = () => {
  if (!isConnected) return
  console.log('disconnect Node')
  analyser?.disconnect()
  isConnected = false
  if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
    disconnectPitchShifterNode()
  }
}
const connectPitchShifterNode = () => {
  console.log('connect Pitch Shifter Node')
  audio!.addEventListener('playing', connectNode)
  audio!.addEventListener('pause', disconnectNode)
  audio!.addEventListener('waiting', disconnectNode)
  audio!.addEventListener('emptied', disconnectNode)
  if (audio!.paused) disconnectNode()

  // 变调节点串在 EQ / 低音增强 / 高保真度之后、混响之前
  hifiNode.disconnect()
  hifiNode.connect(pitchShifterNode)

  pitchShifterNode.connect(convolver)
  pitchShifterNode.connect(convolverSourceGainNode)
  // convolverDynamicsCompressor.disconnect(panner)
  // convolverDynamicsCompressor.connect(pitchShifterNode)
  // pitchShifterNode.connect(panner)
  pitchShifterNodeLoadStatus = 'connected'
  pitchShifterNodePitchFactor.value = pitchShifterNodeTempValue
}
const disconnectPitchShifterNode = () => {
  console.log('disconnect Pitch Shifter Node')
  hifiNode.disconnect()
  hifiNode.connect(convolver)
  hifiNode.connect(convolverSourceGainNode)
  pitchShifterNodeLoadStatus = 'unconnect'

  audio!.removeEventListener('playing', connectNode)
  audio!.removeEventListener('pause', disconnectNode)
  audio!.removeEventListener('waiting', disconnectNode)
  audio!.removeEventListener('emptied', disconnectNode)
  connectNode()
}
const loadPitchShifterNode = () => {
  pitchShifterNodeLoadStatus = 'loading'
  initAdvancedAudioFeatures()
  // source -> analyser -> biquadFilter -> audioWorklet(pitch shifter) -> [(convolver & convolverSource)->convolverDynamicsCompressor] -> panner -> gain
  void audioContext.audioWorklet.addModule(new URL(
    /* webpackChunkName: 'pitch_shifter.audioWorklet' */
    './pitch-shifter/phase-vocoder.js',
    import.meta.url,
  )).then(() => {
    console.log('pitch shifter audio worklet loaded')
    // https://github.com/olvb/phaze/issues/26#issuecomment-1574629971
    pitchShifterNode = new AudioWorkletNode(audioContext, 'phase-vocoder-processor', { outputChannelCount: [2] })
    let pitchFactorParam = pitchShifterNode.parameters.get('pitchFactor')
    if (!pitchFactorParam) return
    pitchShifterNodePitchFactor = pitchFactorParam
    pitchShifterNodeLoadStatus = 'unconnect'
    if (pitchShifterNodeTempValue == 1) return

    connectPitchShifterNode()
  })
}

export const setPitchShifter = (val: number) => {
  // console.log('setPitchShifter', val)
  pitchShifterNodeTempValue = val
  switch (pitchShifterNodeLoadStatus) {
    case 'loading':
      break
    case 'none':
      loadPitchShifterNode()
      break
    case 'connected':
      // a: 1 = 半音
      // value = 2 ** (a / 12)
      pitchShifterNodePitchFactor.value = val
      break
    case 'unconnect':
      connectPitchShifterNode()
      break
  }
}

export const hasInitedAdvancedAudioFeatures = (): boolean => audioContext != null

export const setResource = (src: string) => {
  if (audio) audio.src = src
}

export const setPlay = () => {
  void audio?.play()
}

export const setPause = () => {
  audio?.pause()
}

export const setStop = () => {
  if (audio) {
    audio.src = ''
    audio.removeAttribute('src')
  }
}

export const isEmpty = (): boolean => !audio?.src

export const setLoopPlay = (isLoop: boolean) => {
  if (audio) audio.loop = isLoop
}

export const getPlaybackRate = (): number => {
  return audio?.defaultPlaybackRate ?? 1
}

export const setPlaybackRate = (rate: number) => {
  if (!audio) return
  audio.defaultPlaybackRate = rate
  audio.playbackRate = rate
}

export const setPreservesPitch = (preservesPitch: boolean) => {
  if (!audio) return
  audio.preservesPitch = preservesPitch
}

export const getMute = (): boolean => {
  return audio?.muted ?? false
}

export const setMute = (isMute: boolean) => {
  if (audio) audio.muted = isMute
}

export const getCurrentTime = () => {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return audio?.currentTime || 0
}

export const setCurrentTime = (time: number) => {
  if (audio) audio.currentTime = time
}

export const setMediaDeviceId = async(mediaDeviceId: string): Promise<void> => {
  if (!audio) return
  // 音效链路建立后音频由 AudioContext 输出到设备，因此需要同时切换上下文的输出设备，
  // 否则自定义输出设备不生效（移植自 CeruMusic 的处理方式）
  if (audioContext && typeof (audioContext as unknown as { setSinkId?: unknown }).setSinkId == 'function') {
    await (audioContext as unknown as { setSinkId: (id: string) => Promise<void> })
      .setSinkId(mediaDeviceId)
      .catch((err: unknown) => {
        console.warn('set AudioContext sink id failed:', err)
      })
  }
  return audio.setSinkId(mediaDeviceId)
}

export const setVolume = (volume: number) => {
  if (audio) audio.volume = volume
}

export const getDuration = () => {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return audio?.duration || 0
}

// export const getPlaybackRate = () => {
//   return audio?.playbackRate ?? 1
// }

type Noop = () => void

export const onPlaying = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('playing', callback)
  return () => {
    audio?.removeEventListener('playing', callback)
  }
}

export const onPause = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio?.addEventListener('pause', callback)
  return () => {
    audio?.removeEventListener('pause', callback)
  }
}

export const onEnded = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('ended', callback)
  return () => {
    audio?.removeEventListener('ended', callback)
  }
}

export const onError = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('error', callback)
  return () => {
    audio?.removeEventListener('error', callback)
  }
}

export const onLoadeddata = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('loadeddata', callback)
  return () => {
    audio?.removeEventListener('loadeddata', callback)
  }
}

export const onLoadstart = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('loadstart', callback)
  return () => {
    audio?.removeEventListener('loadstart', callback)
  }
}

export const onCanplay = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('canplay', callback)
  return () => {
    audio?.removeEventListener('canplay', callback)
  }
}

export const onEmptied = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('emptied', callback)
  return () => {
    audio?.removeEventListener('emptied', callback)
  }
}

export const onTimeupdate = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('timeupdate', callback)
  return () => {
    audio?.removeEventListener('timeupdate', callback)
  }
}

// 缓冲中
export const onWaiting = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('waiting', callback)
  return () => {
    audio?.removeEventListener('waiting', callback)
  }
}

// 可见性改变
export const onVisibilityChange = (callback: Noop) => {
  document.addEventListener('visibilitychange', callback)
  return () => {
    document.removeEventListener('visibilitychange', callback)
  }
}


export const getErrorCode = () => {
  return audio?.error?.code
}

// 音效预设与参数范围对外导出（供音效面板使用）
export {
  eqPresets,
  EQ_GAIN_MIN,
  EQ_GAIN_MAX,
  BASS_MAX_GAIN,
  HIFI_MAX_GAIN,
  REVERB_MAX_WET,
  SURROUND_MAX_SOUND_R,
  surroundModes,
} from './audioEffects'
