<template>
  <div :class="$style.list">
    <!-- QQ 版式页头：标题 + 统计页签 + 操作行 -->
    <header :class="$style.head">
      <h1 :class="$style.headTitle">{{ listName }}</h1>
      <div :class="$style.stats">
        <span :class="[$style.stat, $style.statActive]">歌曲{{ list.length }}</span>
        <span :class="$style.stat">专辑{{ albumCount }}</span>
        <span :class="$style.stat">歌单{{ userLists.length }}</span>
      </div>
      <div :class="$style.actions">
        <button type="button" :class="$style.btnPrimary" :disabled="!list.length" @click="playAllMusics">
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
          播放
        </button>
        <button type="button" :class="$style.btnGhost" :disabled="!list.length" @click="downloadSelected">
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <path d="M12 4v11m0 0l-4-4m4 4l4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 19h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          下载
        </button>
        <button type="button" :class="$style.btnGhost" :disabled="!list.length" @click="toggleSelectAll">
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          {{ selectedList.length ? `已选${selectedList.length}` : '批量' }}
        </button>
        <span :class="$style.spacer" />
        <button type="button" :class="$style.iconBtn" :aria-label="$t('list__search')" :title="$t('common__search_in_list')" @click="isShowSearchBar = true">
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <circle cx="10.6" cy="10.6" r="5.7" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="M14.9 14.9 19.5 19.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </header>
    <div class="thead">
      <table>
        <thead>
          <tr v-if="actionButtonsVisible">
            <th class="num" style="width: 40px;">#</th>
            <th style="width: 50px;"></th>
            <th class="nobreak">{{ $t('music_name') }} / {{ $t('music_singer') }}</th>
            <th class="nobreak" style="width: 150px;"></th>
            <th class="nobreak" style="width: 22%;">{{ $t('music_album') }}</th>
            <th class="nobreak" style="width: 9%;">{{ $t('music_time') }}</th>
          </tr>
          <tr v-else>
            <th class="num" style="width: 40px;">#</th>
            <th style="width: 50px;"></th>
            <th class="nobreak">{{ $t('music_name') }} / {{ $t('music_singer') }}</th>
            <th class="nobreak" style="width: 150px;"></th>
            <th class="nobreak" style="width: 25%;">{{ $t('music_album') }}</th>
            <th class="nobreak" style="width: 10%;">{{ $t('music_time') }}</th>
          </tr>
        </thead>
      </table>
    </div>
    <div v-show="list.length" ref="dom_listContent" :class="$style.content">
      <base-virtualized-list
        v-if="actionButtonsVisible" ref="listRef" v-slot="{ item, index }" :list="list" key-name="id"
        :item-height="listItemHeight" container-class="scroll" content-class="list"
        @scroll="saveListPosition" @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item" :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 40px;">
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && playerInfo.playIndex === index" :class="$style.playIcon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                  <use xlink:href="#icon-play-outline" />
                </svg>
              </div>
              <div v-else class="num">{{ index + 1 }}</div>
            </transition>
          </div>
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
          <div class="list-item-cell auto name" style="padding-left: 0;">
            <div class="name-wrap">
              <div class="name-main">
                <span class="select name">{{ item.name }}</span>
                <span v-if="getQualityTag(item)" class="no-select badge" :class="getQualityTag(item).cls">{{ getQualityTag(item).label }}</span>
                <span v-if="isShowSource" class="no-select badge badge-theme-tertiary">{{ item.source }}</span>
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
          <div class="list-item-cell" style="flex: 0 0 22%;"><span class="select" :aria-label="item?.meta?.albumName">{{ item?.meta?.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 9%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
        </div>
      </base-virtualized-list>
      <base-virtualized-list
        v-else ref="listRef" v-slot="{ item, index }" :list="list" key-name="id"
        :item-height="listItemHeight" container-class="scroll" content-class="list"
        @scroll="saveListPosition" @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item"
          :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 40px;">
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && playerInfo.playIndex === index" :class="$style.playIcon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                  <use xlink:href="#icon-play-outline" />
                </svg>
              </div>
              <div v-else class="num">{{ index + 1 }}</div>
            </transition>
          </div>
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
          <div class="list-item-cell auto name" style="padding-left: 0;">
            <div class="name-wrap">
              <div class="name-main">
                <span class="select name">{{ item.name }}</span>
                <span v-if="getQualityTag(item)" class="no-select badge" :class="getQualityTag(item).cls">{{ getQualityTag(item).label }}</span>
                <span v-if="isShowSource" class="no-select badge badge-theme-tertiary">{{ item.source }}</span>
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
          <div class="list-item-cell" style="flex: 0 0 25%;"><span class="select" :aria-label="item?.meta?.albumName">{{ item?.meta?.albumName }}</span></div>
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
  </div>
</template>

<script>
import { clipboardWriteText } from '@common/utils/electron'
import { computed, watch } from '@common/utils/vueTools'
import { playList } from '@renderer/core/player/action'
import { defaultList, loveList, userLists } from '@renderer/store/list/state'
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

    const {
      menus,
      menuLocation,
      isShowItemMenu,
      showMenu,
      menuClick,
    } = useMenu({
      assertApiSupport,
      emit,

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
          handleShowMusicAddModal(index, true)
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
    const listName = computed(() => {
      if (props.listId === loveList.id) return '喜欢'
      if (props.listId === defaultList.id) return '试听列表'
      return userLists.find(item => item.id === props.listId)?.name ?? '歌单'
    })
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

    // 音质角标：_qualitys 可能整体缺失（本地导入歌曲、换源缓存、旧版本歌单的脏数据），
    // 必须走可选链读取；否则模板直接取属性会抛 TypeError，导致整个列表渲染失败。
    const getQualityTag = (item) => {
      const qualitys = item?.meta?._qualitys
      if (!qualitys) return null
      if (qualitys.flac24bit) return { label: window.i18n.t('player__quality_master'), cls: 'badge-theme-secondary' }
      if (qualitys.ape || qualitys.flac || qualitys.wav) return { label: 'SQ', cls: 'badge-theme-primary' }
      if (qualitys['320k']) return { label: 'HQ', cls: 'badge-theme-secondary' }
      return null
    }

    return {
      listName,
      albumCount,
      playAllMusics,
      downloadSelected,
      toggleSelectAll,
      userLists,
      isLoved,
      getCoverUrl,
      getQualityTag,
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

// ------- QQ 版式页头 -------
.head {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 18px;
  padding: 16px 24px 12px;
}

.headTitle {
  margin: 0;
  font-size: var(--qm-fs-5xl, 24px);
  font-weight: var(--qm-fw-bold, 700);
  letter-spacing: .5px;
  color: var(--qm-text-1);
}

.stats {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 18px;
}

.stat {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-3);
  cursor: default;
}

.statActive {
  color: var(--qm-primary);
  font-weight: var(--qm-fw-semibold, 600);
}

.actions {
  margin-left: auto;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
}

.spacer { flex: none; width: 6px; }

.btnPrimary {
  .qm-btn-primary();
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 16px;

  svg { display: block; fill: currentColor; }
}

.btnGhost {
  .qm-btn-ghost();
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 14px;

  svg { display: block; color: currentColor; }
}

.iconBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--qm-line-2);
  border-radius: var(--qm-radius-btn);
  color: var(--qm-text-3);
  background-color: transparent;
  cursor: pointer;
  transition: color var(--qm-t-fast), border-color var(--qm-t-fast), background-color var(--qm-t-fast);

  svg { display: block; }

  &:hover {
    color: var(--qm-primary);
    border-color: var(--qm-primary);
    background-color: var(--qm-primary-soft);
  }
}

.list {
  overflow: hidden;
  height: 100%;
  flex: auto;
  display: flex;
  flex-flow: column nowrap;

  :global(.list-item) {
    &.active {
      color: var(--qm-text-3);
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

  color: var(--qm-text-3);
  opacity: .7;
}
.content {
  min-height: 0;
  font-size: var(--qm-fs-md, 14px);
  display: flex;
  flex-flow: column nowrap;
  flex: auto;
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
    color: var(--qm-text-4);
  }
}

</style>
