<template lang="pug">
transition(enter-active-class="animated slideInUp" leave-active-class="animated slideOutDown" @after-enter="handleAfterEnter" @after-leave="handleAfterLeave")
  div(v-if="isShowPlayerDetail" :class="[$style.container, { fullscreen: isFullscreen }]" @contextmenu="handleContextMenu")
    //- 氛围背景：封面放大高斯模糊 + 深色渐变遮罩
    div(:class="$style.backdrop")
      div(:class="$style.backdropImg" :style="backdropStyle")
      div(:class="$style.backdropMask")
    //- 顶部空白区域用于拖拽窗口
    div(:class="$style.dragArea")
    ControlBtnsLeftHeader
    ControlBtnsRightHeader
    div(:class="[$style.main, {[$style.showComment]: isShowPlayComment}]")
      div.left(:class="$style.left")
        div(:class="$style.info")
          div(:class="$style.coverWrap")
            img(v-if="musicInfo.pic" :class="$style.img" :src="musicInfo.pic")
            div(v-else :class="$style.coverEmpty")
              svg-icon(name="music" :class="$style.coverEmptyIcon")
          div.description(:class="$style.description")
            p {{ $t('player__music_name') }}{{ musicInfo.name }}
            p {{ $t('player__music_singer') }}{{ musicInfo.singer }}
            p(v-if="musicInfo.album") {{ $t('player__music_album') }}{{ musicInfo.album }}

      transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
        LyricPlayer(v-if="visibled")
      music-comment(v-if="visibled" :class="$style.comment" :show="isShowPlayComment" :music-info="playMusicInfo.musicInfo" @close="hideComment")
    transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
      play-bar(v-if="visibled")
    transition(enter-active-class="animated-slow fadeIn" leave-active-class="animated-slow fadeOut")
      common-audio-visualizer(v-if="appSetting['player.audioVisualization'] && visibled")
</template>


<script>
import { computed, ref, watch, onMounted, onBeforeUnmount } from '@common/utils/vueTools'
import { isFullscreen } from '@renderer/store'
import {
  isShowPlayerDetail,
  isShowPlayComment,
  musicInfo,
  playMusicInfo,
} from '@renderer/store/player/state'
import {
  setShowPlayerDetail,
  setShowPlayComment,
  setShowPlayLrcSelectContentLrc,
} from '@renderer/store/player/action'
import LyricPlayer from './LyricPlayer.vue'
import PlayBar from './PlayBar.vue'
import MusicComment from './components/MusicComment/index.vue'
import ControlBtnsLeftHeader from './ControlBtnsLeftHeader.vue'
import ControlBtnsRightHeader from './ControlBtnsRightHeader.vue'
import { registerAutoHideMounse, unregisterAutoHideMounse } from './autoHideMounse'
import { appSetting } from '@renderer/store/setting'
import { closeWindow, maxWindowToggle, minWindow, setFullScreen } from '@renderer/utils/ipc'

