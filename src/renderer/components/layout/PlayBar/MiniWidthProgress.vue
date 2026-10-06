<template>
  <div :class="[$style.player, { [$style.fullMode]: variant === 'full' }]">
    <!-- 左：封面 + 信息 + 快捷操作 -->
    <div :class="$style.left">
      <div :class="$style.cover" :aria-label="$t('player__pic_tip')" @contextmenu="handleToMusicLocation" @click="showPlayerDetail">
        <img v-if="musicInfo.pic" :src="musicInfo.pic" decoding="async" @error="imgError">
        <div v-else :class="$style.coverEmpty">
          <svg-icon name="music" />
        </div>
      </div>
      <div :class="$style.info">
        <div :class="$style.title" :title="title">{{ title || '未在播放' }}</div>
        <div :class="$style.artist" :title="musicInfo.singer">{{ musicInfo.singer || '—' }}</div>
      </div>
      <!-- 快捷操作：去掉原生 title 气泡（与弹窗重叠，QQ 播放栏也没有原生提示） -->
      <button :class="[$style.iconBtn, { [$style.liked]: isLiked }]" :aria-label="isLiked ? '取消喜欢' : '喜欢'" @click="toggleLove">
        <svg-icon :name="isLiked ? 'heart' : 'heart-outline'" />
      </button>
      <button :class="$style.iconBtn" aria-label="评论" @click="showComments">
        <svg-icon name="comment" />
      </button>
      <material-popup-btn ref="moreBtnRef">
        <button :class="$style.iconBtn" :aria-label="'更多'" ignore-tip>
          <svg-icon name="more-h" />
        </button>
        <template #content>
          <div class="qm-menu" :class="$style.moreMenu">
            <button class="qm-menu-item" @click.stop="handleMoreAction('copyName')">复制歌曲名</button>
            <button class="qm-menu-item" @click.stop="handleMoreAction('copyInfo')">复制歌曲信息</button>
            <button class="qm-menu-item" @click.stop="handleMoreAction('goLocation')">跳转到所在列表</button>
            <button class="qm-menu-item" @click.stop="handleMoreAction('addTo')">添加到歌单</button>
          </div>
        </template>
      </material-popup-btn>
    </div>

    <!-- 中：进度 + 控制 -->
    <div :class="$style.center">
      <div :class="$style.controls">
        <!-- 两端（循环 / 音量）与中间三键拉开距离，见 .modeBtn / .volumeBtn 的 margin -->
        <common-toggle-play-mode-btn :class="$style.modeBtn" />
        <button :class="$style.iconBtn" aria-label="上一曲" @click="playPrev()">
          <svg-icon name="prev" />
        </button>
        <button :class="[$style.iconBtn, $style.playBtn]" :aria-label="isPlay ? '暂停' : '播放'" @click="togglePlay">
          <svg-icon :name="isPlay ? 'pause' : 'play'" />
        </button>
        <button :class="$style.iconBtn" aria-label="下一曲" @click="playNext()">
          <svg-icon name="next" />
        </button>
        <!-- 音量：紧挨「下一首」，向上弹出竖版音量条（与播放详情页共用同一组件） -->
        <common-volume-btn :class="$style.volumeBtn" />
      </div>
      <div v-if="variant !== 'full'" :class="[$style.progress, { [$style.progressWide]: variant === 'middle' }]">
        <span :class="$style.time">{{ nowPlayTimeStr }}</span>
        <common-progress-bar
          v-if="!isShowPlayerDetail"
          :class-name="$style.progressBar"
          :progress="progress"
          :handle-transition-end="handleTransitionEnd"
          :is-active-transition="isActiveTransition"
          :emit-playback-progress="true"
        />
        <span :class="$style.time">{{ maxPlayTimeStr }}</span>
      </div>
    </div>

    <!-- 右：辅助操作（音量已移到中间「下一首」旁边） -->
    <div :class="$style.right">
      <!-- full：进度条已移到播放栏底部通栏，时间合并显示在这里 -->
      <span v-if="variant === 'full'" :class="$style.timeInline">{{ nowPlayTimeStr }} / {{ maxPlayTimeStr }}</span>
      <material-popup-btn ref="qualityBtnRef">
        <button :class="[$style.textBtn, $style.qualityBtn]" :aria-label="`音质：${qualityLabel}`" ignore-tip>
          {{ qualityLabel }}
        </button>
        <template #content>
          <common-quality-popup @select="qualityBtnRef?.hide()" />
        </template>
      </material-popup-btn>
      <common-sound-effect-btn :class="$style.soundEffectBtn" teleport="#root" />
      <button :class="[$style.iconBtn, { [$style.active]: isDesktopLyricOn }]" aria-label="桌面歌词" @click="toggleLyric">
        <svg-icon name="lyrics" />
      </button>
      <material-popup-btn ref="playlistBtnRef" @mouseenter="refreshPlayQueue">
        <button :class="$style.iconBtn" aria-label="播放列表" ignore-tip>
          <svg-icon name="list-lines" />
        </button>
        <template #content>
          <div :class="$style.playlistPopup">
            <div :class="$style.playlistPopupHeader">
              <span :class="$style.playlistPopupTitle">播放队列</span>
              <button
                :class="$style.playlistTool" aria-label="清空稍后播放"
                ignore-tip
               @click.stop="handleClearQueue"
