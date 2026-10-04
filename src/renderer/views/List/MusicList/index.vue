<template>
  <div :class="$style.list">
    <!-- QQ 版式页头（两段式）：页签 → 操作行；下滑列表时整体收起，上滑/回顶恢复 -->
    <header :class="[$style.head, { [$style.headCollapsed]: isHeadCollapsed }]">
      <nav :class="$style.tabs">
        <span :class="[$style.tab, $style.tabActive]">歌曲{{ list.length }}</span>
        <span :class="$style.tab">歌单{{ userLists.length }}</span>
        <span :class="$style.tab">专辑{{ albumCount }}</span>
        <span :class="$style.tab">有声节目0</span>
        <span :class="$style.tab">视频0</span>
      </nav>
      <div :class="$style.actions">
        <button type="button" :class="$style.btnPrimary" :disabled="!list.length" @click="playAllMusics">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
          播放
        </button>
        <button type="button" :class="$style.btnGhost" :disabled="!list.length" @click="downloadSelected">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M12 4v11m0 0l-4-4m4 4l4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 19h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          下载
        </button>
        <button type="button" :class="$style.btnGhost" :disabled="!list.length" @click="toggleSelectAll">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          {{ selectedList.length ? `已选${selectedList.length}` : '批量' }}
        </button>
        <span :class="$style.spacer" />
        <button type="button" :class="$style.iconBtn" aria-label="搜索" title="在列表中搜索" @click="isShowSearchBar = true">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="10.6" cy="10.6" r="5.7" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="M14.9 14.9 19.5 19.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
        <button type="button" :class="$style.iconBtn" aria-label="回到顶部" title="回到顶部" @click="scrollToTop">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 19V6m0 0l-5 5m5-5l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </header>
    <div class="thead">
      <table>
        <thead>
          <!-- 参考图列头：歌曲/歌手（含排序指示）· 专辑 · 时长；无序号列 -->
          <tr>
            <th class="nobreak">
              <span>{{ $t('music_name') }} / {{ $t('music_singer') }}</span>
              <svg class="thead-sort" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                <path d="M5.4 6.6 8 3.4l2.6 3.2z" fill="currentColor" />
                <path d="M5.4 9.4 8 12.6l2.6-3.2z" fill="currentColor" />
              </svg>
            </th>
            <th class="nobreak" style="width: 27%;">{{ $t('music_album') }}</th>
            <th class="nobreak" style="width: 10%;">{{ $t('music_time') }}</th>
          </tr>
        </thead>
      </table>
    </div>
    <div v-show="list.length" ref="dom_listContent" :class="$style.content">
      <base-virtualized-list
        v-if="actionButtonsVisible" ref="listRef" v-slot="{ item, index }" :list="list" key-name="id"
        :item-height="listItemHeight" container-class="scroll" content-class="list"
        @scroll="onListScroll" @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item" :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }, { 'row-alt': index % 2 === 1 }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell cover">
            <div class="row-cover">
              <img v-if="getCoverUrl(item)" :src="getCoverUrl(item)" alt="" loading="lazy">
              <span v-else class="row-cover-empty">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.5a3 3 0 1 1-2-2.8V5.2l7-1.5v8.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </span>
              <span class="row-cover-play" @click.stop="handlePlayMusic(index, true)">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
              </span>
            </div>
          </div>
          <div class="list-item-cell auto name">
            <div class="name-wrap">
              <div class="name-main">
                <span class="select name">{{ item.name }}</span>
                <span v-if="item.meta._qualitys.flac24bit" class="no-select badge badge-theme-secondary">母带</span>
                <span v-else-if="item.meta._qualitys.ape || item.meta._qualitys.flac || item.meta._qualitys.wav" class="no-select badge badge-theme-primary">SQ</span>
                <span v-else-if="item.meta._qualitys['320k']" class="no-select badge badge-theme-secondary">HQ</span>
                <span v-if="isShowSource" class="no-select badge badge-theme-tertiary">{{ item.source }}</span>
                <button
                  type="button" class="row-play" :aria-label="$t('list__play')" :title="$t('list__play')"
                  @click.stop="handlePlayMusic(index, true)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
                </button>
              </div>
              <div class="name-sub">
                <span class="select name-sub-text" :aria-label="item.singer">{{ item.singer }}</span>
              </div>
            </div>
          </div>
          <div class="list-item-cell actions">
            <material-list-buttons
              :index="index" :play-btn="false" :liked="isLoved(item)"
              :download-btn="assertApiSupport(item.source) && item.source != 'local'" @btn-click="handleListBtnClick"
            />
          </div>
          <div class="list-item-cell" style="flex: 0 0 27%;"><span class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 10%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
        </div>
      </base-virtualized-list>
      <base-virtualized-list
        v-else ref="listRef" v-slot="{ item, index }" :list="list" key-name="id"
        :item-height="listItemHeight" container-class="scroll" content-class="list"
        @scroll="onListScroll" @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item"
          :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }, { 'row-alt': index % 2 === 1 }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell cover">
            <div class="row-cover">
              <img v-if="getCoverUrl(item)" :src="getCoverUrl(item)" alt="" loading="lazy">
              <span v-else class="row-cover-empty">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.5a3 3 0 1 1-2-2.8V5.2l7-1.5v8.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </span>
              <span class="row-cover-play" @click.stop="handlePlayMusic(index, true)">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
              </span>
            </div>
          </div>
          <div class="list-item-cell auto name">
            <div class="name-wrap">
              <div class="name-main">
                <span class="select name">{{ item.name }}</span>
                <span v-if="item.meta._qualitys.flac24bit" class="no-select badge badge-theme-secondary">母带</span>
                <span v-else-if="item.meta._qualitys.ape || item.meta._qualitys.flac || item.meta._qualitys.wav" class="no-select badge badge-theme-primary">SQ</span>
                <span v-else-if="item.meta._qualitys['320k']" class="no-select badge badge-theme-secondary">HQ</span>
                <span v-if="isShowSource" class="no-select badge badge-theme-tertiary">{{ item.source }}</span>
                <button
                  type="button" class="row-play" :aria-label="$t('list__play')" :title="$t('list__play')"
                  @click.stop="handlePlayMusic(index, true)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
                </button>
              </div>
              <div class="name-sub">
                <span class="select name-sub-text" :aria-label="item.singer">{{ item.singer }}</span>
              </div>
            </div>
          </div>
          <div class="list-item-cell actions">
            <material-list-buttons
              :index="index" :play-btn="false" :liked="isLoved(item)"
              :download-btn="assertApiSupport(item.source) && item.source != 'local'" @btn-click="handleListBtnClick"
            />
          </div>
          <div class="list-item-cell" style="flex: 0 0 27%;"><span class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 10%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
        </div>
      </base-virtualized-list>
    </div>
    <div v-show="!list.length" :class="['qm-empty', $style.noItem]">
      <p v-text="$t('no_item')" />
    </div>
    <common-list-add-modal
      v-model:show="isShowListAdd" :is-move="isMove" :from-list-id="listId"
      :music-info="selectedAddMusicInfo" :exclude-list-id="excludeListIds" teleport="#view"
    />
    <common-list-add-multiple-modal
      v-model:show="isShowListAddMultiple" :from-list-id="listId"
      :is-move="isMoveMultiple" :music-list="selectedList" :exclude-list-id="excludeListIds" teleport="#view" @confirm="removeAllSelect"
    />
    <common-download-modal v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view" :list-id="listId" />
    <common-download-multiple-modal v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view" :list-id="listId" @confirm="removeAllSelect" />
    <search-list :list="list" :visible="isShowSearchBar" @action="handleMusicSearchAction" />
    <music-sort-modal v-model:show="isShowMusicSortModal" :music-info="selectedSortMusicInfo" :selected-num="selectedNum" @confirm="sortMusic" />
    <music-toggle-modal v-model:show="isShowMusicToggleModal" :music-info="selectedToggleMusicInfo" @toggle="toggleSource" />
    <base-menu v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
    <base-menu v-model="isShowAddMenu" :menus="addMenuItems" :xy="addMenuLocation" :anchor-rect="addMenuAnchorRect" item-name="name" @menu-click="handleAddMenuClick" />
    <!-- 行内「+」按钮的「添加到」菜单（QQ 版式，替代旧弹窗） -->
  </div>
