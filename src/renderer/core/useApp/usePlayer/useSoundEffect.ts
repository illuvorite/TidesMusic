import { watch } from '@common/utils/vueTools'
import {
  freqs,
  getAudioContext,
  getBiquadFilter,
  resetEqToLegacy,
  setConvolver,
  setPannerSoundR,
  setPannerSpeed,
  setPannerEnable,
  startPanner,
  stopPanner,
  setConvolverMainGain,
  setConvolverSendGain,
  setPitchShifter,
  reverbWetFromIntensity,
  surroundRadiusFromIntensity,
} from '@renderer/plugins/player'

import { appSetting } from '@renderer/store/setting'
import { isSoundEffectEnabled, syncAudioChain } from '@renderer/plugins/player/galaxy/bridge'

const cache = new Map<string, AudioBuffer>()
const loadBuffer = async(name: string) => new Promise<AudioBuffer>((resolve, reject) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('@renderer/assets/medias/filters/' + name) as string
  if (cache.has(path)) {
    resolve(cache.get(path)!)
    return
  }
  // Load buffer asynchronously
  let request = new XMLHttpRequest()
  request.open('GET', path, true)
  request.responseType = 'arraybuffer'

  request.onload = function() {
    // Asynchronously decode the audio file data
    void getAudioContext().decodeAudioData(request.response, (buffer) => {
      if (!buffer) {
        reject(new Error('error decoding file data: ' + path))
        return
      }
      cache.set(path, buffer)
      resolve(buffer)
    },
    function(error) {
      reject(error)
      console.error('decodeAudioData error', error)
    })
  }

  request.onerror = function() {
    reject(new Error('XHR error'))
  }

  request.send()
})

/**
 * 十段全平。
 * 0dB 的 peaking 滤波器传递函数恒等于 1（系数退化为 b === a），是真的透明，
 * 所以「写 0」和「物理摘掉」在响应上等价 —— 不需要为这一级做节点改接。
 */
const EQ_FLAT = freqs.map(() => 0)

/** 按设置加载/清除卷积混响。fileName 为空时会把 buffer 清掉，压缩器随之退出链路 */
const applyReverb = () => {
  const fileName = appSetting['player.soundEffect.convolution.fileName']
  if (!fileName) {
    setConvolver(null, 1, 0)
    return
  }
  void loadBuffer(fileName).then((buffer) => {
    setConvolver(buffer, appSetting['player.soundEffect.convolution.mainGain'] / 10, reverbWetFromIntensity(appSetting['player.soundEffect.convolution.sendGain']))
  }).catch(err => {
    // 资源缺失/损坏时安全降级为干声，避免混响无声且无提示
    console.error('load reverb IR failed:', err)
    setConvolver(null, 1, 0)
  })
}

