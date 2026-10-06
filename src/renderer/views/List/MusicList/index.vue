<template>
  <div :class="$style.list">
    <!--
      歌单头部信息（QQ 音乐版式）：封面 + 标题 + 统计。
      注意：本地歌单没有作者/简介/播放量数据（用户歌单在 db 里只存了 name/source），
      因此这里只渲染真实可得的字段，不伪造。
      与下方页签分开控制：头部只在列表滚到最顶部时出现（isListHeaderVisible），
      页签则沿用原有的方向跟随收起（isHeadCollapsed）。

      ⚠️ 本组件被「喜欢」「最近播放」和「我的歌单」三处共用，头部只对用户自建/收藏歌单
      有意义（喜欢/最近播放是固定列表，原本没有这块）。故默认不显示，由调用方按需开启。
    -->
    <div v-if="showHeader" v-show="isListHeaderVisible" :class="$style.listHeader">
      <div :class="$style.headerCover">
        <!-- 4 图拼接封面；不足 4 张时按数量补位 -->
        <template v-if="coverImages.length">
          <img
            v-for="(img, i) in headerCoverSlots" :key="i"
            :class="$style.headerCoverCell" :src="img"
          >
        </template>
        <span v-else :class="$style.headerCoverPlaceholder">
          <svg-icon name="music" />
        </span>
      </div>

      <div :class="$style.headerInfo">
        <h1 :class="$style.headerTitle" :title="listTitle">{{ listTitle }}</h1>
        <p :class="$style.headerMeta">
          <span v-if="list.length">{{ list.length }} 首</span>
          <span v-if="albumCount">{{ albumCount }} 张专辑</span>
          <span v-if="singerCount">{{ singerCount }} 位歌手</span>
        </p>
      </div>
    </div>

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
        <button type="button" :class="$style.btnGhost" :disabled="!list.length" @click="openBatchDownload">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M12 4v11m0 0l-4-4m4 4l4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 19h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          下载
        </button>
        <!--
          批量：点按进入「批量模式」——此时每行左侧变为复选框、行内「+」变为下载，
          操作行右侧显示「退出批量操作」（对齐 QQ 音乐版式）。
        -->
        <button type="button" :class="$style.btnGhost" :disabled="!list.length" @click="isBatchMode = true">
          批量
        </button>
        <!--
          分享：只有「收藏歌单」有官方在线地址（source + sourceListId），
          自建歌单是纯本地列表、无法生成链接，故不显示该按钮。
        -->
        <button v-if="shareInfo" type="button" :class="$style.btnGhost" @click="handleShare">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M12 15V4m0 0L8.4 7.6M12 4l3.6 3.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          分享
        </button>
        <span :class="$style.spacer" />
        <!-- 批量模式下，右侧显示「退出批量操作」（对齐 QQ 音乐版式） -->
        <button v-if="isBatchMode" type="button" :class="$style.btnGhost" @click="exitBatchMode">
          退出批量操作
        </button>
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
          <!-- 批量模式表头：全选勾选 + 已选数量（QQ 音乐版式） -->
          <tr v-if="isBatchMode">
            <th class="nobreak batchCheckCell">
              <button
                type="button" class="row-check" :class="{ checked: isAllSelected }"
                :aria-label="isAllSelected ? '取消全选' : '全选'" :aria-pressed="isAllSelected"
                @click="toggleSelectAll"
              >
                <svg v-if="isAllSelected" viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <span :class="$style.batchAllLabel">全选</span>
            </th>
            <th class="nobreak" :class="$style.batchCount">已选中{{ selectedList.length }}首</th>
            <th class="nobreak" style="width: 27%;">{{ $t('music_album') }}</th>
            <th class="nobreak" style="width: 10%;">{{ $t('music_time') }}</th>
          </tr>
          <!-- 参考图列头：歌曲/歌手（含排序指示）· 专辑 · 时长；无序号列 -->
          <tr v-else>
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
          class="list-item" :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { checked: isBatchMode && selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }, { 'row-alt': index % 2 === 1 }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <!-- 批量模式：逐行复选框（QQ 音乐版式） -->
          <div v-if="isBatchMode" class="list-item-cell check">
            <button
              type="button" class="row-check" :class="{ checked: selectedList.includes(item) }"
              :aria-label="selectedList.includes(item) ? '取消选择' : '选择'"
              :aria-pressed="selectedList.includes(item)"
              @click.stop="toggleSelectItem(item)"
            >
              <svg v-if="selectedList.includes(item)" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
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
          <div class="list-item-cell auto name">
            <div class="name-wrap">
              <div class="name-main">
                <span class="select name">{{ item.name }}</span>
                <span v-if="getQualityTag(item)" class="no-select badge" :class="getQualityTag(item).cls">{{ getQualityTag(item).label }}</span>
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
              :list-add-btn="!isBatchMode"
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
          :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { checked: isBatchMode && selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }, { 'row-alt': index % 2 === 1 }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <!-- 批量模式：逐行复选框（QQ 音乐版式） -->
          <div v-if="isBatchMode" class="list-item-cell check">
            <button
              type="button" class="row-check" :class="{ checked: selectedList.includes(item) }"
              :aria-label="selectedList.includes(item) ? '取消选择' : '选择'"
              :aria-pressed="selectedList.includes(item)"
              @click.stop="toggleSelectItem(item)"
            >
              <svg v-if="selectedList.includes(item)" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
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
          <div class="list-item-cell auto name">
            <div class="name-wrap">
              <div class="name-main">
                <span class="select name">{{ item.name }}</span>
                <span v-if="getQualityTag(item)" class="no-select badge" :class="getQualityTag(item).cls">{{ getQualityTag(item).label }}</span>
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
              :list-add-btn="!isBatchMode"
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
    <search-list :list="list" :visible="isShowSearchBar" @action="handleMusicSearchAction" />
    <music-sort-modal v-model:show="isShowMusicSortModal" :music-info="selectedSortMusicInfo" :selected-num="selectedNum" @confirm="sortMusic" />
    <music-toggle-modal v-model:show="isShowMusicToggleModal" :music-info="selectedToggleMusicInfo" @toggle="toggleSource" />
    <common-song-list-share-modal
      v-model:visible="isShowShare" :name="shareInfo?.name ?? ''"
      :list-id="shareInfo?.sourceListId ?? ''" :source="shareInfo?.source ?? ''"
    />
    <base-menu v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
    <base-menu v-model="isShowAddMenu" :menus="addMenuItems" :xy="addMenuLocation" :anchor-rect="addMenuAnchorRect" item-name="name" @menu-click="handleAddMenuClick" />
    <!-- 行内「+」按钮的「添加到」菜单（QQ 版式，替代旧弹窗） -->
  </div>