</template>

<script>
import { clipboardWriteText } from '@common/utils/electron'
import { computed, watch } from '@common/utils/vueTools'
import { playList } from '@renderer/core/player/action'
import { userLists } from '@renderer/store/list/state'
import { assertApiSupport } from '@renderer/store/utils'
import SearchList from './components/SearchList.vue'
import MusicSortModal from './components/MusicSortModal.vue'
import MusicToggleModal from './components/MusicToggleModal.vue'
import useListInfo from './useListInfo'
import useList from './useList'
import useMenu from './useMenu'
import usePlay from './usePlay'
import useMusicDownload from './useMusicDownload'
import useMusicAdd from './useMusicAdd'
import useSort from './useSort'
import useMusicActions from './useMusicActions'
import useLovedList from '@renderer/utils/compositions/useLovedList'
import useListAddMenu from '@renderer/utils/compositions/useListAddMenu'
import useHeadCollapse from '@renderer/utils/compositions/useHeadCollapse'
import { getCoverUrl, loadCover } from '@renderer/utils/compositions/useCoverLoader'
import useSearch from './useSearch'
import useListScroll from './useListScroll'
import useMusicToggle from './useMusicToggle'
import { appSetting } from '@renderer/store/setting'
export default {
  name: 'MusicList',
  components: {
    SearchList,
    MusicSortModal,
    MusicToggleModal,
  },
  props: {
    listId: {
      type: String,
      required: true,
    },
  },
  emits: ['show-menu'],
  setup(props, { emit }) {
    const actionButtonsVisible = appSetting['list.actionButtonsVisible']

    let scrollIndex = null
    let isAnimation = false
    const handleRestoreScroll = (_scrollIndex, _isAnimation) => {
      scrollIndex = _scrollIndex
      isAnimation = _isAnimation
      if (isAnimation) void restoreScroll(scrollIndex, isAnimation)
      // console.log('handleRestoreScroll', scrollIndex, isAnimation)
    }
    const onLoadedList = () => {
      // console.log('restoreScroll', scrollIndex, isAnimation)
      void restoreScroll(scrollIndex, isAnimation)
    }

    const {
      rightClickSelectedIndex,
      selectedIndex,
      dom_listContent,
      listRef,
      list,
      playerInfo,
      setSelectedIndex,
      isShowSource,
      excludeListIds,
    } = useListInfo({ props, onLoadedList })

    const {
      selectedList,
      listItemHeight,
      handleSelectData,
      removeAllSelect,
    } = useList({ listRef, list })

    const {
      handlePlayMusic,
      handlePlayMusicLater,
      doubleClickPlay,
    } = usePlay({ props, selectedList, list, removeAllSelect })

    const {
      isShowListAdd,
      isMove,
      isShowListAddMultiple,
      isMoveMultiple,
      selectedAddMusicInfo,
      handleShowMusicAddModal,
      handleShowMusicMoveModal,
    } = useMusicAdd({ selectedList, list })

    const {
      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,
      handleShowDownloadModal,
    } = useMusicDownload({ selectedList, list })

    const {
      isShowMusicSortModal,
      selectedNum,
      selectedSortMusicInfo,
      handleShowSortModal,
      sortMusic,
    } = useSort({ props, list, selectedList, removeAllSelect })

    const {
      handleShowMusicToggleModal,
      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,
    } = useMusicToggle(props, list)

    const {
      handleSearch,
      handleOpenMusicDetail,
      handleCopyName,
      handleDislikeMusic,
      handleRemoveMusic,
    } = useMusicActions({ props, list, removeAllSelect, selectedList })

    const addMenu = useListAddMenu()
    const {
      menus,
      menuLocation,
      isShowItemMenu,
      showMenu,
      menuClick,
    } = useMenu({
      assertApiSupport,
      emit,
      listId: props.listId,

      handleShowDownloadModal,
      handlePlayMusic,
      handlePlayMusicLater,
      handleShowMusicToggleModal,
      handleSearch,
      handleShowMusicAddModal,
      handleShowMusicMoveModal,
      handleShowSortModal,
      handleOpenMusicDetail,
      handleCopyName,
      handleDislikeMusic,
      handleRemoveMusic,
    })

    const {
      isShowSearchBar,
      searchList,
      handleMusicSearchAction,
    } = useSearch({
      setSelectedIndex,
      handlePlayMusic,
      listRef,
    })

    const { saveListPosition, restoreScroll } = useListScroll({ props, listRef, list, handleRestoreScroll })


    const handleListItemClick = (event, index) => {
      if (rightClickSelectedIndex.value > -1) return
      handleSelectData(index)
      doubleClickPlay(index)
    }
    const handleListItemRightClick = (event, index) => {
      rightClickSelectedIndex.value = index
      showMenu(event, list.value[index], index)
    }
    const handleMenuClick = (action) => {
      let index = rightClickSelectedIndex.value
      rightClickSelectedIndex.value = -1
      menuClick(action, index)
    }
    const handleListRightClick = (event) => {
      if (!event.target.classList.contains('select')) return
      event.stopImmediatePropagation()
      let classList = dom_listContent.value.classList
      classList.add('copying')
      window.requestAnimationFrame(() => {
        let str = window.getSelection().toString()
        classList.remove('copying')
        str = str.split(/\n\n/).map(s => s.replace(/\n/g, '  ')).join('\n').trim()
        if (!str.length) return
        clipboardWriteText(str)
      })
    }
    // 收藏（我喜欢）
    const { isLoved, loadLoved, toggleLove } = useLovedList()
    void loadLoved()

    // 封面兜底：无封面（本地文件/酷我酷狗）按需补全
    watch(list, (list) => {
      for (const item of list) loadCover(item)
    }, { immediate: true })

    const handleListBtnClick = ({ action, index, event }) => {
      switch (action) {
        case 'download':
          handleShowDownloadModal(index, true)
          break
        case 'play':
          handlePlayMusic(index, true)
          break
        case 'search':
          handleSearch(index)
          break
        case 'listAdd':
          addMenu.openMenu(event?.currentTarget, list.value[index])
          break
        case 'like':
          void toggleLove(list.value[index])
          break
        case 'more': {
          const el = event?.currentTarget ?? event?.target
          const rect = el?.getBoundingClientRect?.()
          const left = rect ? rect.left : 0
          const top = rect ? rect.bottom + 4 : 0
          rightClickSelectedIndex.value = index
          showMenu(
            { clientX: left, clientY: top, pageX: left, pageY: top },
            list.value[index],
          )
          break
        }
      }
    }
    const scrollToTop = () => {
      listRef.value.scrollTo(0, true)
    }

    // ====== QQ 版式页头 ======
    // 页头滚动收起：下滑列表自动收起，上滑 / 回到顶部恢复；切换歌单时复位
    const { isHeadCollapsed, handleHeadScroll, resetHeadCollapse } = useHeadCollapse()
    const onListScroll = (event) => {
      saveListPosition()
      handleHeadScroll(event)
    }
    watch(() => props.listId, resetHeadCollapse)
    const albumCount = computed(() => {
      const set = new Set()
      for (const item of list.value) {
        const album = item.meta?.albumName
        if (album) set.add(album)
      }
      return set.size
    })
    const playAllMusics = () => {
      if (!list.value.length) return
      playList(props.listId, 0)
    }
    const downloadSelected = () => {
      if (!list.value.length) return
      const first = selectedList.value[0]
      const index = first ? list.value.indexOf(first) : 0
      handleShowDownloadModal(index < 0 ? 0 : index, true)
    }
    const toggleSelectAll = () => {
      if (selectedList.value.length) {
        removeAllSelect()
        return
      }
      list.value.forEach((item, index) => { handleSelectData(index) })
    }

    return {
      isHeadCollapsed,
      onListScroll,
      albumCount,
      playAllMusics,
      downloadSelected,
      toggleSelectAll,
      userLists,
      isLoved,
      getCoverUrl,
      listItemHeight,
      handleListItemClick,
      selectedList,
      handleListItemRightClick,
      removeAllSelect,
      handleListBtnClick,
      rightClickSelectedIndex,
      selectedIndex,
      dom_listContent,
      listRef,
      excludeListIds,

      menus,
      isShowItemMenu,
      menuLocation,
      handleMenuClick,
      isShowAddMenu: addMenu.isShow,
      addMenuLocation: addMenu.location,
      addMenuAnchorRect: addMenu.anchorRect,
      addMenuItems: addMenu.menus,
      handleAddMenuClick: addMenu.handleMenuClick,

      handleListRightClick,
      assertApiSupport,

      isShowListAdd,
      isMove,
      isShowListAddMultiple,
      isMoveMultiple,
      selectedAddMusicInfo,

      isShowMusicSortModal,
      selectedNum,
      selectedSortMusicInfo,
      sortMusic,

      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,

      scrollToTop,

      isShowSearchBar,
      searchList,
      handleMusicSearchAction,

      list,
      playerInfo,

      saveListPosition,
      isShowSource,
      handleRestoreScroll,

      actionButtonsVisible,

      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq.less';

// ------- QQ 版式页头（两段式，取值依据参考图实测）-------
// 竖排：页签(13，选中带 3px 主色下划线) → 20px → 工具栏(32) → 24px → 表头
// 下滑列表时整段收起（max-height + opacity 过渡），上滑或回到顶部展开
.head {
  flex: none;
  display: flex;
  flex-flow: column nowrap;
  align-items: stretch;
  overflow: hidden;
  // 与列表行同宽内缩（参考图内容区 +34px）
  padding: 18px 34px 0;
  max-height: 220px;
  transition: max-height .3s ease, opacity .22s ease, padding .3s ease;
}

.headCollapsed {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
}

.tabs {
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-start;
  gap: 40px;
}

.tab {
  flex: none;
  position: relative;
  padding-bottom: 10px;
  font-size: var(--qm-fs-sm, 13px);
  line-height: 1;
  color: var(--qm-text-3);
  cursor: default;
  white-space: nowrap;
}

.tabActive {
  color: var(--qm-primary);
  font-weight: var(--qm-fw-medium, 500);

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    border-radius: 2px;
    background-color: var(--qm-primary);
  }
}

.actions {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  margin-top: 20px;
  margin-bottom: 24px;
}

// 窄窗适配：压缩页签间距与纵向留白，按钮禁止被挤压换行
@media (max-width: 1280px) {
  .tabs { gap: 24px; }
  .actions {
    margin-top: 16px;
    margin-bottom: 20px;
  }
}

.spacer { flex: auto; }

.btnPrimary {
  .qm-btn-primary();
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 20px;
  white-space: nowrap;

  svg { display: block; fill: currentColor; }
}

.btnGhost {
  .qm-btn-ghost();
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 16px;
  white-space: nowrap;

  svg { display: block; color: currentColor; }
}

// 右侧图标按钮：参考图为无边框灰图标，悬停提亮
.iconBtn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--qm-radius-btn);
  color: var(--qm-text-4);
  background-color: transparent;
  cursor: pointer;
  transition: color var(--qm-t-fast), background-color var(--qm-t-fast);

  svg { display: block; }

  &:hover {
    color: var(--qm-text-1);
    background-color: var(--qm-hover);
  }
}

.list {
  overflow: hidden;
  height: 100%;
  flex: auto;
  display: flex;
  flex-flow: column nowrap;

  // 表头与行同宽内缩（thead 在本组件内，与 .content 的 34px 对齐）
  :global(.thead) { padding: 0 34px; }

  :global(.list-item) {
    &.active {
      color: var(--color-button-font);
    }
  }
  :global {
    .label-source {
      color: var(--color-primary);
      padding: 5px;
      font-size: .8em;
      line-height: 1.2;
      opacity: .75;
      display: inline-block;
    }
  }
}
.num {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.playIcon {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--color-button-font);
  opacity: .7;
}
.content {
  min-height: 0;
  font-size: var(--qm-fs-md, 14px);
  display: flex;
  flex-flow: column nowrap;
  flex: auto;
  // 行背景左右内缩（参考图实测：行列距内容区左右各 34px）
  padding: 0 34px;
}

.noItem {
  position: relative;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;

  p {
    font-size: var(--qm-fs-5xl, 24px);
    color: var(--color-font-label);
  }
}

</style>