>
                <svg-icon name="delete" />
              </button>
            </div>
            <div :class="$style.playlistPopupMeta">共 {{ playQueue.length }} 首歌曲</div>
            <div v-if="playQueue.length" :class="$style.playlistPopupList">
              <div
                v-for="(item, index) in playQueue"
                :key="`${item.listId}::${item.musicInfo.id}::${index}`"
                :class="[$style.playlistPopupItem, { [$style.playlistPopupItemActive]: isCurrentPlaying(item, index) }]"
                :title="`${item.musicInfo.name} - ${item.musicInfo.singer}`"
                @click="handlePlayFromQueue(item)"
              >
                <span :class="$style.playlistPopupCover">
                  <img v-if="getCoverUrl(item.musicInfo)" :src="getCoverUrl(item.musicInfo)" alt="" loading="lazy">
                  <span v-else :class="$style.playlistPopupCoverEmpty">
                    <svg-icon name="music" />
                  </span>
                  <span :class="$style.playlistPopupPlay" @click.stop="handlePlayFromQueue(item)">
                    <svg-icon name="play" />
                  </span>
                </span>
                <span :class="$style.playlistPopupInfo">
                  <span :class="$style.playlistPopupName">
                    <span :class="$style.playlistPopupNameText">{{ item.musicInfo.name }}</span>
                    <em v-if="item.musicInfo.meta._qualitys.flac24bit" class="badge badge-theme-secondary">母带</em>
                    <em v-else-if="item.musicInfo.meta._qualitys.ape || item.musicInfo.meta._qualitys.flac || item.musicInfo.meta._qualitys.wav" class="badge badge-theme-primary">SQ</em>
                    <em v-else-if="item.musicInfo.meta._qualitys['320k']" class="badge badge-theme-secondary">HQ</em>
                  </span>
                  <span :class="$style.playlistPopupSinger" :title="item.musicInfo.singer">{{ item.musicInfo.singer }}</span>
                </span>
                <span :class="$style.playlistPopupActions">
                  <button
                    :class="[$style.playlistAction, { [$style.playlistActionLiked]: isLoved(item.musicInfo) }]"
                    aria-label="收藏到我喜欢的音乐"
                   @click.stop="toggleItemLove(item.musicInfo)"
>
                    <svg-icon :name="isLoved(item.musicInfo) ? 'heart' : 'heart-outline'" />
                  </button>
                  <button :class="$style.playlistAction" aria-label="添加到歌单" ignore-tip @click.stop="handleShowMusicAdd($event, item.musicInfo)">
                    <svg-icon name="playlist-add" />
                  </button>
                  <button :class="$style.playlistAction" aria-label="从队列中移除" ignore-tip @click.stop="handleRemoveFromQueue(index)">
                    <svg-icon name="close" />
                  </button>
                </span>
              </div>
            </div>
            <div v-else :class="$style.playlistPopupEmpty">暂无播放歌曲</div>
          </div>
        </template>
      </material-popup-btn>
    </div>
    <!-- full：贴播放栏底部的通栏进度条 -->
    <div v-if="variant === 'full'" :class="$style.progressFull">
      <common-progress-bar
        v-if="!isShowPlayerDetail"
        :class-name="$style.progressBarFull"
        :progress="progress"
        :handle-transition-end="handleTransitionEnd"
        :is-active-transition="isActiveTransition"
        :emit-playback-progress="true"
      />
    </div>
    <!-- 「添加到」锚定菜单（QQ 版式，替代旧弹窗；队列行 + 更多菜单共用） -->
    <base-menu v-model="isShowAddMenu" :menus="addMenuItems" :xy="addMenuLocation" :anchor-rect="addMenuAnchorRect" item-name="name" @menu-click="handleAddMenuClick" />
  </div>