</template>

<script>
import { clipboardWriteText } from '@common/utils/electron'
import { computed, ref, watch } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { playList } from '@renderer/core/player/action'
import { userLists, loveList, recentList } from '@renderer/store/list/state'
import { setBatchDownloadList } from '@renderer/store/batchDownload'
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
    /** 是否显示歌单头部信息（封面 + 标题 + 统计）。默认关闭：
     *  「喜欢」「最近播放」是固定列表，不需要这块；只有用户自建/收藏歌单才开启。 */
    showHeader: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['show-menu'],
  setup(props, { emit }) {
    const router = useRouter()
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
      selectAll,
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
          // 行内下载 = 当前这首的音质弹窗（两种模式都一样）
          handleShowDownloadModal(index, true)
          break
        case 'play':
          handlePlayMusic(index, true)
          break
        case 'search':
          handleSearch(index)
          break
        case 'listAdd':
          // 批量模式下行内「+」已隐藏（此时只剩下载）；非批量模式维持原有「添加到」菜单
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
    // 歌单头部信息（封面/标题/统计）另有一套规则：只有滚到最顶部才显示，
    // 见下isListHeaderVisible —— 它比页签更「粘」，避免上滑一点就闪现大块头部。
    const { isHeadCollapsed, handleHeadScroll, resetHeadCollapse } = useHeadCollapse()
    const onListScroll = (event) => {
      saveListPosition()
      handleHeadScroll(event)
      const el = event?.target
      if (el) isListHeaderVisible.value = el.scrollTop <= 4
    }
    // 歌单头部只在列表滚到最顶部时显示
    const isListHeaderVisible = ref(true)
    watch(() => props.listId, () => { isListHeaderVisible.value = true })
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

    // ====== 歌单头部信息（封面 / 标题 / 统计）======
    // 本页展示的是**本地**歌单，用户歌单在 db 里只存了
    // name / source / sourceListId / locationUpdateTime，没有封面、作者、简介、播放量，
    // 因此这里只用真实可得的数据：歌单名 + 歌曲数/专辑数 + 「我喜欢的音乐 / 最近播放」特例。
    const isLoveList = computed(() => props.listId === loveList.id)
    const isRecentList = computed(() => props.listId === recentList.id)
    const listTitle = computed(() => {
      if (isLoveList.value) return window.i18n.t(loveList.name)
      if (isRecentList.value) return window.i18n.t(recentList.name)
      return userLists.find(l => l.id == props.listId)?.name ?? ''
    })
    // 封面：取前 4 首的封面拼成 2×2 网格（QQ 音乐歌单封面同款做法）
    const coverImages = computed(() => {
      const imgs = []
      for (const item of list.value) {
        const url = item.meta?.picUrl
        if (url && !imgs.includes(url)) imgs.push(url)
        if (imgs.length >= 4) break
      }
      return imgs
    })
    const singerCount = computed(() => {
      const set = new Set()
      for (const item of list.value) if (item.singer) set.add(item.singer)
      return set.size
    })
    // 4 图拼接：只有 1~3 张时用首图重复补满 4 格，避免网格出现空位
    const headerCoverSlots = computed(() => {
      const imgs = coverImages.value
      if (!imgs.length) return []
      const slots = [...imgs]
      while (slots.length < 4) slots.push(imgs[0])
      return slots.slice(0, 4)
    })

    // ====== 分享 =====
    // 本页展示的是**本地**歌单（自建 / 收藏），只有「收藏歌单」带有在线来源
    // （source + sourceListId）才能生成官方链接；自建歌单为 null，按钮不显示。
    const shareInfo = computed(() => {
      const target = userLists.find(l => l.id == props.listId)
      if (!target?.source || !target.sourceListId) return null
      return {
        name: target.name,
        source: target.source,
        sourceListId: target.sourceListId,
      }
    })
    const isShowShare = ref(false)
    const handleShare = () => { isShowShare.value = true }
    // 工具栏「下载」→ 进入批量下载页（对齐 QQ 音乐）。
    // 批量模式下优先取已勾选的歌曲，未勾选则默认全选。
    const openBatchDownload = () => {
      const picked = list.value.filter(i => selectedList.value.includes(i))
      setBatchDownloadList(picked.length ? picked : [...list.value])
      router.push({ name: 'BatchDownload' }).catch(() => {})
    }
    // 批量模式：进入后逐行复选，不进入时维持原来的行为
    const isBatchMode = ref(false)
    const isAllSelected = computed(() => list.value.length > 0 && selectedList.value.length === list.value.length)
    // 单行勾选/取消
    const toggleSelectItem = (item) => {
      const idx = selectedList.value.indexOf(item)
      if (idx < 0) selectedList.value.push(item)
      else selectedList.value.splice(idx, 1)
    }
    const toggleSelectAll = () => {
      // 已全选 → 退出批量并清空；未全选 → 全选
      if (selectedList.value.length) {
        removeAllSelect()
        isBatchMode.value = false
        return
      }
      selectAll()
    }
    const exitBatchMode = () => {
      isBatchMode.value = false
      removeAllSelect()
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
      isHeadCollapsed,
      onListScroll,
      albumCount,
      playAllMusics,
      openBatchDownload,
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

      shareInfo,
      isShowShare,
      handleShare,

      listTitle,
      coverImages,
      headerCoverSlots,
      singerCount,
      isListHeaderVisible,
      isBatchMode,
      isAllSelected,
      toggleSelectItem,
      exitBatchMode,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq.less';

// ------- 歌单头部信息（封面 + 标题 + 统计）-------
.listHeader {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-s5);
  padding: var(--qm-s6) var(--qm-content-pad-right) var(--qm-s4) var(--qm-content-pad-left);
  background-color: var(--qm-surface);
}

.headerCover {
  flex: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  width: 108px;
  height: 108px;
  border-radius: var(--qm-radius-card, 8px);
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.04);
  box-shadow: var(--qm-shadow-2, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.headerCoverCell {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.headerCoverPlaceholder {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  .qm-cover-placeholder();
  :global(.svg-icon) { width: 28px; height: 28px; fill: currentColor; }
}

.headerInfo {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-2, 6px);
}

.headerTitle {
  margin: 0;
  max-width: 100%;
  font-size: var(--qm-font-title-xl, 22px);
  font-weight: var(--qm-fw-bold, 700);
  line-height: 30px;
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.headerMeta {
  margin: 0;
  display: flex;
  flex-flow: row nowrap;
  gap: var(--qm-s4);
  font-size: var(--qm-font-meta);
  line-height: 18px;
  color: var(--qm-text-3);
}

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
// 批量模式表头：「○全选 | 已选中N首」
.batchCheckCell {
  width: 78px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: var(--qm-fw-medium, 500);
  color: var(--qm-text-3);
  cursor: pointer;
}

.batchAllLabel {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-3);
}

.batchCount {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-3);
  font-variant-numeric: tabular-nums;
}

.content {
  min-height: 0;
  font-size: var(--qm-fs-md, 14px);
  display: flex;
  flex-flow: column nowrap;
  flex: auto;
  // 行背景左右内缩（参考图实测：行列距内容区左右各 34px）
  padding: 0 34px;
  // 收起页头后必须让虚拟列表重新接管剩余高度，
  // 否则内容区高度不随页头收缩而变化，底部会留出一大片空白。
  overflow: hidden;
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
