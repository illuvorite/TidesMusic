<template>
  <div :class="$style.container">
    <header :class="[$style.header, { [$style.headerCollapsed]: isHeadCollapsed }]">
      <h1 :class="$style.title">最近播放</h1>
      <span :class="$style.count">共 {{ displayedList.length }} 首</span>
    </header>
    <div ref="dom_scroll" :class="$style.content" class="scroll" @scroll="handleHeadScroll">
      <div v-if="!displayedList.length" :class="$style.empty">
        <svg-icon name="clock" :class="$style.emptyIcon" />
        <p>还没有播放记录</p>
        <p :class="$style.emptyHint">播放歌曲后会在这里显示</p>
      </div>
      <template v-else>
        <div class="thead">
          <table>
            <thead>
              <tr>
                <th class="nobreak">
                  <span>歌名 / 歌手</span>
                  <svg class="thead-sort" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                    <path d="M5.4 6.6 8 3.4l2.6 3.2z" fill="currentColor" />
                    <path d="M5.4 9.4 8 12.6l2.6-3.2z" fill="currentColor" />
                  </svg>
                </th>
                <th class="nobreak" style="width: 27%;">专辑</th>
                <th class="nobreak" style="width: 10%;">时长</th>
              </tr>
            </thead>
          </table>
        </div>
        <ul class="list">
          <li
            v-for="(item, index) in displayedList" :key="`${item.musicInfo?.id || ''}_${index}`"
            class="list-item" :class="{ active: isPlaying(item), 'row-alt': index % 2 === 1 }"
            @dblclick="playMusic(item)"
          >
            <div class="list-item-cell cover">
              <div class="row-cover">
                <img v-if="getCoverUrl(item.musicInfo)" :src="getCoverUrl(item.musicInfo)" alt="" loading="lazy">
                <span v-else class="row-cover-empty"><svg-icon name="music" /></span>
                <span class="row-cover-play" @click.stop="playMusic(item)">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
                </span>
              </div>
            </div>
            <div class="list-item-cell auto name">
              <div class="name-wrap">
                <div class="name-main">
                  <span class="select name" :title="item.musicInfo?.name">{{ item.musicInfo?.name || '—' }}</span>
                  <button type="button" class="row-play" aria-label="播放" title="播放" @click.stop="playMusic(item)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
                  </button>
                </div>
                <div class="name-sub">
                  <span class="select name-sub-text" :title="item.musicInfo?.singer">{{ item.musicInfo?.singer || '—' }}</span>
                </div>
              </div>
            </div>
            <div class="list-item-cell actions">
              <material-list-buttons
                :index="index" :play-btn="false" :download-btn="false" :more-btn="false" :list-add-btn="false"
                :liked="isLoved(item.musicInfo)" @btn-click="handleRowBtn"
              />
            </div>
            <div class="list-item-cell" style="flex: 0 0 27%;"><span class="select" :title="item.musicInfo?.meta?.albumName">{{ item.musicInfo?.meta?.albumName || '—' }}</span></div>
            <div class="list-item-cell" style="flex: 0 0 10%;"><span class="no-select">{{ formatInterval(item.musicInfo?.interval) }}</span></div>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script>
import { computed } from '@common/utils/vueTools'
import { isPlay, playInfo } from '@renderer/store/player/state'
import { allMusicList, defaultList } from '@renderer/store/list/state'
import { playListById } from '@renderer/core/player'
import { LIST_IDS } from '@common/constants'
import useLovedList from '@renderer/utils/compositions/useLovedList'
import useHeadCollapse from '@renderer/utils/compositions/useHeadCollapse'
import { getCoverUrl } from '@renderer/utils/compositions/useCoverLoader'