</template>

<script>
import { computed, ref, watch } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { clipboardWriteText } from '@common/utils/electron'
import { appSetting } from '@renderer/store/setting'
import {
  isShowPlayerDetail,
  musicInfo,
  isPlay,
  playInfo,
  playMusicInfo,
  tempPlayList,
} from '@renderer/store/player/state'
import {
  togglePlay,
  playNext,
  playPrev,
  playListById,
} from '@renderer/core/player'
import {
  setShowPlayerDetail,
  setMusicInfo,
  setShowPlayComment,
  removeTempPlayList,
  clearTempPlayeList,
} from '@renderer/store/player/action'
import useLovedList from '@renderer/utils/compositions/useLovedList'
import useListAddMenu from '@renderer/utils/compositions/useListAddMenu'
import { getCoverUrl } from '@renderer/utils/compositions/useCoverLoader'
import { loveList, allMusicList } from '@renderer/store/list/state'

import { formatMusicName } from '@renderer/utils'
import { LIST_IDS } from '@common/constants'
import usePlayProgress from '@renderer/utils/compositions/usePlayProgress'
import useToggleDesktopLyric from '@renderer/utils/compositions/useToggleDesktopLyric'

const PLAY_QUALITY_LABEL = {
  '128k': '标准',
  '320k': '较高',
  flac: '极高',
  flac24bit: '无损',
}

