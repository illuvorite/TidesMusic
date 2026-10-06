<template>
  <div :class="$style.songList">
    <!-- <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut"> -->
    <div :class="$style.list">
      <div class="thead">
        <table>
          <thead>
            <!-- 参考图列头：歌曲/歌手（含排序指示）· 专辑 · 时长；无序号列 -->
            <tr>
              <!-- 序号列：由 showIndex 控制（榜单详情传入），宽度与行内序号列一致 -->
              <th v-if="showIndex" class="nobreak num" style="width: 44px; padding: 0;">{{ $t('music_serial') }}</th>
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
      <div :class="$style.content">
        <div v-show="!noItem" ref="dom_listContent" :class="$style.content" tabindex="0" @keydown="handleListKeydown" @blur="keyboardIndex = -1">
          <base-virtualized-list v-if="actionButtonsVisible" ref="listRef" :list="list" key-name="id" :item-height="listItemHeight" container-class="scroll" content-class="list" @contextmenu.capture="handleListRightClick" @scroll="$emit('scroll', $event)">
            <template #default="{ item, index }">
              <div
                class="list-item" :class="[{ selected: rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { playing: activeIndex === index }, { keyboard: keyboardIndex === index }, { 'row-alt': index % 2 === 1 }]"
                @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
              >
                <div v-if="showIndex" class="list-item-cell num" style="flex: 0 0 44px;">{{ String(index + 1).padStart(2, '0') }}</div>
                <div class="list-item-cell cover">
                  <div class="row-cover">
                    <img v-if="getCoverUrl(item)" :src="getCoverUrl(item)" alt="" loading="lazy">
                    <span v-else class="row-cover-empty">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.5a3 3 0 1 1-2-2.8V5.2l7-1.5v8.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
                    </span>
                    <span class="row-cover-play" @click.stop="handleListBtnClick({ action: 'play', index })">
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
                    </span>
                  </div>
                </div>
                <div class="list-item-cell auto name">
                  <div class="name-wrap">
                    <div class="name-main">
                      <span class="select name" :aria-label="item.name">{{ item.name }}</span>
                      <span v-if="getQualityTag(item)" class="no-select badge" :class="getQualityTag(item).cls">{{ getQualityTag(item).label }}</span>
                      <span v-if="sourceTag" class="no-select badge badge-theme-tertiary">{{ item.source }}</span>
                      <button
                        type="button" class="row-play" :aria-label="$t('list__play')" :title="$t('list__play')"
                        @click.stop="handleListBtnClick({ action: 'play', index })"
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
                    :index="index" :remove-btn="false" :play-btn="false" :liked="isLoved(item)"
                    :download-btn="assertApiSupport(item.source)" @btn-click="handleListBtnClick"
                  />
                </div>
                <div class="list-item-cell" style="flex: 0 0 27%;"><span class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span></div>
                <div class="list-item-cell" style="flex: 0 0 10%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
              </div>
            </template>
            <template #footer>
              <div :class="$style.pagination">
                <material-pagination :count="total" :limit="limit" :page="page" @btn-click="$emit('togglePage', $event)" />
              </div>
            </template>
          </base-virtualized-list>
          <base-virtualized-list v-else ref="listRef" :list="list" key-name="id" :item-height="listItemHeight" container-class="scroll" content-class="list" @contextmenu.capture="handleListRightClick" @scroll="$emit('scroll', $event)">
            <template #default="{ item, index }">
              <div
                class="list-item" :class="[{ selected: rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { playing: activeIndex === index }, { keyboard: keyboardIndex === index }, { 'row-alt': index % 2 === 1 }]"
                @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
              >
                <div v-if="showIndex" class="list-item-cell num" style="flex: 0 0 44px;">{{ String(index + 1).padStart(2, '0') }}</div>
                <div class="list-item-cell cover">
                  <div class="row-cover">
                    <img v-if="getCoverUrl(item)" :src="getCoverUrl(item)" alt="" loading="lazy">
                    <span v-else class="row-cover-empty">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.5a3 3 0 1 1-2-2.8V5.2l7-1.5v8.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
                    </span>
                    <span class="row-cover-play" @click.stop="handleListBtnClick({ action: 'play', index })">
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
                    </span>
                  </div>
                </div>
                <div class="list-item-cell auto name">
                  <div class="name-wrap">
                    <div class="name-main">
                      <span class="select name" :aria-label="item.name">{{ item.name }}</span>
                      <span v-if="getQualityTag(item)" class="no-select badge" :class="getQualityTag(item).cls">{{ getQualityTag(item).label }}</span>
                      <span v-if="sourceTag" class="no-select badge badge-theme-tertiary">{{ item.source }}</span>
                      <button
                        type="button" class="row-play" :aria-label="$t('list__play')" :title="$t('list__play')"
                        @click.stop="handleListBtnClick({ action: 'play', index })"
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
                    :index="index" :remove-btn="false" :play-btn="false" :liked="isLoved(item)"
                    :download-btn="assertApiSupport(item.source)" @btn-click="handleListBtnClick"
                  />
                </div>
                <div class="list-item-cell" style="flex: 0 0 27%;"><span class="select" :aria-label="item?.meta?.albumName">{{ item?.meta?.albumName }}</span></div>
                <div class="list-item-cell" style="flex: 0 0 10%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
              </div>
            </template>
            <template #footer>
              <div :class="$style.pagination">
                <material-pagination :count="total" :limit="limit" :page="page" @btn-click="$emit('togglePage', $event)" />
              </div>
            </template>
          </base-virtualized-list>
        </div>
        <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
          <div v-show="noItem" :class="$style.noitem">
            <p v-text="noItem" />
          </div>
        </transition>
      </div>
    </div>
    <!-- </transition> -->
    <!-- <material-flow-btn :show="isShowEditBtn && assertApiSupport(source)" :remove-btn="false" @btn-click="handleFlowBtnClick" /> -->
    <!-- <common-download-modal v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view" />
    <common-download-multiple-modal v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view" @confirm="removeAllSelect" /> -->
    <common-list-add-modal v-model:show="isShowListAdd" :music-info="selectedAddMusicInfo" teleport="#view" />
    <common-list-add-multiple-modal v-model:show="isShowListAddMultiple" :music-list="selectedList" teleport="#view" @confirm="removeAllSelect" />
    <common-download-modal v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view" />
    <common-download-multiple-modal v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view" @confirm="removeAllSelect" />
    <base-menu v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
    <!-- 行内「+」按钮的「添加到」菜单（QQ 版式，替代旧弹窗） -->
    <base-menu v-model="isShowAddMenu" :menus="addMenuItems" :xy="addMenuLocation" :anchor-rect="addMenuAnchorRect" item-name="name" @menu-click="handleAddMenuClick" />
  </div>
