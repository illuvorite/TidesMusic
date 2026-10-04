import { computed, ref } from '@common/utils/vueTools'
import { saveVolumeIsMute } from '@renderer/store/setting'
import { volume, isMute, setMute, setVolume } from '@renderer/store/player/volume'
import { setVolume as setPlayerVolume, setMute as setPlayerMute } from '@renderer/plugins/player'

/**
 * 音量控制（主播放栏与播放详情页共用一份实现）
 *
 * 之所以抽出来：音量弹窗在播放栏里是内联的、在详情页里由 VolumeBtn 承载，
 * 两边各写一遍会漂移（历史上详情页就留着一套「横向滑块 + 静音勾选」的老弹窗）。
 * 统一后两处的按钮、弹窗结构、交互完全一致。
 */
export default () => {
  const dom_volumeSlider = ref(null)

  const volumeIcon = computed(() => {
    if (isMute.value) return 'volume-mute'
    if (volume.value == 0) return 'volume-off'
    if (volume.value < 0.3) return 'volume-low'
    if (volume.value < 0.7) return 'volume-medium'
    return 'volume-high'
  })

  const volumePercent = computed(() => Math.round(volume.value * 100))

  const handleUpdateVolume = (val) => {
    setVolume(val)
    setPlayerVolume(val)
  }

  const toggleMute = () => {
    saveVolumeIsMute(!isMute.value)
    setMute(!isMute.value)
    setPlayerMute(!isMute.value)
  }

  // direction 为「档数」，每档 5%；音量弹层顶部的绿钮按 2 档（10%）步进
  const stepVolume = (direction) => {
    const next = Math.min(1, Math.max(0, Math.round((volume.value + direction * 0.05) * 100) / 100))
    handleUpdateVolume(next)
  }

  const handleVolumeWheel = (event) => {
    handleUpdateVolume(Math.round(volume.value * 100 + (-event.deltaY / 100 * 2)) / 100)
  }

  // 竖向音量条：点击 / 拖拽（按指针相对轨道底部的位置算音量，顶部 = 100%）
  let dragging = false
  const setVolumeFromPointer = (event) => {
    const el = dom_volumeSlider.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (!rect.height) return
    const ratio = 1 - (event.clientY - rect.top) / rect.height
    handleUpdateVolume(Math.min(1, Math.max(0, Math.round(ratio * 100) / 100)))
  }
  const handleVolumePointerDown = (event) => {
    dragging = true
    setVolumeFromPointer(event)
    const onMove = (e) => { if (dragging) setVolumeFromPointer(e) }
    const onUp = () => {
      dragging = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return {
    dom_volumeSlider,
    volume,
    isMute,
    volumeIcon,
    volumePercent,
    handleUpdateVolume,
    toggleMute,
    stepVolume,
    handleVolumeWheel,
    handleVolumePointerDown,
  }
}