export default {
  name: 'CorePlayBar',
  props: {
    // 进度条样式（设置项 common.playBarProgressStyle）：
    //   mini   —— 进度条较短，位于播放控制区下方（默认）
    //   middle —— 进度条较宽，占满中间控制区
    //   full   —— 进度条贴播放栏底部通栏，时间合并显示在右侧
    // 三种模式的控件区完全一致，仅进度条的摆放不同
    variant: {
      type: String,
      default: 'mini',
    },
  },
  setup() {
    const router = useRouter()
    const isLiked = ref(false)
    const isDesktopLyricOn = ref(appSetting['desktopLyric.enable'] || false)
    const moreBtnRef = ref(null)
    const qualityBtnRef = ref(null)
    const playlistBtnRef = ref(null)
    const playQueue = ref([])
    // 喜欢状态（按歌名+歌手去重，跨平台同曲不会重复收藏）
    const queueLoved = useLovedList()
    void queueLoved.loadLoved()

    const {
      nowPlayTimeStr,
      maxPlayTimeStr,
      progress,
      isActiveTransition,
      handleTransitionEnd,
    } = usePlayProgress()

    // 喜欢状态：按歌名+歌手判断（跨平台同曲视为已收藏）
    const refreshLiked = () => {
      const info = playMusicInfo.musicInfo
      if (!info) {
        isLiked.value = false
        return
      }
      isLiked.value = queueLoved.isLoved('progress' in info ? info.metadata.musicInfo : info)
    }
    watch(() => playMusicInfo.musicInfo, refreshLiked, { immediate: true })
    watch(() => allMusicList.get(loveList.id)?.length, refreshLiked)
    watch(() => [queueLoved.lovedIds.size, queueLoved.lovedKeys.size], refreshLiked)

    const title = computed(() => {
      return musicInfo.name
        ? formatMusicName(appSetting['download.fileName'], musicInfo.name, musicInfo.singer)
        : ''
    })

    const qualityLabel = computed(() => {
      return PLAY_QUALITY_LABEL[appSetting['player.playQuality']] || '标准'
    })

    const showPlayerDetail = () => {
      if (!musicInfo.id) return
      setShowPlayerDetail(true)
    }
    const handleToMusicLocation = () => {
      // 跳转到当前歌曲所在列表，并定位到该歌曲
      const listId = playMusicInfo.listId
      if (!listId || listId == LIST_IDS.DOWNLOAD || !playMusicInfo.musicInfo) {
        void router.push({ path: '/list' }).catch(() => {})
        return
      }
      if (playInfo.playIndex == -1) {
        void router.push({ path: '/list', query: { id: listId } }).catch(() => {})
        return
      }
      void router.push({
        path: '/list',
        query: { id: listId, scrollIndex: playInfo.playIndex },
      }).catch(() => {})
    }
    const handleCopy = (text) => {
      clipboardWriteText(text)
    }
    const imgError = () => { setMusicInfo({ pic: null }) }

    // ===== 喜欢 / 收藏（按歌名+歌手去重） =====
    const toggleLove = async() => {
      if (!playMusicInfo.musicInfo) return
      const info = 'progress' in playMusicInfo.musicInfo
        ? playMusicInfo.musicInfo.metadata.musicInfo
        : playMusicInfo.musicInfo
      await queueLoved.toggleLove(info)
      refreshLiked()
    }

    // ===== 播放队列（QQ 版式：行内收藏 / 添加 / 移除） =====
    const isLoved = (info) => queueLoved.isLoved(info)
    const toggleItemLove = async(info) => { await queueLoved.toggleLove(info) }
    // 「添加到」锚定菜单（与右键菜单同款卡片）
    const addMenu = useListAddMenu()
    const handleShowMusicAdd = (event, info) => {
      addMenu.openMenu(event?.currentTarget, info)
    }
    const handleClearQueue = () => {
      clearTempPlayeList()
      refreshPlayQueue()
    }

    // ===== 评论 =====
    const showComments = () => {
      if (!musicInfo.id) return
      // 评论面板在 PlayDetail 内，必须先打开详情页，再显示评论
      if (!isShowPlayerDetail.value) setShowPlayerDetail(true)
      setShowPlayComment(true)
    }

    // ===== 更多菜单 =====
    const handleMoreAction = (action) => {
      moreBtnRef.value?.hide()
      if (!musicInfo.id) return
      switch (action) {
        case 'copyName':
          handleCopy(musicInfo.name)
          break
        case 'copyInfo':
          handleCopy(`${musicInfo.name} - ${musicInfo.singer}`)
          break
        case 'goLocation':
          handleToMusicLocation()
          break
        case 'addTo':
          addMenu.openMenu(moreBtnRef.value?.$el, musicInfo)
          break
      }
    }

    // ===== 桌面歌词 =====
    const { toggleDesktopLyric } = useToggleDesktopLyric()
    const toggleLyric = () => {
      toggleDesktopLyric()
      isDesktopLyricOn.value = appSetting['desktopLyric.enable']
    }
    watch(() => appSetting['desktopLyric.enable'], (val) => {
      isDesktopLyricOn.value = val
    })

    // ===== 音效（音频可视化开关）=====
    // 改用 <common-sound-effect-btn> 组件，内置按钮 + 弹窗逻辑，
    // 这里不再需要 toggleEffects。

    // ===== 播放队列 / 当前列表 =====
    // 1) 如果当前是"稍后播放"队列，列出 tempPlayList
    // 2) 否则列出当前播放歌曲所在列表的所有歌曲
    const refreshPlayQueue = () => {
      if (playMusicInfo.isTempPlay) {
        playQueue.value = tempPlayList.map(item => ({
          listId: item.listId,
          musicInfo: 'progress' in item.musicInfo ? item.musicInfo.metadata.musicInfo : item.musicInfo,
          isTempPlay: true,
        }))
        return
      }
      const listId = playMusicInfo.listId ?? LIST_IDS.TEMP
      const list = allMusicList.get(listId) ?? []
      playQueue.value = list.map(m => ({ listId, musicInfo: m, isTempPlay: false }))
    }
    const isCurrentPlaying = (item, index) => {
      if (playMusicInfo.isTempPlay) {
        return item.listId === playMusicInfo.listId && item.musicInfo.id === playMusicInfo.musicInfo?.id
      }
      return !playMusicInfo.isTempPlay && index === playInfo.playIndex
    }
    const handlePlayFromQueue = (item) => {
      playlistBtnRef.value?.hide()
      if (item.isTempPlay) {
        // 从 tempPlayList 找到 index 然后用 playList 播放
        const idx = tempPlayList.findIndex(t => t.musicInfo.id === item.musicInfo.id && t.listId === item.listId)
        if (idx >= 0) playList(item.listId, idx)
        else playListById(item.listId, item.musicInfo.id)
      } else {
        playListById(item.listId, item.musicInfo.id)
      }
    }
    const handleRemoveFromQueue = (index) => {
      if (!playMusicInfo.isTempPlay) {
        // 来自列表的歌曲不能从队列中移除（保留列表完整性）
        playlistBtnRef.value?.hide()
        return
      }
      removeTempPlayList(index)
      refreshPlayQueue()
    }
    const formatDuration = (interval) => {
      if (!interval || isNaN(Number(interval))) return '--:--'
      const sec = Math.floor(Number(interval) / 1000)
      const m = Math.floor(sec / 60)
      const s = sec % 60
      return `${m}:${s.toString().padStart(2, '0')}`
    }

    return {
      appSetting,
      musicInfo,
      isShowPlayerDetail,
      isPlay,
      playMusicInfo,
      title,
      showPlayerDetail,
      handleToMusicLocation,
      imgError,
      togglePlay,
      playNext,
      playPrev,
      handleCopy,
      toggleLove,
      isLiked,
      showComments,
      moreBtnRef,
      handleMoreAction,
      isShowAddMenu: addMenu.isShow,
      addMenuLocation: addMenu.location,
      addMenuAnchorRect: addMenu.anchorRect,
      addMenuItems: addMenu.menus,
      handleAddMenuClick: addMenu.handleMenuClick,
      isLoved,
      toggleItemLove,
      handleShowMusicAdd,
      handleClearQueue,
      getCoverUrl,
      qualityBtnRef,
      qualityLabel,
      toggleLyric,
      isDesktopLyricOn,
      playlistBtnRef,
      playQueue,
      refreshPlayQueue,
      isCurrentPlaying,
      handlePlayFromQueue,
      handleRemoveFromQueue,
      formatDuration,
      nowPlayTimeStr,
      maxPlayTimeStr,
      progress,
      isActiveTransition,
      handleTransitionEnd,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/home-tokens.less';
@import '@renderer/assets/styles/qq-icon.less';

.player {
  position: relative;
  height: @height-player;
  box-sizing: border-box;
  display: grid;
  // 新外壳下播放栏与主面板同宽（更窄），这里放宽三档最小宽度，
  // 避免左侧歌曲信息被挤成 0 宽
  grid-template-columns: minmax(250px, 1.15fr) minmax(300px, 1.15fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--qm-sp-7, 16px);
  padding: 0 18px;
  // 跟随「皮肤透明度」：--qm-surface 由 applySkinSurface() 写入（见 store/utils.ts），
  // 与主面板同一材质。这里**必须写在本组件内**：原先只靠外层 #player 的 ID 选择器覆盖，
  // 一旦该覆盖失效就会退回不透明底色，表现为「调透明度时播放栏不跟着变」。
  background-color: var(--qm-surface, var(--color-main-background));
  // 不要毛玻璃：玻璃会把背后的内容糊成实色块，与主面板的半透明材质对不上，
  // 调透明度时看不出变化（App.vue 的 #player 也会再显式关一次，见那里的注释）
  border-top: 1px solid var(--color-border-subtle);
  user-select: none;
  contain: layout style;
  -webkit-app-region: no-drag;
  * { box-sizing: border-box; }
}

// full：进度条贴底通栏，内容略微上移给进度条让位
.fullMode {
  padding-bottom: 4px;
}

/* ========== 左：封面 + 信息 + 快捷 ========== */
.left {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  min-width: 0;
}

.cover {
  width: 50px;
  height: 50px;
  flex: none;
  border-radius: var(--qm-radius-md, 10px);
  overflow: hidden;
  background: var(--color-button-background, rgba(0,0,0,0.05));
  cursor: pointer;
  box-shadow:
    0 2px 8px rgba(0,0,0,0.10),
    inset 0 1px 0 rgba(255,255,255,0.06);
  transition: transform @transition-fast, box-shadow @transition-fast;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover {
    transform: translateY(-1px) scale(1.03);
    box-shadow:
      0 6px 16px rgba(0,0,0,0.16),
      inset 0 1px 0 rgba(255,255,255,0.06);
  }
  &:active { transform: translateY(0) scale(0.98); }
  img { width: 100%; height: 100%; object-fit: cover; }
}

.coverEmpty {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  :global(.svg-icon) { width: var(--qm-icon); height: var(--qm-icon); }
}

.info {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column;
  gap: var(--qm-sp-0, 2px);
  line-height: 1.4;
}

.title {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--color-font);
  font-weight: var(--qm-fw-semibold, 600);
  .mixin-ellipsis-1();
}

.artist {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--color-font-label, rgba(0,0,0,0.55));
  .mixin-ellipsis-1();
}

// 播放栏图标按钮：统一交互三态（默认 72% → 悬停 100% → 禁用 40%）+ 统一 20px 图标
.iconBtn {
  .qm-icon-btn();

  width: 32px;
  height: 32px;
  flex: none;
  border-radius: var(--qm-radius-sm, 8px);
  color: var(--color-font-label, rgba(0, 0, 0, 0.55));

  &:hover:not(:disabled) {
    color: var(--color-font);
    background-color: var(--color-button-background-hover, rgba(0, 0, 0, 0.06));
  }

  // 已收藏：心形用危险色（实心/描边由 heart / heart-outline 两个图标表达）
  &.liked { color: var(--color-danger); }
}

.playBtn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  box-shadow:
    0 4px 12px rgba(0,0,0,0.18),
    inset 0 1px 0 rgba(255,255,255,0.20);
  &:hover {
    background: var(--color-primary-dark-100, var(--color-primary));
    color: #fff;
    transform: translateY(-1px) scale(1.04);
    box-shadow:
      0 6px 16px rgba(0,0,0,0.22),
      inset 0 1px 0 rgba(255,255,255,0.20);
  }
  &:active { transform: scale(0.95); }
  // 主播放键：图标 24px 且始终满不透明（白三角在绿色圆钮上不能做 72% 淡化）
  :global(.svg-icon) { width: var(--qm-icon-lg); height: var(--qm-icon-lg); opacity: 1; }
  &:hover:not(:disabled) { color: #fff; }
  &:disabled {
    background: var(--qm-text-5);
    box-shadow: none;
    cursor: not-allowed;
  }
}

/* ========== 中：控制 + 进度 ========== */
.center {
  display: flex;
  flex-flow: column;
  align-items: center;
  gap: var(--qm-sp-1, 4px);
  min-width: 0;
}

.controls {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
}

// 音量放到「下一首」旁边后，两端（循环 / 音量）需要与中间三键拉开一点距离
// 只加单侧 margin：中间三键彼此的 6px 间距不变
.modeBtn {
  margin-right: 16px;
}

.volumeBtn {
  margin-left: 16px;
}

.progress {
  width: 100%;
  max-width: 560px;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--color-font-label, rgba(0,0,0,0.55));
  font-variant-numeric: tabular-nums;
}

