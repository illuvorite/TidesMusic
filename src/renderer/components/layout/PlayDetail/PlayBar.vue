<template>
  <div :class="$style.footer">
    <!-- 第一排：左侧功能区 / 中间播放控制 / 右侧附加功能 -->
    <div :class="$style.row">
      <!-- 左侧：歌曲信息 + 喜欢 + 评论 -->
      <div :class="$style.leftGroup">
        <div :class="$style.info">
          <img v-if="musicInfo.pic" :class="$style.infoImg" :src="musicInfo.pic" />
          <div :class="$style.infoText">
            <div :class="$style.infoName">{{ musicInfo.name }}</div>
            <div :class="$style.infoSinger">{{ musicInfo.singer }}</div>
          </div>
        </div>
        <div :class="$style.leftActions">
          <button
            :class="[$style.likeBtn, { [$style.iconBtnActive]: isLiked }]"
            :aria-label="isLiked ? '取消喜欢' : $t('list__collect')"
            :disabled="!playMusicInfo.musicInfo"
            :title="isLiked ? '取消喜欢' : $t('list__collect')"
            @click="toggleLove"
          >
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xlink="http://www.w3.org/1999/xlink"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              space="preserve"
            >
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
          </button>
          <button
            :class="[$style.iconBtn, { [$style.iconBtnActive]: isShowPlayComment }]"
            :aria-label="$t('comment__show')"
            :title="$t('comment__show')"
            @click="toggleComment"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 24 24" space="preserve">
              <use xlink:href="#icon-comment" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 中间：循环 / 上一首 / 播放-暂停 / 下一首 / 音量（必须居中） -->
      <div :class="$style.centerGroup">
        <common-toggle-play-mode-btn :class="$style.modeBtn" />
        <button :class="$style.playBtnPrev" :aria-label="$t('player__prev')" :title="$t('player__prev')" @click="playPrev()">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 1024 1024" space="preserve">
            <use xlink:href="#icon-prevMusic" />
          </svg>
        </button>
        <button :class="$style.mainPlayBtn" :aria-label="isPlay ? $t('player__pause') : $t('player__play')" :title="isPlay ? $t('player__pause') : $t('player__play')" @click="togglePlay">
          <svg v-if="isPlay" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 1024 1024" space="preserve">
            <use xlink:href="#icon-pause" />
          </svg>
          <svg v-else version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 1024 1024" space="preserve">
            <use xlink:href="#icon-play" />
          </svg>
        </button>
        <button :class="$style.playBtnNext" :aria-label="$t('player__next')" :title="$t('player__next')" @click="playNext()">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 1024 1024" space="preserve">
            <use xlink:href="#icon-nextMusic" />
          </svg>
        </button>
        <common-volume-btn :class="$style.volumeBtn" />
      </div>

      <!-- 右侧：歌词 / 音频可视化 / 歌词文本选择 / 音效 / 播放倍率 / 添加到 -->
      <div :class="$style.rightGroup">
        <control-btns />
      </div>
    </div>

    <!-- 第二排：通栏进度条（左：当前时间 / 中：可拖拽进度 / 右：总时长） -->
    <div :class="$style.progressRow">
      <span :class="$style.timeLabel">{{ nowPlayTimeStr }}</span>
      <div :class="$style.progressBarWrap">
        <common-progress-bar
          :class-name="$style.progressBar"
          :progress="progress"
          :handle-transition-end="handleTransitionEnd"
          :is-active-transition="isActiveTransition"
          :emit-playback-progress="true"
        />
        <!-- 拖拽圆点：始终跟随当前播放进度，让进度位置一眼可见 -->
        <div :class="$style.progressThumb" :style="thumbStyle" />
      </div>
      <span :class="$style.timeLabel">{{ maxPlayTimeStr }}</span>
    </div>

    <!-- 状态文案（保持原可见行为，置于右下角） -->
    <div :class="$style.statusLabel">{{ status }}</div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from '@common/utils/vueTools'