export default () => {
  // 上一次真正下发过的环绕开关。用它做「变了才动」的判断：
  // 结构类的任何变更都会进 applySoundEffects，若无条件 startPanner()
  // 会把定时器重启、rad 归零，环绕相位会明显跳一下。
  let appliedPannerEnabled = false
  // 上一次真正加载过的 IR 文件名。混响 buffer 只在**选择变化**时重设，
  // 否则每次无关的结构变更都会重新赋值 convolver.buffer，可能带出咔哒声。
  let appliedReverbFile: string | null = null

  /**
   * 整条音效链物理旁路 —— 素音直出。
   *
   * 对应总开关关闭（`player.soundEffect.enable === false`）：**只还原链路状态，不动任何设置**，
   * 所以关掉再打开时，十段 EQ / 增强滑条 / 卷积选择全部原样回来。
   *
   * ⚠️ 顺序有讲究：`syncAudioChain()` 在「从接管 EQ 切到不接管」时会把**用户手调的那条十段**
   * 写回去（见 bridge.ts 的 prevManagesEq 逻辑），所以全平必须排在它之后，否则会被它覆盖。
   */
  const bypassSoundEffects = () => {
    // 1) 卸载银河引擎（bridge 侧的闸门已让 resolveAudioChain 返回 null）
    syncAudioChain()
    // 2) 十段全平。必须在 syncAudioChain 之后
    resetEqToLegacy(EQ_FLAT)
    // 3) 清空卷积：applyCoreRouting() 会把卷积器与那个压限器一起撤出链路
    setConvolver(null, 1, 0)
    appliedReverbFile = null
    // 4) 环绕：撤出 panner（否则停在原点也要白吃 ~3dB）
    setPannerEnable(false)
    stopPanner()
    appliedPannerEnabled = false
    // 5) 移调：回到 1 倍。setPitchShifter 里对 1 倍做了特判，不会为此去加载 worklet
    setPitchShifter(1)
  }

  /** 按当前设置把整条音效链挂上；总开关关闭时改为整体旁路 */
  const applySoundEffects = () => {
    if (!isSoundEffectEnabled()) {
      bypassSoundEffects()
      return
    }

    // 未启用环绕强度时 panner 不参与链路（否则停泊在原点也会平白吃掉 ~3dB）
    const pannerEnable = !!appSetting['player.soundEffect.panner.enable']
    if (pannerEnable !== appliedPannerEnabled) {
      appliedPannerEnabled = pannerEnable
      setPannerEnable(pannerEnable)
      if (pannerEnable) startPanner()
      else stopPanner()
    }
    setPannerSoundR(surroundRadiusFromIntensity(appSetting['player.soundEffect.panner.soundR']))
    setPannerSpeed(2 * (appSetting['player.soundEffect.panner.speed'] / 10))

    // 手调十段。必须排在 syncAudioChain() 之前 —— 银河链若接管 EQ，由它覆盖这十段
    const bfs = getBiquadFilter()
    for (const item of freqs) {
      bfs.get(`hz${item}`)!.gain.value = appSetting[`player.soundEffect.biquadFilter.hz${item}`]
    }

    const reverbFile = appSetting['player.soundEffect.convolution.fileName'] || null
    if (reverbFile !== appliedReverbFile) {
      appliedReverbFile = reverbFile
      applyReverb()
    }

    // 无条件下发：设为 1 时它内部只把音高复位、不会加载/接入 worklet（见 setPitchShifter 的特判），
    // 所以「用户把倍率调回 1」也能在这里被正确撤销。
    setPitchShifter(appSetting['player.soundEffect.pitchShifter.playbackRate'])

    // ===== 银河音效 2.0：三套系统共用一条链 =====
    //
    // 「推荐音效」FX 预设、「均衡器」4 条增强滑条、「音效制作」用户链最终都归到
    // 同一份 GalaxyDSPConfig，由 syncAudioChain 按优先级栈选出生效的那一份。
    // 因此这里**只需要一个入口**，而且它必须最后跑（见上面 EQ 的注释）。
    syncAudioChain()
  }

  applySoundEffects()

  // ===== 结构类变更：整条链重算 =====
  watch(() => [
    // 音效总开关
    appSetting['player.soundEffect.enable'],
    // 声学适配
    appSetting['player.soundEffect.panner.enable'],
    appSetting['player.soundEffect.convolution.fileName'],
    appSetting['player.soundEffect.pitchShifter.playbackRate'],
    // 推荐音效
    appSetting['player.soundEffect.galaxy.enable'],
    appSetting['player.soundEffect.galaxy.fxPresetId'],
    appSetting['player.soundEffect.galaxy.eqPresetId'],
    appSetting['player.soundEffect.galaxy.intensity'],
    // 智能补偿是对预设的叠加层，改它同样要重算整条链
    appSetting['player.soundEffect.galaxy.smart.enable'],
    appSetting['player.soundEffect.galaxy.smart.overlay'],
    // 音效制作
    appSetting['player.soundEffect.galaxy.userChain.enable'],
    appSetting['player.soundEffect.galaxy.userChain.data'],
    // 均衡器页的 4 条 DSP 滑条
    appSetting['player.soundEffect.enhance.bass'],
    appSetting['player.soundEffect.enhance.hifi'],
    appSetting['player.soundEffect.enhance.dynamic'],
    appSetting['player.soundEffect.enhance.balance'],
  ], applySoundEffects)

  // ===== 参量类变更：只改数值，不重建链路（拖滑杆时每帧都会触发）=====
  // 总开关关闭时全部忽略 —— 此时链路处于旁路态，写进去只会和 bypassSoundEffects 的结果打架。
  watch(() => freqs.map(hz => appSetting[`player.soundEffect.biquadFilter.hz${hz}`]), () => {
    if (!isSoundEffectEnabled()) return
    const bfs = getBiquadFilter()
    for (const item of freqs) {
      bfs.get(`hz${item}`)!.gain.value = appSetting[`player.soundEffect.biquadFilter.hz${item}`]
    }
  })
  watch(() => appSetting['player.soundEffect.panner.soundR'], (soundR) => {
    if (!isSoundEffectEnabled()) return
    setPannerSoundR(surroundRadiusFromIntensity(soundR))
  })
  watch(() => appSetting['player.soundEffect.panner.speed'], (speed) => {
    if (!isSoundEffectEnabled()) return
    setPannerSpeed(2 * (speed / 10))
  })
  watch(() => appSetting['player.soundEffect.convolution.mainGain'], (mainGain) => {
    if (!isSoundEffectEnabled()) return
    if (!appSetting['player.soundEffect.convolution.fileName']) return
    setConvolverMainGain(mainGain / 10)
  })
  watch(() => appSetting['player.soundEffect.convolution.sendGain'], (sendGain) => {
    if (!isSoundEffectEnabled()) return
    if (!appSetting['player.soundEffect.convolution.fileName']) return
    setConvolverSendGain(reverbWetFromIntensity(sendGain))
  })

  // window.key_event.on(HOTKEY_PLAYER.volume_up.action, hotkeyVolumeUp)
  // window.key_event.on(HOTKEY_PLAYER.volume_down.action, hotkeyVolumeDown)
  // window.app_event.on('setPlaybackRate', handleSetPlaybackRate)

  // onBeforeUnmount(() => {
  //   // window.key_event.off(HOTKEY_PLAYER.volume_up.action, hotkeyVolumeUp)
  //   // window.key_event.off(HOTKEY_PLAYER.volume_down.action, hotkeyVolumeDown)
  //   window.app_event.off('setPlaybackRate', handleSetPlaybackRate)
  // })
}
