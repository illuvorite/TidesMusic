<template lang="pug">
div(:class="$style.footerLeftControlBtns")
  button(:class="[$style.footerLeftControlBtn, $style.lrcBtn]" :aria-label="toggleDesktopLyricBtnTitle" @click="toggleDesktopLyric" @contextmenu="toggleLockDesktopLyric")
    svg(v-show="appSetting['desktopLyric.enable']" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 512 512" space="preserve")
      use(xlink:href="#icon-desktop-lyric-on")
    svg(v-show="!appSetting['desktopLyric.enable']" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 512 512" space="preserve")
      use(xlink:href="#icon-desktop-lyric-off")
  button(:class="[$style.footerLeftControlBtn, { [$style.active]: appSetting['player.audioVisualization'] }]" :aria-label="$t('audio_visualization')" @click="toggleAudioVisualization")
    svg(version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 24 24" space="preserve")
      use(xlink:href="#icon-audio-wave")
  button(:class="[$style.footerLeftControlBtn, { [$style.active]: isShowLrcSelectContent }]" :aria-label="$t('lyric__select')" @click="toggleVisibleLrc")
    svg(version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 24 24" space="preserve")
      use(xlink:href="#icon-text")
  common-sound-effect-btn
  common-playback-rate-btn
  material-popup-btn(ref="qualityBtnRef")
    button(:class="[$style.footerLeftControlBtn, $style.qualityBtn]" :aria-label="'音质：' + qualityLabel" :title="'音质：' + qualityLabel") {{ qualityLabel }}
    template(#content)
      div(:class="$style.qualityMenu")
        button(v-for="opt in qualityOptions" :key="opt.value" :class="[$style.qualityItem, { [$style.qualityItemActive]: appSetting['player.playQuality'] == opt.value }]" @click="selectQuality(opt.value)") {{ opt.label }}
  button(:class="[$style.footerLeftControlBtn, { [$style.active]: isShowQueue }]" :aria-label="'播放队列'" :title="'播放队列'" @click="isShowQueue = !isShowQueue")
    svg(version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 24 24" space="preserve")
      use(xlink:href="#icon-list-lines")
  button(:class="$style.footerLeftControlBtn" :aria-label="$t('player__add_music_to')" @click="isShowAddMusicTo = true")
    svg(version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 512 512" space="preserve")
      use(xlink:href="#icon-add-2")
  common-list-add-modal(v-model:show="isShowAddMusicTo" :music-info="playMusicInfo.musicInfo")
  play-queue(:show="isShowQueue" @close="isShowQueue = false")

</template>

<script>
import { computed, ref } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'

import {
  isShowLrcSelectContent,
  playMusicInfo,
} from '@renderer/store/player/state'
import {
  setShowPlayLrcSelectContentLrc,
} from '@renderer/store/player/action'

import PlayQueue from './PlayQueue.vue'
import useNextTogglePlay from '@renderer/utils/compositions/useNextTogglePlay'
import useToggleDesktopLyric from '@renderer/utils/compositions/useToggleDesktopLyric'
import { dialog } from '@renderer/plugins/Dialog'
import { setMediaDeviceId } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, setEnableAudioVisualization, updateSetting } from '@renderer/store/setting'

// 音质选项（与主播放栏 MiniWidthProgress 保持一致）
const PLAY_QUALITY_LABEL = {
  '128k': '标准',
  '320k': '较高',
  flac: '极高',
  flac24bit: '无损',
}
const PLAY_QUALITY_OPTIONS = ['128k', '320k', 'flac', 'flac24bit'].map(v => ({ value: v, label: PLAY_QUALITY_LABEL[v] }))

export default {
  components: {
    PlayQueue,
  },
  setup() {
    const t = useI18n()
    // const setting = useRefGetter('setting')
    // const setAudioVisualization = useCommit('setAudioVisualization')
    // const saveMediaDeviceId = useCommit('setMediaDeviceId')

    const toggleVisibleLrc = () => {
      setShowPlayLrcSelectContentLrc(!isShowLrcSelectContent.value)
    }
    const {
      nextTogglePlayName,
      toggleNextPlayMode,
    } = useNextTogglePlay()

    const {
      toggleDesktopLyricBtnTitle,
      toggleDesktopLyric,
      toggleLockDesktopLyric,
    } = useToggleDesktopLyric()

    const isShowAddMusicTo = ref(false)
    const isShowQueue = ref(false)
    const qualityBtnRef = ref(null)

    const qualityLabel = computed(() => PLAY_QUALITY_LABEL[appSetting['player.playQuality']] || '标准')
    const qualityOptions = PLAY_QUALITY_OPTIONS
    const selectQuality = (value) => {
      qualityBtnRef.value?.hide()
      if (appSetting['player.playQuality'] === value) return
      updateSetting({ 'player.playQuality': value })
    }

    const toggleAudioVisualization = async() => {
      const newSetting = !appSetting['player.audioVisualization']
      if (newSetting && appSetting['player.mediaDeviceId'] != 'default') {
        const confirm = await dialog.confirm({
          message: t('setting__player_audio_visualization_tip'),
          cancelButtonText: t('cancel_button_text'),
          confirmButtonText: t('confirm_button_text'),
        })
        if (!confirm) return
        await setMediaDeviceId('default').catch(_ => _)
        saveMediaDeviceId('default')
      }
      setEnableAudioVisualization(newSetting)
    }

    return {
      appSetting,
      isShowLrcSelectContent,
      toggleVisibleLrc,
      nextTogglePlayName,
      toggleNextPlayMode,
      toggleDesktopLyricBtnTitle,
      toggleDesktopLyric,
      toggleLockDesktopLyric,
      toggleAudioVisualization,
      isShowAddMusicTo,
      isShowQueue,
      qualityBtnRef,
      qualityLabel,
      qualityOptions,
      selectQuality,
      playMusicInfo,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.footerLeftControlBtns {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-end;
  align-items: center;
  gap: var(--qm-sp-2, 6px);

  button {
    width: 20px;
    height: 20px;
    color: var(--qm-text-2);
  }

  .footerLeftControlBtn {
    opacity: .5;
    cursor: pointer;
    transition: opacity @transition-normal;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border: none;
    padding: 0;

    &:hover {
      opacity: .9;
    }

    &.active {
      color: var(--color-primary);
      opacity: .8;
    }
  }

  .lrcBtn {
    width: 20px;
    height: 20px;
  }

  // 音质：文字按钮（SQ / HQ 风格），需要覆盖父级 button 的 20×20 固定尺寸
  .footerLeftControlBtn.qualityBtn {
    width: auto;
    min-width: 20px;
    padding: 0 2px;
    font-size: var(--qm-fs-2xs, 11px);
    font-weight: var(--qm-fw-semibold, 600);
    letter-spacing: .3px;
  }
}

// 音质下拉：深色画布下的浅色文字菜单
.qualityMenu {
  display: flex;
  flex-flow: column nowrap;
  min-width: 92px;
  padding: var(--qm-sp-1, 4px);
}
.qualityItem {
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: var(--qm-radius-xs, 6px);
  font-size: 12.5px;
  text-align: left;
  color: var(--qm-text-2);
  background-color: transparent;
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast;

  &:hover {
    background-color: var(--qm-hover);
  }
}
.qualityItemActive {
  color: var(--qm-primary);
}

</style>