.time { flex: none; min-width: 36px; text-align: center; }

.progressBar {
  flex: auto;
  height: 3px;
  border-radius: var(--qm-radius-chip, 999px);
  background: var(--color-button-background, rgba(0,0,0,0.08));
  cursor: pointer;
  transition: height @transition-fast;
  &:hover { height: 5px; }
}

// middle：进度条占满中间控制区，比 mini 更长
.progressWide {
  max-width: none;
}

// full：时间合并显示在右侧
.timeInline {
  flex: none;
  margin-right: var(--qm-sp-1, 4px);
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--color-font-label, rgba(0,0,0,0.55));
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

// full：贴播放栏底部的通栏进度条
.progressFull {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
}

.progressBarFull {
  width: 100%;
  height: 3px;
  background: var(--color-button-background, rgba(0,0,0,0.08));
  cursor: pointer;
  transition: height @transition-fast;
  &:hover { height: 5px; }
}

/* ========== 右：辅助操作 ========== */
.right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--qm-sp-2, 6px);
  min-width: 0;
}

.textBtn {
  height: 28px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--qm-radius-chip, 999px);
  color: var(--color-font);
  font-size: var(--qm-fs-2xs, 11px);
  font-weight: var(--qm-fw-semibold, 600);
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast, border-color @transition-fast, transform @transition-fast;
  &:hover { background-color: var(--color-accent-soft); color: var(--color-accent); border-color: var(--color-accent); }
  &:active { transform: scale(0.96); }
}

