<template>
  <!-- 注意：不要用 teleport 到 body——播放详情页 z-index 100 会盖住抽屉 -->
  <transition enter-active-class="animated slideInRight" leave-active-class="animated slideOutRight">
    <div v-if="show" :class="$style.queue" @click.stop>
      <!-- 标题栏：标题 + 排序 / 清空（对齐参考图） -->
      <div :class="$style.header">
        <span :class="$style.title">{{ $t('player__queue_title') }}</span>
        <div :class="$style.tools">
          <button
            type="button" :class="[$style.toolBtn, { [$style.toolBtnActive]: isShowSortMenu }]"
            :title="$t('player__queue_sort')" :aria-label="$t('player__queue_sort')" @click.stop="isShowSortMenu = !isShowSortMenu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7.4 6.4 9.3 4.1l1.9 2.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M7.4 17.6 9.3 19.9l1.9-2.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M13.8 6h5.4M13.8 12h5.4M13.8 18h5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </button>
          <button type="button" :class="$style.toolBtn" :title="$t('player__queue_clear')" :aria-label="$t('player__queue_clear')" @click.stop="handleClear">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.8 6.6h14.4M9.6 6.6V4.7h4.8v1.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M6.6 6.6 7.5 20.2h9L17.4 6.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M10.6 9.8v6.8M13.4 9.8v6.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 排序菜单 -->
      <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
        <div v-if="isShowSortMenu" :class="$style.sortMenu" @click.stop>
          <button
            v-for="opt in sortOptions" :key="opt.value" type="button"
            :class="[$style.sortItem, { [$style.sortItemActive]: sortMode === opt.value }]" @click="selectSort(opt.value)"
          >
            {{ $t(opt.labelKey) }}
          </button>
        </div>
      </transition>

      <div :class="$style.meta">
        <span :class="$style.count">{{ $t('player__queue_count', { num: queue.length }) }}</span>
      </div>

      <div ref="listRef" :class="$style.list">
        <div
          v-for="row in displayQueue"
          :key="row.key"
          :class="[$style.row, { [$style.rowActive]: row.sourceIndex === playInfo.playIndex }]"
          :data-active="row.sourceIndex === playInfo.playIndex ? '1' : null"
          :title="`${row.item.name} - ${row.item.singer}`"
          @click="playAt(row.sourceIndex)"
        >
          <div :class="$style.cover">
            <img v-if="getCoverUrl(row.item)" :src="getCoverUrl(row.item)" alt="" loading="lazy">
            <span v-else :class="$style.coverEmpty">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.5a3 3 0 1 1-2-2.8V5.2l7-1.5v8.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </span>
          </div>
          <div :class="$style.music">
            <div :class="$style.nameRow">
              <span :class="$style.name">{{ row.item.name }}</span>
              <span v-if="getQuality(row.item)" :class="[$style.tag, getQuality(row.item) === 'SQ' ? $style.isSq : $style.isGold]">{{ getQuality(row.item) }}</span>
              <span :class="$style.play">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
              </span>
            </div>
            <common-singer-link :class="$style.singer" :singer="row.item.singer" :source="row.item.source" />
          </div>
        </div>
        <div v-if="!queue.length" :class="$style.empty">{{ $t('player__queue_empty') }}</div>
      </div>
    </div>
  </transition>
</template>

<script>
import { computed, nextTick, ref, watch } from '@common/utils/vueTools'
import { LIST_IDS } from '@common/constants'
import { playList } from '@renderer/core/player'
import { allMusicList } from '@renderer/store/list/state'
import { clearListMusics } from '@renderer/store/list/action'
import { isPlay, playInfo, playMusicInfo } from '@renderer/store/player/state'
import { getCoverUrl } from '@renderer/utils/compositions/useCoverLoader'
import { dialog } from '@renderer/plugins/Dialog'
import { useI18n } from '@renderer/plugins/i18n'

