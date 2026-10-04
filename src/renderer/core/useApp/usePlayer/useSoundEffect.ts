import { watch } from '@common/utils/vueTools'
import {
  freqs,
  getAudioContext,
  getBiquadFilter,
  setConvolver,
  setConvolverMainGain,
  setPitchShifter,
  setSurroundMode,
  setHifiAmount,
  setReverbAmount,
  setSurroundStrength,
  setBassAmount,
  setDynamicAmount,
  setBalance,
  setAudioGraphBypass,
  hasInitedAdvancedAudioFeatures,
} from '@renderer/plugins/player'
import type { SurroundMode } from '@renderer/plugins/player/audioEffects'

import { appSetting, updateSetting } from '@renderer/store/setting'

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
    // Asynchronously decode the audio file data in request.response
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

// ============================================================
//  音效应用（均衡器 10 段 + 高保真度 / 混响强度 / 环绕强度 /
//  超重低音 / 动态推进 / 声道平衡 + 变调）
// ============================================================

/** EQ 是否有任一频段被调整过 */
const hasActiveEq = () => freqs.some(v => appSetting[`player.soundEffect.biquadFilter.hz${v}`] != 0)

/**
 * 是否处于「零音效」状态：所有音效全部关闭。
 * 此时让信号物理旁路整条音效链，保证素音不被任何处理节点染色。
 */
const isZeroEffectState = (): boolean => {
  // 总开关关闭 → 整条音效链物理旁路（各音效设置保留，重新打开即恢复）
  if (appSetting['player.soundEffect.enable'] === false) return true
  if (hasActiveEq()) return false
  if (appSetting['player.soundEffect.hifi'] != 0) return false
  if (appSetting['player.soundEffect.reverb'] != 0) return false
  if (appSetting['player.soundEffect.surroundStrength'] != 0) return false
  if (appSetting['player.soundEffect.bass'] != 0) return false
  if (appSetting['player.soundEffect.dynamic'] != 0) return false
  if (appSetting['player.soundEffect.balance'] != 0) return false
  if (appSetting['player.soundEffect.pitchShifter.playbackRate'] != 1) return false
  return true
}

/** 只有在音效生效时才触碰音频链，避免为了「关闭音效」而提前创建 AudioContext */
const applyIfNeeded = (active: boolean, apply: () => void) => {
  if (!active && !hasInitedAdvancedAudioFeatures()) return
  apply()
}

/** 应用 EQ（10 段） */
const applyEq = () => {
  const bfs = getBiquadFilter()
  for (const item of freqs) {
    bfs.get(`hz${item}`)!.gain.value = appSetting[`player.soundEffect.biquadFilter.hz${item}`]
  }
}

/**
 * 应用混响：先确定脉冲响应（生成 IR 的混响模式 > IR 采样文件），
 * 再由「混响强度」统一控制湿声大小。
 */
const applyReverb = () => {
  const mode = appSetting['player.soundEffect.reverbMode'] as SurroundMode
  const fileName = appSetting['player.soundEffect.convolution.fileName']
  const amount = appSetting['player.soundEffect.reverb']

  if (mode != 'off') {
    setSurroundMode(mode)
  } else if (fileName) {
    void loadBuffer(fileName).then((buffer) => {
      // IR 文件：原始音频增益取预设值，湿声仍由「混响强度」控制
      setConvolver(buffer, appSetting['player.soundEffect.convolution.mainGain'] / 10, 0)
      setReverbAmount(amount)
    }).catch((err) => {
      console.error('load convolution file failed:', err)
      setConvolver(null, 1, 0)
    })
    return
  } else if (amount != 0) {
    // 未选择混响模式/采样，但「混响强度」大于 0：给一个默认的中厅堂 IR，
    // 保证「混响强度」滑块可以独立使用
    setSurroundMode('medium')
  } else {
    applyIfNeeded(false, () => {
      setConvolver(null, 1, 0)
    })
  }

  setReverbAmount(amount)
}

const applyHifi = () => {
  const amount = appSetting['player.soundEffect.hifi']
  applyIfNeeded(amount != 0, () => setHifiAmount(amount))
}

const applyBass = () => {
  const amount = appSetting['player.soundEffect.bass']
  applyIfNeeded(amount != 0, () => setBassAmount(amount))
}

const applyDynamic = () => {
  const amount = appSetting['player.soundEffect.dynamic']
  applyIfNeeded(amount != 0, () => setDynamicAmount(amount))
}