import { playNext, playPrev, togglePlay } from '@renderer/core/player'
import { status, isPlay, playMusicInfo, isShowPlayComment, musicInfo } from '@renderer/store/player/state'
import { setShowPlayComment, setShowPlayerDetail } from '@renderer/store/player/action'
import { addListMusics, removeListMusics, checkListExistMusic } from '@renderer/store/list/action'
import { loveList, allMusicList } from '@renderer/store/list/state'
import usePlayProgress from '@renderer/utils/compositions/usePlayProgress'

import ControlBtns from './components/ControlBtns.vue'

const {
  nowPlayTimeStr,
  maxPlayTimeStr,
  progress,
  isActiveTransition,
  handleTransitionEnd,
} = usePlayProgress()

// 进度圆点位置：0~1 的播放进度 → 百分比
const thumbStyle = computed(() => ({
  left: `${Math.min(Math.max(progress.value || 0, 0), 1) * 100}%`,
}))

// ===== 喜欢 / 收藏 =====
const isLiked = ref(false)
const refreshLiked = async() => {
  if (!playMusicInfo.musicInfo) {
    isLiked.value = false
    return
  }
  isLiked.value = await checkListExistMusic(loveList.id, playMusicInfo.musicInfo.id)
}
watch(() => playMusicInfo.musicInfo, () => { void refreshLiked() }, { immediate: true })
watch(() => allMusicList.get(loveList.id)?.length, () => { void refreshLiked() })

const toggleLove = async() => {
  if (!playMusicInfo.musicInfo) return
  const info = 'progress' in playMusicInfo.musicInfo
    ? playMusicInfo.musicInfo.metadata.musicInfo
    : playMusicInfo.musicInfo
  if (isLiked.value) {
    await removeListMusics({ listId: loveList.id, ids: [info.id] })
    isLiked.value = false
  } else {
    await addListMusics(loveList.id, [info])
    isLiked.value = true
  }
}

// ===== 评论 =====
const toggleComment = () => {
  if (!playMusicInfo.musicInfo?.id) return
  if (!isShowPlayComment.value) {
    // 评论面板在 PlayDetail 内，必须先打开详情页，再显示评论
    if (!isShowPlayerDetail.value) setShowPlayerDetail(true)
    setShowPlayComment(true)
  } else {
    setShowPlayComment(false)
  }
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.footer {
  flex: 0 0 120px;
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  align-items: stretch;
  justify-content: center;
  padding: 0 24px;
  overflow: hidden;
  gap: var(--qm-sp-2, 6px);
}

// 第一排 / 第二排：采用 3 列网格 1fr auto 1fr，让中间列在父容器中绝对居中
.row {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-width: 0;
}

// ===== 左：歌曲信息 + 喜欢 + 评论 =====
.leftGroup {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 18px;
  justify-self: start;
  min-width: 0;
}

.info {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  min-width: 0;
  max-width: 280px;
}

.infoImg {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: var(--qm-radius-sm, 8px);
  object-fit: cover;
  background-color: var(--qm-hover);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.infoText {
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  min-width: 0;
}

.infoName {
  font-size: var(--qm-fs-md, 14px);
  line-height: 1.3;
  color: var(--qm-text-2);
  font-weight: var(--qm-fw-medium, 500);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.infoSinger {
  font-size: var(--qm-fs-xs, 12px);
  line-height: 1.3;
  color: var(--qm-text-4);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.leftActions {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
}

// ===== 中：循环 / 上一首 / 播放暂停 / 下一首 / 音量（必须居中） =====
// 间距规则：循环 ↔ 上一首 = 50px / 上一首 ↔ 主播放 = 12px
//         主播放 ↔ 下一首 = 12px / 下一首 ↔ 音量 = 50px
.centerGroup {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: center;
  height: 42px;
  justify-self: center;
}

// 循环 / 音量：20×20
.modeBtn,
.volumeBtn {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity @transition-normal;
  &:hover { opacity: 1; }
}

// 上一首：30×30，距循环 50px
.playBtnPrev {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  margin-left: 50px;
  margin-right: var(--qm-sp-5, 12px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qm-text-3);
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  opacity: 0.9;
  transition: opacity @transition-normal, transform @transition-fast;
  svg {
    fill: currentColor;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.2));
  }
  &:hover { opacity: 1; }
  &:active { transform: scale(0.94); opacity: 0.7; }
}

// 主播放/暂停：42×42
.mainPlayBtn {
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qm-text-3);
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  transition: opacity @transition-normal, transform @transition-fast, background-color @transition-normal;
  svg {
    fill: currentColor;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.25));
  }
  &:hover {
    background-color: var(--qm-hover);
  }
  &:active { transform: scale(0.94); }
}