export default {
  name: 'CorePlayDetail',
  components: {
    ControlBtnsLeftHeader,
    ControlBtnsRightHeader,
    LyricPlayer,
    PlayBar,
    MusicComment,
  },
  setup() {
    const visibled = ref(false)

    let clickTime = 0

    // 用当前封面作为详情页氛围背景
    const backdropStyle = computed(() => {
      const pic = musicInfo.pic
      return pic ? { backgroundImage: `url("${pic}")` } : {}
    })

    const hide = () => {
      setShowPlayerDetail(false)
    }
    const handleContextMenu = () => {
      if (window.performance.now() - clickTime > 400) {
        clickTime = window.performance.now()
        return
      }
      clickTime = 0
      hide()
    }

    const hideComment = () => {
      setShowPlayComment(false)
    }

    const handleAfterEnter = () => {
      if (isFullscreen.value) registerAutoHideMounse()

      visibled.value = true
    }

    const handleAfterLeave = () => {
      setShowPlayLrcSelectContentLrc(false)
      hideComment(false)
      visibled.value = false

      unregisterAutoHideMounse()
    }

    watch(isFullscreen, isFullscreen => {
      (isFullscreen ? registerAutoHideMounse : unregisterAutoHideMounse)()
    })

    // QQ 习惯：Esc 先关评论面板，再退出详情页
    const handleKeydown = (event) => {
      if (event.key !== 'Escape' || !isShowPlayerDetail.value) return
      event.preventDefault()
      event.stopPropagation()
      if (isShowPlayComment.value) {
        isShowPlayComment.value = false
        return
      }
      hide()
    }
    onMounted(() => { document.addEventListener('keydown', handleKeydown, true) })
    onBeforeUnmount(() => { document.removeEventListener('keydown', handleKeydown, true) })


    return {
      appSetting,
      playMusicInfo,
      isShowPlayerDetail,
      isShowPlayComment,
      musicInfo,
      backdropStyle,
      hide,
      handleContextMenu,
      hideComment,
      handleAfterEnter,
      handleAfterLeave,
      visibled,
      isFullscreen,
      fullscreenExit() {
        void setFullScreen(false).then((fullscreen) => {
          isFullscreen.value = fullscreen
        })
      },
      min() {
        minWindow()
      },
      max() {
        maxWindowToggle()
      },
      close() {
        closeWindow()
      },
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  position: absolute;
  display: flex;
  flex-flow: column nowrap;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  // 层级契约：工具栏(40) < 设置覆盖层(60) < 播放详情页(65) < teleport 弹层 Popup/Menu/LyricMenu(70)
  // < material-modal(99)
  // 必须高于工具栏：详情页自带收起按钮与窗口按钮，工具栏若浮在上面会出现
  // 两套按钮重叠、且工具栏按钮点击效果发生在详情页背后的主视图上（表现为全部失灵）
  // 必须高于设置覆盖层：在设置页打开播放详情时应整页接管（否则两层内容混叠，
  // 关闭详情后自然回到设置页）
  // 必须低于 teleport 到 #root 的弹层(70)：否则音质/音量等弹层被盖住 →「点了没反应」
  z-index: 65;
  overflow: hidden;
  border-radius: 0;
  -webkit-app-region: no-drag;
  contain: strict;
  box-sizing: border-box;
  color: var(--color-font);
  // 深色不透明底：避免透明窗口下背景透出桌面
  background-color: #14171c;

  // ============================================================
  //  沉浸式画布：局部重定义语义色，使内部组件（歌词/进度条/
  //  文字/按钮）自动切换为浅色，无需逐个组件改色。
  // ============================================================
  --color-font: rgba(255, 255, 255, .95);
  // 深色画布上当前歌词行用高亮白，避免灰色在深底上发闷
  --color-primary: rgba(255, 255, 255, .98);
  --color-font-label: rgba(255, 255, 255, .58);
  // 弹层/面板（音量、倍速、循环、评论、菜单）都使用这两个变量作为不透明底色，
  // 不能设为 transparent，否则弹层全透明 → 表现为「按钮点了没反应」
  --color-content-background: rgba(26, 30, 36, .97);
  --color-main-background: rgba(26, 30, 36, .97);
  --color-button-font: rgba(255, 255, 255, .92);
  --color-button-background-hover: rgba(255, 255, 255, .14);
  --color-primary-font: var(--color-primary);
  // 进度条（common-progress-bar 读取这两个变量，见 ProgressBar.vue）
  --progress-track: rgba(255, 255, 255, .22);
  --progress-fill: #ffffff;
  --progress-drag: rgba(255, 255, 255, .5);

  * {
    box-sizing: border-box;
  }
}

// ===== 氛围背景 =====
.backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
  background-color: #14171c;
}
.backdropImg {
  position: absolute;
  top: -80px;
  left: -80px;
  right: -80px;
  bottom: -80px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  filter: blur(52px) saturate(1.6) brightness(.72);
  transform: scale(1.12);
  opacity: .9;
  transition: background-image @transition-slow;
}
.backdropMask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  // 上下压暗，中部略微透亮，保证封面与歌词的对比度
  background: linear-gradient(
    180deg,
    rgba(9, 11, 15, .74) 0%,
    rgba(9, 11, 15, .48) 40%,
    rgba(7, 9, 12, .82) 100%
  );
}

