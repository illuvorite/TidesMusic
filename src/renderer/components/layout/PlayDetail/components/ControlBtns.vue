<template lang="pug">
div(:class="$style.footerLeftControlBtns")
  button(:class="[$style.footerLeftControlBtn, $style.lrcBtn]" :aria-label="toggleDesktopLyricBtnTitle" @click="toggleDesktopLyric" @contextmenu="toggleLockDesktopLyric")
    svg-icon(v-show="appSetting['desktopLyric.enable']" name="lyrics-desktop-on")
    svg-icon(v-show="!appSetting['desktopLyric.enable']" name="lyrics-desktop-off")
  button(:class="[$style.footerLeftControlBtn, { [$style.active]: appSetting['player.audioVisualization'] }]" :aria-label="$t('audio_visualization')" @click="toggleAudioVisualization")
    svg-icon(name="audio-wave")
  button(:class="[$style.footerLeftControlBtn, { [$style.active]: isShowLrcSelectContent }]" :aria-label="$t('lyric__select')" @click="toggleVisibleLrc")
    svg-icon(name="lyrics-select")
  common-sound-effect-btn
  common-playback-rate-btn
  material-popup-btn(ref="qualityBtnRef")
    button(:class="[$style.footerLeftControlBtn, $style.qualityBtn]" :aria-label="'音质：' + qualityLabel" ignore-tip) {{ qualityLabel }}
    template(#content)
      common-quality-popup(@select="qualityBtnRef?.hide()")
  button(:class="[$style.footerLeftControlBtn, { [$style.active]: isShowQueue }]" :aria-label="'播放队列'" ignore-tip @click="isShowQueue = !isShowQueue")
    svg-icon(name="list-lines")
  button(:class="$style.footerLeftControlBtn" :aria-label="$t('player__add_music_to')" @click="handleShowAddMenu($event)")
    svg-icon(name="playlist-add")
  // 「添加到」锚定菜单（QQ 版式；详情页画布恒为暗色卡）
  base-menu(v-model="isShowAddMenu" :menus="addMenuItems" :xy="addMenuLocation" :anchor-rect="addMenuAnchorRect" item-name="name" :dark="true" @menu-click="handleAddMenuClick")
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
import { appSetting, saveMediaDeviceId, setEnableAudioVisualization } from '@renderer/store/setting'
import useListAddMenu from '@renderer/utils/compositions/useListAddMenu'

// 音质文案（与主播放栏、音质弹窗组件共用同一份口径）
const PLAY_QUALITY_LABEL = {
  '128k': '标准',
  '320k': '较高',
  flac: '极高',
  flac24bit: '无损',
}

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

    // 「添加到」锚定菜单（与右键菜单同款卡片；详情页强制暗色）
    const addMenu = useListAddMenu()
    const handleShowAddMenu = (event) => {
      if (!playMusicInfo.musicInfo.id) return
      addMenu.openMenu(event?.currentTarget, playMusicInfo.musicInfo)
    }
    const isShowQueue = ref(false)
    const qualityBtnRef = ref(null)

    const qualityLabel = computed(() => PLAY_QUALITY_LABEL[appSetting['player.playQuality']] || '标准')

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
      isShowAddMenu: addMenu.isShow,
      addMenuLocation: addMenu.location,
      addMenuAnchorRect: addMenu.anchorRect,
      addMenuItems: addMenu.menus,
      handleShowAddMenu,
      handleAddMenuClick: addMenu.handleMenuClick,
      isShowQueue,
      qualityBtnRef,
      qualityLabel,
      playMusicInfo,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq-icon.less';

.footerLeftControlBtns {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-end;
  align-items: center;
  gap: var(--qm-sp-2, 6px);

  button {
    width: 28px;
    height: 28px;
    color: var(--color-font);
  }

  // 统一图标按钮：默认 72% → 悬停 100% + 浅色底 → 禁用 40%
  .footerLeftControlBtn {
    .qm-icon-btn();

    color: var(--color-font);
    border-radius: var(--qm-radius-xs, 6px);

    &:hover:not(:disabled) { background-color: rgba(255, 255, 255, .12); }

    // 选中态：必须用 --qm-primary（详情页把 --color-primary 重定义成了白色）
    &.active { color: var(--qm-primary); }
  }

  .lrcBtn {
    width: 28px;
    height: 28px;
  }

  // 音质：文字按钮（SQ / HQ 风格），需要覆盖父级 button 的固定尺寸
  .footerLeftControlBtn.qualityBtn {
    width: auto;
    min-width: 28px;
    padding: 0 4px;
    font-size: var(--qm-fs-2xs, 11px);
    font-weight: var(--qm-fw-semibold, 600);
    letter-spacing: .3px;
  }
}

</style>
