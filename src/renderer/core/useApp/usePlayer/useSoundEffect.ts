import { watch } from '@common/utils/vueTools'
import {
  freqs,
  getAudioContext,
  getBiquadFilter,
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
import { syncAudioChain } from '@renderer/plugins/player/galaxy/bridge'

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

export default () => {
  // console.log(appSetting['player.soundEffect.panner.enable'])
  // 未启用环绕强度时 panner 不参与链路（否则停泊在原点也会平白吃掉 ~3dB）
  setPannerEnable(!!appSetting['player.soundEffect.panner.enable'])
  if (appSetting['player.soundEffect.panner.enable']) startPanner()
  setPannerSoundR(surroundRadiusFromIntensity(appSetting['player.soundEffect.panner.soundR']))
  setPannerSpeed(2 * (appSetting['player.soundEffect.panner.speed'] / 10))
  if (freqs.some(v => appSetting[`player.soundEffect.biquadFilter.hz${v}`] != 0)) {
    const bfs = getBiquadFilter()
    for (const item of freqs) {
      bfs.get(`hz${item}`)!.gain.value = appSetting[`player.soundEffect.biquadFilter.hz${item}`]
    }
  }
  if (appSetting['player.soundEffect.convolution.fileName']) {
    void loadBuffer(appSetting['player.soundEffect.convolution.fileName']).then((buffer) => {
      setConvolver(buffer, appSetting['player.soundEffect.convolution.mainGain'] / 10, reverbWetFromIntensity(appSetting['player.soundEffect.convolution.sendGain']))
    }).catch(err => {
      // 资源缺失/损坏时安全降级为干声，避免混响无声且无提示
      console.error('load reverb IR failed:', err)
      setConvolver(null, 1, 0)
    })
  }
  if (appSetting['player.soundEffect.pitchShifter.playbackRate'] != 1) {
    setPitchShifter(appSetting['player.soundEffect.pitchShifter.playbackRate'])
  }
  // 「均衡器」页的 4 条增强滑条不再有独立的节点链：它们由 syncAudioChain
  // 编译进同一份 GalaxyDSPConfig（见本文件末尾的唯一一个 watch）。


  watch(() => appSetting['player.soundEffect.panner.enable'], (enable) => {
    setPannerEnable(!!enable)
    if (enable) {
      startPanner()
    } else {
      stopPanner()
    }
  })
  watch(() => appSetting['player.soundEffect.panner.soundR'], (soundR) => {
    setPannerSoundR(surroundRadiusFromIntensity(soundR))
  })
  watch(() => appSetting['player.soundEffect.panner.speed'], (speed) => {
    setPannerSpeed(2 * (speed / 10))
  })
  watch(() => appSetting['player.soundEffect.convolution.fileName'], (fileName) => {
    setTimeout(() => {
      if (fileName) {
        void loadBuffer(fileName).then((buffer) => {
          setConvolver(buffer, appSetting['player.soundEffect.convolution.mainGain'] / 10, reverbWetFromIntensity(appSetting['player.soundEffect.convolution.sendGain']))
        }).catch(err => {
          console.error('load reverb IR failed:', err)
          setConvolver(null, 1, 0)
        })
      } else {
        setConvolver(null, 1, 0)
      }
    })
  })
  watch(() => appSetting['player.soundEffect.convolution.mainGain'], (mainGain) => {
    if (!appSetting['player.soundEffect.convolution.fileName']) return
    setConvolverMainGain(mainGain / 10)
  })
  watch(() => appSetting['player.soundEffect.convolution.sendGain'], (sendGain) => {
    if (!appSetting['player.soundEffect.convolution.fileName']) return
    setConvolverSendGain(reverbWetFromIntensity(sendGain))
  })
  watch(() => appSetting['player.soundEffect.biquadFilter.hz31'], (hz31) => {
    const bfs = getBiquadFilter()
    bfs.get('hz31')!.gain.value = hz31
  })
  watch(() => appSetting['player.soundEffect.biquadFilter.hz62'], (hz62) => {
    const bfs = getBiquadFilter()
    bfs.get('hz62')!.gain.value = hz62
  })
  watch(() => appSetting['player.soundEffect.biquadFilter.hz125'], (hz125) => {
    const bfs = getBiquadFilter()
    bfs.get('hz125')!.gain.value = hz125
  })
  watch(() => appSetting['player.soundEffect.biquadFilter.hz250'], (hz250) => {
    const bfs = getBiquadFilter()
    bfs.get('hz250')!.gain.value = hz250
  })
  watch(() => appSetting['player.soundEffect.biquadFilter.hz500'], (hz500) => {
    const bfs = getBiquadFilter()
    bfs.get('hz500')!.gain.value = hz500
  })
  watch(() => appSetting['player.soundEffect.biquadFilter.hz1000'], (hz1000) => {
    const bfs = getBiquadFilter()
    bfs.get('hz1000')!.gain.value = hz1000
  })
  watch(() => appSetting['player.soundEffect.biquadFilter.hz2000'], (hz2000) => {
    const bfs = getBiquadFilter()
    bfs.get('hz2000')!.gain.value = hz2000
  })
  watch(() => appSetting['player.soundEffect.biquadFilter.hz4000'], (hz4000) => {
    const bfs = getBiquadFilter()
    bfs.get('hz4000')!.gain.value = hz4000
  })
  watch(() => appSetting['player.soundEffect.biquadFilter.hz8000'], (hz8000) => {
    const bfs = getBiquadFilter()
    bfs.get('hz8000')!.gain.value = hz8000
  })
  watch(() => appSetting['player.soundEffect.biquadFilter.hz16000'], (hz16000) => {
    const bfs = getBiquadFilter()
    bfs.get('hz16000')!.gain.value = hz16000
  })

  watch(() => appSetting['player.soundEffect.pitchShifter.playbackRate'], (playbackRate) => {
    setPitchShifter(playbackRate)
  })

  // ===== 银河音效 2.0：三套系统共用一条链 =====
  //
  // 「推荐音效」FX 预设、「均衡器」4 条增强滑条、「音效制作」用户链最终都归到
  // 同一份 GalaxyDSPConfig，由 syncAudioChain 按优先级栈选出生效的那一份。
  // 因此这里**只需要一个 watch** —— 任何一路设置变化都重算整条链，
  // 不再需要「谁退出、谁接管」的互斥代码（那是两套链时代的产物）。
  syncAudioChain()
  watch(() => [
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
  ], () => {
    syncAudioChain()
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