// 下一首：30×30，距主播放 12px，距音量 50px
.playBtnNext {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  margin-left: var(--qm-sp-5, 12px);
  margin-right: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qm-text-3);
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  opacity: 0.9;
  transition: opacity @transition-normal, transform @transition-fast;
  svg {
    fill: currentColor;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.2));
  }
  &:hover { opacity: 1; }
  &:active { transform: scale(0.94); opacity: 0.7; }
}

// ===== 右：附加功能按钮组（歌词 / 音频可视化 / 歌词文本选择 / 音效 / 播放倍率 / 添加到） =====
.rightGroup {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-self: end;
}

// ===== 第二排：通栏进度条（左侧时间 / 中部拖拽条 / 右侧时长） =====
.progressRow {
  flex: 0 0 auto;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  width: 100%;
  padding: 0 2px;
}

.timeLabel {
  flex: 0 0 auto;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
  font-variant-numeric: tabular-nums;
  min-width: 44px;
  text-align: center;
}

.progressBarWrap {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  height: 16px;
  display: flex;
  align-items: center;
}

.progressBar {
  width: 100%;
}

// 拖拽圆点：跟随当前播放进度，让进度位置一眼可见
.progressThumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  border-radius: 50%;
  background-color: var(--progress-fill, #fff);
  transform: translateY(-50%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, .35);
  pointer-events: none;
  transition: left .12s linear;
}

// 通用圆形小图标按钮（我喜欢 / 评论），统一尺寸 20×20
.iconBtn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--qm-text-2);
  opacity: 0.55;
  border-radius: 50%;
  transition: opacity @transition-normal, color @transition-normal, background-color @transition-normal;
  &:hover:not(:disabled) {
    opacity: 1;
    background-color: var(--qm-hover);
  }
  &:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }
  svg {
    fill: currentColor;
  }
}
.iconBtnActive {
  opacity: 1;
  color: var(--color-primary, var(--qm-text-3));
}

// 我喜欢：固定尺寸 20×20，未喜欢时灰色，喜欢时高亮红色
// 路径数据内联绘制，避免 <use>+sprite 引用在某些渲染场景下不显示的问题
.likeBtn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  opacity: 1;
  color: var(--qm-text-4);
  transition: color @transition-normal, transform @transition-fast, opacity @transition-normal;
  svg {
    fill: currentColor;
    display: block;
    pointer-events: none;
    transition: transform @transition-fast;
  }
  &:hover:not(:disabled) {
    color: #ff4d6d;
    transform: scale(1.1);
  }
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  &.iconBtnActive,
  &[data-active="true"] {
    color: #ff4d6d;
    opacity: 1;
    filter: drop-shadow(0 0 2px rgba(255, 77, 109, 0.4));
  }
}

// ===== 状态文案（保留以兼容现有状态栏） =====
.statusLabel {
  position: absolute;
  right: 24px;
  bottom: 4px;
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-4);
  opacity: 0.7;
  pointer-events: none;
  max-width: 30%;
  text-align: right;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
