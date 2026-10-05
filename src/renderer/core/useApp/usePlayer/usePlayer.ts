import { onBeforeUnmount, watch } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { setTitle } from '@renderer/utils'

import {
  getCurrentTime,
  getDuration,
  setLoopPlay,
  setPause, setStop,
} from '@renderer/plugins/player'

import useMediaSessionInfo from './useMediaSessionInfo'
import usePlayProgress from './usePlayProgress'
import usePlayEvent from './usePlayEvent'

import {
  musicInfo,
  playMusicInfo,
  playedList,
} from '@renderer/store/player/state'
import {
  setPlay,
  setAllStatus,
  addPlayedList,
  clearPlayedList,
  // resetPlayerMusicInfo,
} from '@renderer/store/player/action'

import { appSetting } from '@renderer/store/setting'

import useLyric from './useLyric'
import useVolume from './useVolume'
import useWatchList from './useWatchList'
import { HOTKEY_PLAYER } from '@common/hotKey'
import { playNext, pause, playPrev, togglePlay, collectMusic, uncollectMusic, dislikeMusic } from '@renderer/core/player'
import usePlaybackRate from './usePlaybackRate'
import useSoundEffect from './useSoundEffect'
import useMaxOutputChannelCount from './useMaxOutputChannelCount'
import { setPowerSaveBlocker } from '@renderer/core/player/utils'
import usePreloadNextMusic from './usePreloadNextMusic'


export default () => {
  const t = useI18n()

  usePlayProgress()
  useMediaSessionInfo()
  usePlayEvent()
  useLyric()
  useVolume()
  useMaxOutputChannelCount()
  useSoundEffect()
  usePlaybackRate()
  useWatchList()
  usePreloadNextMusic()

  const handlePlayNext = () => {
    void playNext()
  }
  const handlePlayPrev = () => {
    void playPrev()
  }

  const addPowerSaveBlocker = () => {
    setPowerSaveBlocker(true)
  }
  const removePowerSaveBlocker = () => {
    setPowerSaveBlocker(false)
  }

  const setPlayStatus = () => {
    setPlay(true)
  }
  const setPauseStatus = () => {
    setPlay(false)
    if (window.lx.isPlayedStop) pause()
    removePowerSaveBlocker()
  }

  const handleUpdatePlayInfo = () => {
    setTitle(musicInfo.id ? `${musicInfo.name} - ${musicInfo.singer}` : null)
  }

  const handleCanplay = () => {
    if (window.lx.isPlayedStop) {
      setPause()
    }
  }
  const handleEnded = () => {
    // setTimeout(() => {
    setAllStatus(t('player__end'))
    if (window.lx.isPlayedStop) {
      console.log('played stop')
      return
    }
    // resetPlayerMusicInfo()
    // window.app_event.stop()
    void playNext(true)
    // })
  }

  const setProgress = (time: number) => {
    window.app_event.setProgress(time)
  }
  const handleSeekforward = () => {
    const seekOffset = 5
    const curTime = getCurrentTime()
    const time = Math.min(getCurrentTime() + seekOffset, getDuration())
    if (Math.trunc(curTime) == Math.trunc(time)) return
    setProgress(time)
  }
  const handleSeekbackward = () => {
    const seekOffset = 5
    const curTime = getCurrentTime()
    const time = Math.max(getCurrentTime() - seekOffset, 0)
    if (Math.trunc(curTime) == Math.trunc(time)) return
    setProgress(time)
  }

  const setStopStatus = () => {
    setPlay(false)
    setTitle(null)
    setAllStatus('')
    setStop()
    removePowerSaveBlocker()
  }

  // 单曲循环：交给 <audio> 的原生 loop 实现。
  //
  // 为什么不用「播完 → ended → playNext(true) → 重播同一首」那条路：
  //   playNext 的索引是 worker 的 filterMusicList 算出来的，而当**当前歌曲被标记为
  //   「不喜欢」**时，它会先把当前歌曲从 filteredList 里 splice 掉、再把 playerIndex
  //   前移一位（这是为了让 listLoop/list 的「下一首」仍然正确）。singleLoop 分支只是
  //   `break`，于是 nextIndex 直接落到「上一首」—— 表现为「选了单曲循环却跳到别的歌」。
  //   原生 loop 根本不触发 ended，也就完全不依赖列表索引，天然没有这个问题，
  //   而且循环处没有重新取 URL 的空档。
  watch(() => appSetting['player.togglePlayMethod'], newValue => {
    setLoopPlay(newValue == 'singleLoop')
    if (playedList.length) clearPlayedList()
    if (newValue == 'random' && playMusicInfo.musicInfo && !playMusicInfo.isTempPlay) addPlayedList({ ...(playMusicInfo as LX.Player.PlayMusicInfo) })
  }, { immediate: true })


  window.key_event.on(HOTKEY_PLAYER.next.action, handlePlayNext)
  window.key_event.on(HOTKEY_PLAYER.prev.action, handlePlayPrev)
  window.key_event.on(HOTKEY_PLAYER.toggle_play.action, togglePlay)
  window.key_event.on(HOTKEY_PLAYER.music_love.action, collectMusic)
  window.key_event.on(HOTKEY_PLAYER.music_unlove.action, uncollectMusic)
  window.key_event.on(HOTKEY_PLAYER.music_dislike.action, dislikeMusic)
  window.key_event.on(HOTKEY_PLAYER.seekbackward.action, handleSeekbackward)
  window.key_event.on(HOTKEY_PLAYER.seekforward.action, handleSeekforward)

  window.app_event.on('play', setPlayStatus)
  window.app_event.on('pause', setPauseStatus)
  window.app_event.on('error', setPauseStatus)
  window.app_event.on('stop', setStopStatus)
  window.app_event.on('musicToggled', handleUpdatePlayInfo)
  window.app_event.on('playerCanplay', handleCanplay)
  window.app_event.on('playerPlaying', addPowerSaveBlocker)
  window.app_event.on('playerEmptied', removePowerSaveBlocker)

  window.app_event.on('playerEnded', handleEnded)


  onBeforeUnmount(() => {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
    window.key_event.off(HOTKEY_PLAYER.next.action, handlePlayNext)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    window.key_event.off(HOTKEY_PLAYER.prev.action, handlePlayPrev)
    window.key_event.off(HOTKEY_PLAYER.toggle_play.action, togglePlay)
    window.key_event.off(HOTKEY_PLAYER.music_love.action, collectMusic)
    window.key_event.off(HOTKEY_PLAYER.music_unlove.action, uncollectMusic)
    window.key_event.off(HOTKEY_PLAYER.music_dislike.action, dislikeMusic)
    window.key_event.off(HOTKEY_PLAYER.seekbackward.action, handleSeekbackward)
    window.key_event.off(HOTKEY_PLAYER.seekforward.action, handleSeekforward)


    window.app_event.off('play', setPlayStatus)
    window.app_event.off('pause', setPauseStatus)
    window.app_event.off('error', setPauseStatus)
    window.app_event.off('stop', setStopStatus)
    window.app_event.off('musicToggled', handleUpdatePlayInfo)
    window.app_event.off('playerPlaying', addPowerSaveBlocker)
    window.app_event.off('playerEmptied', removePowerSaveBlocker)
    window.app_event.off('playerCanplay', handleCanplay)

    window.app_event.off('playerEnded', handleEnded)
  })
}
