<template>
  <div :class="$style.container">
    <header :class="$style.header">
      <h1 :class="$style.title">
        <svg-icon name="clock" :class="$style.titleIcon" />
        {{ $t('recent_play') }}
      </h1>
      <span :class="$style.count">{{ $t('recent__count', { num: list.length }) }}</span>

      <button
        v-if="list.length"
        type="button"
        :class="[$style.clearBtn, { [$style.clearBtnConfirm]: confirmingClear }]"
        @click="handleClearClick"
      >
        {{ confirmingClear ? $t('recent__clear_confirm') : $t('search__clear') }}
      </button>
    </header>

    <div :class="$style.body">
      <!-- 三态统一走公共组件；历史从数据库异步读取，首屏补一个加载态 -->
      <common-empty-state v-if="playHistoryLoading && !list.length" variant="loading" />
      <common-empty-state
        v-else-if="!list.length"
        icon="clock"
        :title="$t('recent__empty_title')"
        :description="$t('recent__empty_desc')"
      />
      <!-- 有数据时复用统一在线列表：虚拟滚动 / 右键菜单 / 行内操作 / 统一表头一次到位 -->
      <material-online-list
        v-else
        :page="1"
        :limit="list.length"
        :total="list.length"
        :list="list"
        :active-index="playingIndex"
        @play-list="playFrom"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from '@common/utils/vueTools'
import { isPlay, playInfo } from '@renderer/store/player/state'
import { playList } from '@renderer/core/player'
import { setTempList } from '@renderer/store/list/action'
import { LIST_IDS } from '@common/constants'
import {
  playHistoryList,
  loadPlayHistory,
  clearPlayHistoryAction,
  playHistoryLoading,
} from '@renderer/store/playHistory'

// 播放历史来自数据库（持久化），不再是播放器内存里的 playedList ——
// 后者只在随机播放模式下写入，重启即丢，导致本页在默认模式下一直为空。
const list = computed(() => playHistoryList)

// 当前播放行：让统一列表能高亮「正在播放的那首」
const playingIndex = computed(() => {
  if (!isPlay.value) return -1
  const id = playInfo.playInfo?.id
  if (!id) return -1
  return list.value.findIndex(item => item.id === id)
})

// 双击/回车播放：把整个历史列表设为播放队列，再按下标播放。
// （原实现调用 playListById(LIST_IDS.DEFAULT, idx)，把「下标」当成了歌曲 id，
//   而 playListById(listId, id) 内部是 find(m => m.id == id)，永远匹配不到 → 点了没反应。）
const playFrom = async(index) => {
  if (!list.value.length) return
  await setTempList('recent_play', [...list.value])
  playList(LIST_IDS.TEMP, index)
}

// 清空做了两步确认：首次点击变为「确认清空？」，3 秒内再点才真正清空。
// 不做成一步到位，是因为播放历史同时是个性化推荐的输入，误清代价较高；
// 也不用弹窗 —— 清空后页面立刻切成空态，弹窗会显得过重。
const confirmingClear = ref(false)
let clearTimer = null

const handleClearClick = () => {
  if (!confirmingClear.value) {
    confirmingClear.value = true
    clearTimer = setTimeout(() => { confirmingClear.value = false }, 3000)
    return
  }
  if (clearTimer) clearTimeout(clearTimer)
  confirmingClear.value = false
  void clearPlayHistoryAction()
}

onMounted(() => {
  // 进页面时若尚未加载（例如直接刷新到本页），补一次读取
  void loadPlayHistory()
})

onBeforeUnmount(() => {
  if (clearTimer) clearTimeout(clearTimer)
})
</script>

<style lang="less" module>
.container {
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  overflow: hidden;
  background-color: var(--qm-surface);
}

.header {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  padding: 20px 24px 12px;
  border-bottom: 1px solid var(--qm-line-1);
}

.title {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  margin: 0;
  font-size: var(--qm-fs-3xl, 20px);
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
}

.titleIcon {
  width: 20px;
  height: 20px;
  color: var(--qm-primary);
  fill: currentColor;
}

.count {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
  font-variant-numeric: tabular-nums;
}

.clearBtn {
  margin-left: auto;
  padding: 5px 14px;
  border: 1px solid var(--qm-line-2);
  border-radius: var(--qm-radius-chip, 999px);
  background: transparent;
  color: var(--qm-text-3);
  font-size: var(--qm-fs-xs, 12px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast), border-color var(--qm-t-fast);

  &:hover {
    background-color: var(--qm-hover);
    color: var(--qm-text-1);
  }
}

// 二次确认态：用警示色提示这是一次不可撤销的操作
.clearBtnConfirm {
  border-color: var(--color-danger, #f44336);
  color: var(--color-danger, #f44336);
  background-color: transparent;

  &:hover {
    background-color: color-mix(in srgb, var(--color-danger, #f44336) 10%, transparent);
    color: var(--color-danger, #f44336);
  }
}

.body {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
}
</style>
