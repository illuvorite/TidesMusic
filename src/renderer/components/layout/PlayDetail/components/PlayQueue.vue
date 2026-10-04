<template>
  <!-- 注意：不要用 teleport 到 body——播放详情页 z-index 100 会盖住抽屉 -->
  <transition enter-active-class="animated slideInRight" leave-active-class="animated slideOutRight">
    <div v-if="show" :class="$style.queue" @click.stop>
      <div :class="$style.header">
        <span :class="$style.title">播放队列</span>
        <span :class="$style.count">共 {{ queue.length }} 首</span>
        <button :class="$style.closeBtn" :aria-label="$t('close')" :title="$t('close')" @click="emit('close')">
          <svg width="13" height="13" viewBox="0 0 24 24" space="preserve">
            <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
      <div ref="listRef" :class="$style.list">
        <div
          v-for="(item, index) in queue"
          :key="`${index}_${item.id}`"
          :class="[$style.row, { [$style.rowActive]: index === playInfo.playIndex }]"
          :data-active="index === playInfo.playIndex ? '1' : null"
          :title="`${item.name} - ${item.singer}`"
          @click="playAt(index)"
        >
          <span :class="$style.index">
            <span v-if="index === playInfo.playIndex && isPlay" :class="$style.wave">♪</span>
            <template v-else>{{ index + 1 }}</template>
          </span>
          <div :class="$style.music">
            <p :class="$style.name">{{ item.name }}</p>
            <p :class="$style.singer">{{ item.singer }}</p>
          </div>
        </div>
        <div v-if="!queue.length" :class="$style.empty">播放队列为空</div>
      </div>
    </div>
  </transition>
</template>

<script>
import { nextTick, ref, watch } from '@common/utils/vueTools'
import { LIST_IDS } from '@common/constants'
import { playList } from '@renderer/core/player'
import { allMusicList } from '@renderer/store/list/state'
import { isPlay, playInfo, playMusicInfo } from '@renderer/store/player/state'

export default {
  name: 'PlayQueue',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const listRef = ref(null)
    const queue = ref([])

    // allMusicList 是 markRaw 的 Map（非响应式），因此在打开抽屉时主动取一次
    const refresh = () => {
      const listId = playMusicInfo.listId ?? LIST_IDS.DEFAULT
      queue.value = allMusicList.get(listId) ?? []
    }

    const scrollToActive = () => {
      const el = listRef.value?.querySelector('[data-active="1"]')
      if (el) el.scrollIntoView({ block: 'center' })
    }

    watch(() => props.show, show => {
      if (!show) return
      refresh()
      void nextTick(scrollToActive)
    }, { immediate: true })

    watch(() => playMusicInfo.listId, () => {
      if (props.show) refresh()
    })

    const playAt = (index) => {
      const listId = playMusicInfo.listId ?? LIST_IDS.DEFAULT
      playList(listId, index)
    }

    return {
      listRef,
      queue,
      playInfo,
      isPlay,
      playAt,
      emit,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

// QQ 风格播放队列：贴着播放详情页右侧的深色玻璃抽屉
.queue {
  position: fixed;
  top: 74px;
  right: 20px;
  bottom: 118px;
  z-index: 20;
  width: 330px;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
  border-radius: var(--qm-radius-panel);
  color: rgba(255, 255, 255, .92);
  background-color: rgba(24, 27, 33, .96);
  box-shadow:
    0 24px 64px rgba(0, 0, 0, .55),
    inset 0 0 0 1px rgba(255, 255, 255, .08);
  backdrop-filter: blur(20px);
}

.header {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  padding: 14px 14px 10px 16px;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, .07);
}
.title {
  font-size: var(--qm-fs-lg, 15px);
  font-weight: var(--qm-fw-semibold, 600);
}
.count {
  flex: auto;
  font-size: var(--qm-fs-xs, 12px);
  color: rgba(255, 255, 255, .42);
}
.closeBtn {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  color: rgba(255, 255, 255, .6);
  background-color: transparent;
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast;

  svg { fill: currentColor; }
  &:hover {
    color: #fff;
    background-color: rgba(255, 255, 255, .12);
  }
}

.list {
  flex: auto;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 8px 10px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb {
    border-radius: var(--qm-radius-2xs, 4px);
    background-color: rgba(255, 255, 255, .16);
  }
}

.row {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  height: 44px;
  padding: 0 10px;
  border-radius: var(--qm-radius-sm, 8px);
  cursor: pointer;
  transition: background-color @transition-fast;

  &:hover { background-color: rgba(255, 255, 255, .08); }
}
// 当前播放行：QQ 绿字 + 左侧绿条
.rowActive {
  background-color: rgba(49, 194, 124, .12);

  .index { color: var(--qm-primary); }
  .name { color: var(--qm-primary); }
  .singer { color: rgba(49, 194, 124, .66); }

  &:hover { background-color: rgba(49, 194, 124, .18); }
}

.index {
  flex: none;
  width: 22px;
  font-size: var(--qm-fs-xs, 12px);
  text-align: center;
  color: rgba(255, 255, 255, .34);
}
.wave {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-primary);
}

.music {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-0, 2px);
}
.name {
  margin: 0;
  overflow: hidden;
  font-size: 13.5px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.singer {
  margin: 0;
  overflow: hidden;
  font-size: var(--qm-fs-xs, 12px);
  color: rgba(255, 255, 255, .45);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.empty {
  padding: 40px 0;
  font-size: var(--qm-fs-sm, 13px);
  text-align: center;
  color: rgba(255, 255, 255, .35);
}
</style>