</template>

<script>
import { clipboardWriteText } from '@common/utils/electron'
import { assertApiSupport } from '@renderer/store/utils'
import { ref, watch, computed } from '@common/utils/vueTools'
import useList from './useList'
import useMenu from './useMenu'
import usePlay from './usePlay'
import useMusicDownload from './useMusicDownload'
import useMusicAdd from './useMusicAdd'
import useMusicActions from './useMusicActions'
import useLovedList from '@renderer/utils/compositions/useLovedList'
import useListAddMenu from '@renderer/utils/compositions/useListAddMenu'
import { getCoverUrl, loadCover } from '@renderer/utils/compositions/useCoverLoader'
import { appSetting } from '@renderer/store/setting'
export default {
  name: 'MaterialOnlineList',
  props: {
    list: {
      type: Array,
      default() {
        return []
      },
    },
    page: {
      type: Number,
      required: true,
    },
    limit: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    sourceTag: {
      type: Boolean,
      default: false,
    },
    noItem: {
      type: String,
      default: '',
    },
    checkApiSource: {
      type: Boolean,
      default: false,
    },
    // 当前播放行的下标（-1 表示不高亮）。
    // 由调用方传入，让「最近播放」这类自建队列也能复用本组件的高亮与右键菜单，
    // 而不必像以前那样每个页面各复制一份虚拟列表模板。
    activeIndex: {
      type: Number,
      default: -1,
    },
    // 是否显示序号列。排行榜这类天然有序的榜单需要，普通歌单 / 搜索结果不需要，
    // 因此默认关闭，保证既有页面渲染结果完全不变。
    showIndex: {
      type: Boolean,
      default: false,
    },
  },
  // scroll：本组件自带滚动容器，外层页面（如榜单详情的「页头下滑收起」）
  // 需要滚动信号，故向上转发 VirtualizedList 的 scroll 事件。
  emits: ['show-menu', 'play-list', 'togglePage', 'scroll'],
  setup(props, { emit }) {
    const actionButtonsVisible = appSetting['list.actionButtonsVisible']
    const rightClickSelectedIndex = ref(-1)
    const dom_listContent = ref(null)
    const listRef = ref(null)

    const {
      selectedList,
      listItemHeight,
      handleSelectData,
      removeAllSelect,
      selectAll,
    } = useList({ props, listRef })

    const {
      handlePlayMusic,
      handlePlayMusicLater,
      doubleClickPlay,
    } = usePlay({ selectedList, props, removeAllSelect, emit })

    const {
      isShowListAdd,
      isShowListAddMultiple,
      selectedAddMusicInfo,
      handleShowMusicAddModal,
    } = useMusicAdd({ selectedList, props })

    const {
      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,
      handleShowDownloadModal,
    } = useMusicDownload({ selectedList, props })

    const {
      handleSearch,
      handleOpenMusicDetail,
      handleShowMusicComment,
      handleEditLocalMusicInfo,
      handleSetMusicQuality,
      handleDislikeMusic,
    } = useMusicActions({ props })

    const {
      menus,
      menuLocation,
      isShowItemMenu,
      showMenu,
      menuClick,
    } = useMenu({
      props,
      assertApiSupport,
      emit,

      handleShowDownloadModal,
      handlePlayMusic,
      handlePlayMusicLater,
      handleSearch,
      handleShowMusicAddModal,
      handleOpenMusicDetail,
      handleShowMusicComment,
      handleEditLocalMusicInfo,
      handleSetMusicQuality,
      handleDislikeMusic,
    })

    const handleListItemClick = (event, index) => {
      if (rightClickSelectedIndex.value > -1) return
      handleSelectData(index)
      doubleClickPlay(index)
    }
    const handleListItemRightClick = (event, index) => {
      rightClickSelectedIndex.value = index
      showMenu(event, props.list[index], index)
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
    // 行内「+」按钮的「添加到」菜单（与右键菜单同款卡片）
    const addMenu = useListAddMenu()

    // 收藏（我喜欢）
    const { isLoved, loadLoved, toggleLove } = useLovedList()
    void loadLoved()

    // 封面兜底：酷我/酷狗搜索结果无封面，按需补全
    watch(() => props.list, (list) => {
      for (const item of list) loadCover(item)
    }, { immediate: true })

    const handleListBtnClick = ({ action, index, event }) => {
      switch (action) {
        case 'download':
          handleShowDownloadModal(index, true)
          break
        case 'play':
          void handlePlayMusic(index, true)
          break
        case 'search':
          handleSearch(index)
          break
        case 'listAdd':
          addMenu.openMenu(event?.currentTarget, props.list[index])
          break
        case 'like':
          void toggleLove(props.list[index])
          break
        case 'more': {
          const el = event?.currentTarget ?? event?.target
          const rect = el?.getBoundingClientRect?.()
          const left = rect ? rect.left : 0
          const top = rect ? rect.bottom + 4 : 0
          rightClickSelectedIndex.value = index
          showMenu(
            { clientX: left, clientY: top, pageX: left, pageY: top },
            props.list[index],
            index,
          )
          break
        }
      }
    }
    const scrollToTop = () => {
      listRef.value.scrollTo(0, true)
    }

    // ---------- 键盘导航 ----------
    // 容器 tabindex=0 可聚焦后：↑↓ 移动光标行、Enter 播放、Esc 取消。
    // 光标行独立于「勾选选中」（selectedList）与「右键选中」，互不干扰。
    const keyboardIndex = ref(-1)

    // 让光标行保持可见：虚拟列表按 itemHeight 计算，直接换算成滚动位置
    const keepKeyboardVisible = (index) => {
      const container = listRef.value
      if (!container) return
      const top = container.getScrollTop()
      const target = index * listItemHeight.value
      const viewHeight = dom_listContent.value?.clientHeight ?? 0
      if (target < top) {
        container.scrollToIndex(index, 0)
      } else if (target + listItemHeight.value > top + viewHeight) {
        container.scrollToIndex(index, 0)
      }
    }

    const handleListKeydown = (event) => {
      if (!props.list.length) return
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          keyboardIndex.value = Math.min(keyboardIndex.value + 1, props.list.length - 1)
          keepKeyboardVisible(keyboardIndex.value)
          break
        case 'ArrowUp':
          event.preventDefault()
          keyboardIndex.value = Math.max(keyboardIndex.value - 1, 0)
          keepKeyboardVisible(keyboardIndex.value)
          break
        case 'Home':
          event.preventDefault()
          keyboardIndex.value = props.list.length ? 0 : -1
          keepKeyboardVisible(keyboardIndex.value)
          break
        case 'End':
          event.preventDefault()
          keyboardIndex.value = props.list.length - 1
          keepKeyboardVisible(keyboardIndex.value)
          break
        case 'Enter':
          if (keyboardIndex.value > -1) {
            event.preventDefault()
            emit('play-list', keyboardIndex.value)
          }
          break
        case 'Escape':
          if (keyboardIndex.value > -1) {
            event.preventDefault()
            keyboardIndex.value = -1
          }
          break
      }
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
      isLoved,
      getCoverUrl,
      getQualityTag,
      listItemHeight,
      handleListItemClick,
      selectedList,
      // 供父组件（如歌单详情页顶部的「批量」按钮）驱动全选/清空。
      // 注意：父组件通过 template ref 访问时拿到的是**未解包的 Ref**，
      // 不能直接读 listRef.selectedList.length，故一并暴露选中数量与操作方法。
      selectedCount: computed(() => selectedList.value.length),
      handleSelectData,
      selectAll,
      handleListItemRightClick,
      removeAllSelect,
      handleListBtnClick,
      rightClickSelectedIndex,
      dom_listContent,
      listRef,
      keyboardIndex,
      handleListKeydown,

      menus,
      isShowItemMenu,
      menuLocation,
      handleMenuClick,

      isShowAddMenu: addMenu.isShow,
      addMenuLocation: addMenu.location,
      addMenuAnchorRect: addMenu.anchorRect,
      addMenuItems: addMenu.menus,
      handleAddMenuClick: addMenu.handleMenuClick,
      openAddMenu: addMenu.openMenu,

      handleListRightClick,
      assertApiSupport,

      isShowListAdd,
      isShowListAddMultiple,
      selectedAddMusicInfo,

      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,

      scrollToTop,
      actionButtonsVisible,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.songList {
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  position: relative;
  background-color: var(--qm-surface);
}

.list {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  font-size: var(--qm-fs-sm, 13px);
}

.content {
  flex: auto;
  min-height: 0;
  position: relative;
  height: 100%;

  // 键盘导航的聚焦容器：去掉默认聚焦圈，用行高亮（.keyboard）代替视觉反馈
  &:focus { outline: none; }
}

.pagination {
  text-align: center;
  padding: 18px 0 24px;
}
.noitem {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;

  p {
    font-size: var(--qm-fs-2xl, 18px);
    color: var(--qm-text-4);
  }
}

</style>