.qualityBtn {
  letter-spacing: 0.5px;
}

/* ========== 音效按钮（包装 common-sound-effect-btn） ========== */
.soundEffectBtn {
  .qm-icon-btn();

  width: 32px;
  height: 32px;
  border-radius: var(--qm-radius-sm, 8px);
  color: var(--color-font-label, rgba(0, 0, 0, 0.55));
  &:hover:not(:disabled) {
    color: var(--color-font);
    background-color: var(--color-button-background-hover, rgba(0, 0, 0, 0.06));
  }
}

/* ========== 更多菜单（结构走全局 .qm-menu，这里只定宽度） ========== */
.moreMenu {
  min-width: 150px;
}

/* ========== 播放队列弹窗（向上，仿 QQ 音乐） ========== */
.playlistPopup {
  display: flex;
  flex-flow: column nowrap;
  width: 360px;
  max-height: 420px;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--color-font);
}

.playlistPopupHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 4px;
}

.playlistPopupTitle {
  font-size: var(--qm-fs-lg, 15px);
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--qm-text-1);
  letter-spacing: .3px;
}

.playlistTool {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--qm-text-3);
  cursor: pointer;
  transition: color @transition-fast, background-color @transition-fast;

  svg { fill: none; }
  &:hover { color: var(--qm-primary); background-color: var(--qm-primary-soft); }
  :global(.svg-icon) { width: var(--qm-icon-xs); height: var(--qm-icon-xs); }
}