export default {
  name: 'Recent',
  setup() {
    // 页头滚动收起：下滑自动收起，上滑 / 回到顶部恢复
    const { isHeadCollapsed, handleHeadScroll } = useHeadCollapse()
    // 收藏（我喜欢）——行内红心按钮
    const { isLoved, loadLoved, toggleLove } = useLovedList()
    void loadLoved()
    // 「最近播放」直接展示试听列表（default list）的内容：
    // 试听列表的本义就是「最近听过的歌」，且删除其独立入口后歌曲应在此处可见。
    // 此前数据源是 playedList（纯内存播放历史，重启即空、从不持久化），所以总是 0 首。
    const displayedList = computed(() => {
      const src = allMusicList.get(defaultList.id) ?? []
      return src.map(m => ({ musicInfo: m }))
    })

    const isPlaying = (item) => {
      return isPlay.value && playInfo.value.playInfo?.id === item.musicInfo?.id
    }

    const playMusic = (item) => {
      if (!item.musicInfo) return
      const ids = displayedList.value.map(it => it.musicInfo.id)
      const idx = ids.indexOf(item.musicInfo.id)
      if (idx < 0) return
      try {
        playListById(LIST_IDS.DEFAULT, idx)
      } catch (err) {
        console.error('playMusic failed:', err)
      }
    }

    const formatInterval = (val) => {
      // 各源 interval 格式不统一：wy/tx 是秒数（或数字字符串），kw 是 "03:45" 这类
      // mm:ss 字符串；此前直接按秒计算导致 mm:ss 字符串算出 NaN:NaN。
      if (val == null || val === '') return '--:--'
      if (typeof val === 'string') {
        const match = val.match(/^(\d{1,3}):([0-5]?\d)$/)
        if (match) return `${parseInt(match[1], 10)}:${match[2].padStart(2, '0')}`
        const num = Number(val)
        if (Number.isNaN(num)) return '--:--'
        val = num
      }
      if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) return '--:--'
      const m = Math.floor(val / 60)
      const s = Math.floor(val % 60)
      return `${m}:${s.toString().padStart(2, '0')}`
    }

    const handleRowBtn = ({ action, index }) => {
      const item = displayedList.value[index]
      if (!item) return
      if (action === 'like') void toggleLove(item.musicInfo)
    }

    return {
      displayedList,
      isHeadCollapsed,
      handleHeadScroll,
      isPlaying,
      playMusic,
      formatInterval,
      getCoverUrl,
      isLoved,
      handleRowBtn,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  overflow: hidden;
  background-color: var(--qm-surface, var(--color-content-background));
}

.header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  // 与列表行同宽内缩（参考图内容区 +34px）
  padding: 26px 34px 18px;
  flex: none;
  overflow: hidden;
  max-height: 120px;
  transition: max-height .3s ease, opacity .22s ease, padding .3s ease;
}

.headerCollapsed {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.title {
  margin: 0;
  padding-left: 10px;
  font-size: 30px;
  line-height: 1.05;
  font-weight: var(--qm-fw-bold, 700);
  letter-spacing: .5px;
  color: var(--qm-text-1);
}

.count {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--color-font-label, rgba(0,0,0,0.55));
  font-variant-numeric: tabular-nums;
}

.content {
  flex: auto;
  min-height: 0;
  overflow: auto;
  padding: 0 34px;
}

.empty {
  display: flex;
  flex-flow: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-font-label, rgba(0,0,0,0.45));
  font-size: var(--qm-fs-md, 14px);
  gap: var(--qm-sp-3, 8px);
}

.emptyIcon {
  width: 64px;
  height: 64px;
  opacity: 0.4;
  fill: currentColor;
}

.emptyHint {
  font-size: var(--qm-fs-xs, 12px);
  opacity: 0.7;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--color-font);
}

.table th {
  text-align: left;
  padding: 10px 16px;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--color-font-label, rgba(0,0,0,0.55));
  font-weight: var(--qm-fw-medium, 500);
  border-bottom: 1px solid var(--color-divider, rgba(0,0,0,0.06));
}

.table td {
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-divider, rgba(0,0,0,0.04));
}

.row {
  cursor: pointer;
  transition: background-color 150ms ease;
}

.row:hover {
  background-color: var(--color-button-background-hover, rgba(0,0,0,0.04));
}

.row.active {
  background-color: var(--color-primary-light-300-alpha-700, rgba(0,0,0,0.04));
}

.thNum, .tdNum {
  width: 60px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--color-font-label, rgba(0,0,0,0.55));
}

.thSinger, .tdSinger {
  width: 20%;
}

.thAlbum, .tdAlbum {
  width: 25%;
  color: var(--color-font-label, rgba(0,0,0,0.65));
}

.thTime, .tdTime {
  width: 80px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--color-font-label, rgba(0,0,0,0.55));
}

.playingIcon {
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