// 排序方式（当前为显示层排序，不修改底层播放列表，避免影响播放索引）
const SORT_OPTIONS = [
  { value: 'default', labelKey: 'player__queue_sort_default' },
  { value: 'reverse', labelKey: 'player__queue_sort_reverse' },
]

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
    const t = useI18n()
    const listRef = ref(null)
    const queue = ref([])
    const sortMode = ref('default')
    const isShowSortMenu = ref(false)

    const listId = computed(() => playMusicInfo.listId ?? LIST_IDS.TEMP)

    // allMusicList 是 markRaw 的 Map（非响应式），因此在打开抽屉时主动取一次
    const refresh = () => {
      queue.value = allMusicList.get(listId.value) ?? []
    }

    // 行数据带 sourceIndex：倒序显示时点击仍能定位到真实的播放索引
    const displayQueue = computed(() => {
      const rows = queue.value.map((item, sourceIndex) => ({
        item,
        sourceIndex,
        key: `${sourceIndex}_${item.id}`,
      }))
      return sortMode.value === 'reverse' ? rows.slice().reverse() : rows
    })

    const scrollToActive = () => {
      const el = listRef.value?.querySelector('[data-active="1"]')
      if (!el) return
      const box = listRef.value
      box.scrollTop = el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2
    }

    watch(() => props.show, show => {
      if (!show) return
      isShowSortMenu.value = false
      refresh()
      void nextTick(scrollToActive)
    }, { immediate: true })

    watch(() => playMusicInfo.listId, () => {
      if (props.show) refresh()
    })

    const playAt = (index) => {
      playList(listId.value, index)
    }

    const sortOptions = SORT_OPTIONS
    const selectSort = (value) => {
      sortMode.value = value
      isShowSortMenu.value = false
    }

    const handleClear = async() => {
      if (!queue.value.length) return
      const confirm = await dialog.confirm({
        message: t('player__queue_clear_confirm'),
        cancelButtonText: t('cancel_button_text'),
        confirmButtonText: t('confirm_button_text'),
      }).catch(() => false)
      if (!confirm) return
      await clearListMusics([listId.value])
      refresh()
    }

    // 音质标签：仅在有对应音质信息时展示（对齐参考图歌名后的标签位）
    const getQuality = (item) => {
      const q = item?.meta?._qualitys
      if (!q) return ''
      if (q.flac24bit) return '母带'
      if (q.ape || q.flac || q.wav) return 'SQ'
      if (q['320k']) return 'HQ'
      return ''
    }
    const getQualityClass = (item) => (getQuality(item) === 'SQ' ? 'isSq' : 'isGold')

    return {
      listRef,
      queue,
      displayQueue,
      playInfo,
      isPlay,
      playAt,
      emit,
      sortMode,
      sortOptions,
      isShowSortMenu,
      selectSort,
      handleClear,
      getCoverUrl,
      getQuality,
      getQualityClass,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

// QQ 风格播放队列：贴着播放详情页右侧的抽屉（配色取自参考图实测）
// 面板 #29292B、行 #2D2D2E（隔行交替）、行高 58、封面 40
.queue {
  position: fixed;
  top: 74px;
  right: 20px;
  bottom: 118px;
  z-index: 20;
  width: 420px;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
  border-radius: var(--qm-radius-panel);
  color: rgba(255, 255, 255, .92);
  background-color: #29292B;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, .55),
    inset 0 0 0 1px rgba(255, 255, 255, .06);
  backdrop-filter: blur(20px);
}

.header {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  padding: 12px 10px 6px 14px;
}
.title {
  flex: auto;
  font-size: var(--qm-fs-xl, 16px);
  font-weight: var(--qm-fw-semibold, 600);
}
.tools {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 2px;
}
.toolBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 50%;
  color: #A9A9AA;
  background-color: transparent;
  cursor: pointer;
  transition: color var(--qm-t-fast), background-color var(--qm-t-fast);

  svg { fill: none; }
  &:hover { color: #fff; background-color: rgba(255, 255, 255, .1); }
}
.toolBtnActive {
  color: #fff;
  background-color: rgba(255, 255, 255, .1);
}

.sortMenu {
  position: absolute;
  top: 46px;
  right: 14px;
  z-index: 3;
  min-width: 120px;
  padding: 4px;
  border-radius: var(--qm-radius-sm, 8px);
  background-color: #3A3A3C;
  box-shadow: 0 12px 32px rgba(0, 0, 0, .5);
}
.sortItem {
  display: block;
  width: 100%;
  padding: 0 10px;
  height: 32px;
  border: none;
  border-radius: var(--qm-radius-2xs, 4px);
  font-size: var(--qm-fs-sm, 13px);
  text-align: left;
  color: rgba(255, 255, 255, .82);
  background-color: transparent;
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast);

  &:hover { background-color: rgba(255, 255, 255, .1); color: #fff; }
}
.sortItemActive {
  color: var(--qm-primary);

  &:hover { color: var(--qm-primary); }
}

.meta {
  flex: none;
  padding: 0 14px 10px;
}
.count {
  font-size: var(--qm-fs-xs, 12px);
  color: #A9A9AA;
}

.list {
  flex: auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 0 10px 10px;

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
  gap: var(--qm-sp-5, 12px);
  height: 58px;
  padding: 0 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color var(--qm-t-fast);

  // 隔行底色（参考图 #29292B / #2D2D2E 交替）
  &:nth-child(odd) { background-color: #2D2D2E; }
  &:hover { background-color: rgba(255, 255, 255, .07); }
}
// 当前播放行：歌名主色（参考图仅歌名染色）
.rowActive {
  .name { color: var(--qm-primary); }
}

.cover {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--qm-radius-2xs, 4px);
  overflow: hidden;
  background-color: rgba(255, 255, 255, .06);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.coverEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(255, 255, 255, .35);

  svg { width: var(--qm-icon-sm); height: var(--qm-icon-sm); fill: currentColor; }
}

.music {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 3px;
}
.nameRow {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
  min-width: 0;
}
.name {
  min-width: 0;
  overflow: hidden;
  font-size: var(--qm-fs-md, 14px);
  color: #fff;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.tag {
  flex: none;
  padding: 0 3px;
  height: 15px;
  line-height: 14px;
  font-size: 10px;
  border: 1px solid;
  border-radius: 3px;
  transform: scale(0.95);
  transform-origin: left center;
}
.isSq {
  border-color: rgba(0, 204, 101, .55);
  color: #08AE5A;
}
.isGold {
  border-color: rgba(229, 176, 70, .55);
  color: #E5B046;
}
// 行内播放按钮（参考图：灰描边小方块 + 三角）
.play {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 21px;
  height: 15px;
  border: 1px solid rgba(255, 255, 255, .38);
  border-radius: 3px;
  color: rgba(255, 255, 255, .55);

  svg { width: var(--qm-icon-xs); height: var(--qm-icon-xs); fill: currentColor; }
}
.singer {
  // 这里是 SingerLink（渲染为 span），显式保持块级：省略号截断依赖它
  display: block;
  overflow: hidden;
  font-size: var(--qm-fs-xs, 12px);
  color: #A9A9AA;
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