.playlistPopupMeta {
  padding: 0 14px 8px;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
}

.playlistPopupList {
  flex: auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 6px 8px;
}

.playlistPopupItem {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  height: 54px;
  padding: 0 8px;
  border-radius: var(--qm-radius-sm, 8px);
  cursor: pointer;
  transition: background-color @transition-fast;
  color: var(--qm-text-2);

  &:hover {
    background-color: var(--qm-hover);
    .playlistPopupPlay { opacity: 1; }
    .playlistPopupActions { opacity: 1; }
  }
}

.playlistPopupItemActive {
  background-color: var(--qm-primary-soft);

  .playlistPopupNameText { color: var(--qm-primary); font-weight: var(--qm-fw-semibold, 600); }
}

.playlistPopupCover {
  position: relative;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--qm-radius-xs, 6px);
  overflow: hidden;
  background-color: rgba(0, 0, 0, .05);

  img { display: block; width: 100%; height: 100%; object-fit: cover; }
}

.playlistPopupCoverEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--qm-text-5);
  :global(.svg-icon) { width: var(--qm-icon-sm); height: var(--qm-icon-sm); }
}

.playlistPopupPlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background-color: rgba(0, 0, 0, .42);
  opacity: 0;
  transition: opacity @transition-fast;

  svg { fill: currentColor; }
  :global(.svg-icon) { width: var(--qm-icon-xs); height: var(--qm-icon-xs); }
}

.playlistPopupInfo {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-1, 4px);
}

.playlistPopupName {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: var(--qm-fs-sm, 13px);
}

.playlistPopupNameText {
  min-width: 0;
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.playlistPopupSinger {
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-4);
  .mixin-ellipsis-1();
}

.playlistPopupActions {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-0, 2px);
  opacity: 0;
  transition: opacity @transition-fast;
}

.playlistAction {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--qm-text-3);
  cursor: pointer;
  transition: color @transition-fast, background-color @transition-fast;

  svg { fill: currentColor; }
  &:hover { color: var(--qm-primary); background-color: var(--qm-primary-soft); }
  :global(.svg-icon) { width: var(--qm-icon-xs); height: var(--qm-icon-xs); }
}

.playlistActionLiked {
  color: #f0484b;

  &:hover { color: #f0484b; background-color: rgba(240, 72, 75, .1); }
}

.playlistPopupEmpty {
  padding: 40px 12px;
  text-align: center;
  color: var(--color-font-label, rgba(0,0,0,0.45));
  font-size: var(--qm-fs-xs, 12px);
}
</style>