// 顶部拖拽区（位于悬浮按钮下层）
.dragArea {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  z-index: 1;
  -webkit-app-region: drag;
}

.main {
  position: relative;
  z-index: 2;
  flex: auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  gap: var(--qm-sp-5, 12px);
  // 顶部让出悬浮按钮区域
  padding: 62px 36px 0;

  // 打开评论面板：收缩左侧封面区并展开评论区
  // 注意：这里必须使用本组件的 CSS Module 类名，
  // 之前的 :global { .left/.comment } 因为类名被哈希化而永远不匹配，
  // 导致「评论按钮点击后状态已切换但面板不显示」。
  &.showComment {
    .left {
      flex-basis: 18%;
      .description p {
        font-size: var(--qm-fs-xs, 12px);
      }
    }
    .comment {
      opacity: 1;
      transform: scaleX(1);
    }
  }
}

.left {
  flex: 0 0 38%;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  padding: 0 12px 18px;
  overflow: hidden;
  transition: flex-basis @transition-normal;
}

.info {
  display: flex;
  flex-flow: column nowrap;
  align-items: stretch;
  min-height: 0;
  max-width: 100%;
  width: 100%;
}

// 大封面卡片：统一 1:1，圆角 + 深投影，成为页面视觉重心
.coverWrap {
  position: relative;
  width: 100%;
  max-width: 340px;
  margin: 0 auto;
  aspect-ratio: 1 / 1;
  border-radius: var(--qm-radius-xl, 16px);
  // 唱片需从封面右侧露出，因此这里不能裁剪
  overflow: visible;
  background-color: rgba(255, 255, 255, .06);
  box-shadow:
    0 28px 64px rgba(0, 0, 0, .48),
    0 4px 12px rgba(0, 0, 0, .32),
    inset 0 1px 0 rgba(255, 255, 255, .08);
  transition: transform @transition-slow, box-shadow @transition-slow;
  &:hover {
    transform: translateY(-2px) scale(1.006);
    box-shadow:
      0 34px 76px rgba(0, 0, 0, .52),
      0 6px 16px rgba(0, 0, 0, .34),
      inset 0 1px 0 rgba(255, 255, 255, .1);
  }
}
// QQ 风格：封面右后方露出的黑胶唱片
.coverWrap::before {
  content: '';
  position: absolute;
  top: 3%;
  left: 46%;
  width: 98%;
  height: 94%;
  border-radius: 50%;
  background:
    repeating-radial-gradient(circle at 50% 50%, rgba(255, 255, 255, .05) 0 1px, transparent 1px 4px),
    radial-gradient(circle at 32% 50%, #4a4a4a 0%, #232323 34%, #0c0c0c 70%, #1a1a1a 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, .1),
    0 18px 40px rgba(0, 0, 0, .5);
}

.img {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: var(--qm-radius-xl, 16px);
  object-fit: cover;
}
.coverEmpty {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: var(--qm-radius-xl, 16px);
  background-color: rgba(255, 255, 255, .06);
  color: rgba(255, 255, 255, .3);
}
.coverEmptyIcon {
  width: 22%;
  height: 22%;
  fill: currentColor;
}

.description {
  max-width: 340px;
  width: 100%;
  margin: 18px auto 0;
  min-height: 0;
  p {
    line-height: 1.75;
    font-size: var(--qm-fs-sm, 13px);
    color: var(--color-font-label);
    overflow-wrap: break-word;
    .mixin-ellipsis(1);
  }
  p:first-child {
    color: var(--color-font);
    font-weight: var(--qm-fw-medium, 500);
    font-size: var(--qm-fs-md, 14px);
    .mixin-ellipsis(2);
  }
}


.comment {
  position: absolute;
  // 顶部让出详情页窗口控制按钮（最小化/最大化/关闭）所在的悬浮区，
  // 否则不透明面板会顶到 y=0，与窗口按钮重叠（表现为「按钮挤在一起」）
  top: 56px;
  height: calc(100% - 56px);
  right: 0;
  width: 50%;
  opacity: 1;
  margin-left: var(--qm-sp-4, 10px);
  border-top-left-radius: var(--qm-radius-lg, 12px);
  overflow: hidden;
  transform: scaleX(0);
}


</style>