const applySurroundStrength = () => {
  const amount = appSetting['player.soundEffect.surroundStrength']
  applyIfNeeded(amount != 0, () => setSurroundStrength(amount))
}

const applyBalance = () => {
  const amount = appSetting['player.soundEffect.balance']
  applyIfNeeded(amount != 0, () => setBalance(amount / 50))
}

/** 刷新音频链旁路（零音效时完全跳过处理节点） */
const refreshBypass = () => {
  const zero = isZeroEffectState()
  // 若音频上下文尚未创建（本次运行从未用过音效），保持原生直通：
  // 音频完全由 <audio> 元素解码输出，不经过 Web Audio（无重采样 / 无任何处理），
  // 音质最纯净。一旦创建过（用过音效），则改用物理旁路。
  if (zero && !hasInitedAdvancedAudioFeatures()) return
  setAudioGraphBypass(zero)
}

/** 套用全部音效（总开关打开时使用） */
const applyAll = () => {
  if (hasActiveEq()) applyEq()
  applyHifi()
  applyReverb()
  applyBass()
  applyDynamic()
  applySurroundStrength()
  applyBalance()
}

/** 统一的音效设置变更处理：应用设置 + 刷新旁路 */
const handleEffectSettingChange = () => {
  applyAll()
  refreshBypass()
}

export default () => {
  // ---- 启动时应用一次当前设置（总开关关闭时不做任何音频链初始化）----
  if (appSetting['player.soundEffect.enable'] !== false) {
    applyAll()
    if (appSetting['player.soundEffect.pitchShifter.playbackRate'] != 1) {
      setPitchShifter(appSetting['player.soundEffect.pitchShifter.playbackRate'])
    }
  }

  // ---- 总开关：关闭 → 物理旁路；重新打开 → 重新套用全部音效 ----
  watch(() => appSetting['player.soundEffect.enable'], (enable) => {
    if (enable === false) {
      refreshBypass()
      return
    }
    handleEffectSettingChange()
  })

  // ---- 均衡器（10 段）----
  for (const item of freqs) {
    watch(() => appSetting[`player.soundEffect.biquadFilter.hz${item}`], () => {
      applyIfNeeded(hasActiveEq(), applyEq)
      refreshBypass()
    })
  }

  // ---- 面板底部的 6 个连续音效参数 ----
  watch(() => appSetting['player.soundEffect.hifi'], handleEffectSettingChange)
  watch(() => appSetting['player.soundEffect.bass'], handleEffectSettingChange)
  watch(() => appSetting['player.soundEffect.dynamic'], handleEffectSettingChange)
  watch(() => appSetting['player.soundEffect.surroundStrength'], handleEffectSettingChange)
  watch(() => appSetting['player.soundEffect.balance'], handleEffectSettingChange)
  watch(() => appSetting['player.soundEffect.reverb'], handleEffectSettingChange)

  // ---- 混响的脉冲响应来源（生成 IR 的模式 / IR 采样文件）----
  watch(() => appSetting['player.soundEffect.reverbMode'], () => {
    // 两种来源互斥：切到生成 IR 的模式时清掉 IR 文件选择
    if (appSetting['player.soundEffect.reverbMode'] != 'off' && appSetting['player.soundEffect.convolution.fileName']) {
      void updateSetting({ 'player.soundEffect.convolution.fileName': '' })
    }
    handleEffectSettingChange()
  })
  watch(() => appSetting['player.soundEffect.convolution.fileName'], (fileName) => {
    if (fileName && appSetting['player.soundEffect.reverbMode'] != 'off') {
      void updateSetting({ 'player.soundEffect.reverbMode': 'off' })
      return
    }
    // decodeAudioData 是异步的，延迟到本次设置写入完成后再应用
    setTimeout(() => {
      handleEffectSettingChange()
    })
  })
  watch(() => appSetting['player.soundEffect.convolution.mainGain'], (mainGain) => {
    if (!appSetting['player.soundEffect.convolution.fileName']) return
    setConvolverMainGain(mainGain / 10)
  })

  // ---- 变调 ----
  watch(() => appSetting['player.soundEffect.pitchShifter.playbackRate'], (playbackRate) => {
    setPitchShifter(playbackRate)
    refreshBypass()
  })

  // 初次进入：按当前设置决定走完整音效链还是物理旁路（零音效时不创建 AudioContext）
  refreshBypass()
}
