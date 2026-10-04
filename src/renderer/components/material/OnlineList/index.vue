<template>
  <div :class="$style.songList">
    <!-- <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut"> -->
    <div :class="$style.list">
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
      <div :class="$style.content">
        <div v-show="!noItem" ref="dom_listContent" :class="$style.content">
          <base-virtualized-list v-if="actionButtonsVisible" ref="listRef" :list="list" key-name="id" :item-height="listItemHeight" container-class="scroll" content-class="list" @contextmenu.capture="handleListRightClick">
            <template #default="{ item, index }">
              <div
                class="list-item" :class="[{ selected: rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { 'row-alt': index % 2 === 1 }]"
                @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
              >
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
                      <span v-if="item.meta._qualitys.flac24bit" class="no-select badge badge-theme-secondary">母带</span>
                      <span v-else-if="item.meta._qualitys.ape || item.meta._qualitys.flac || item.meta._qualitys.wav" class="no-select badge badge-theme-primary">SQ</span>
                      <span v-else-if="item.meta._qualitys['320k']" class="no-select badge badge-theme-secondary">HQ</span>
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
          <base-virtualized-list v-else ref="listRef" :list="list" key-name="id" :item-height="listItemHeight" container-class="scroll" content-class="list" @contextmenu.capture="handleListRightClick">
            <template #default="{ item, index }">
              <div
                class="list-item" :class="[{ selected: rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { 'row-alt': index % 2 === 1 }]"
                @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
              >
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
                      <span v-if="item.meta._qualitys.flac24bit" class="no-select badge badge-theme-secondary">母带</span>
                      <span v-else-if="item.meta._qualitys.ape || item.meta._qualitys.flac || item.meta._qualitys.wav" class="no-select badge badge-theme-primary">SQ</span>
                      <span v-else-if="item.meta._qualitys['320k']" class="no-select badge badge-theme-secondary">HQ</span>
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
import { ref, watch } from '@common/utils/vueTools'
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
  },
  emits: ['show-menu', 'play-list', 'togglePage'],
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

    return {
      isLoved,
      getCoverUrl,
      listItemHeight,
      handleListItemClick,
      selectedList,
      handleListItemRightClick,
      removeAllSelect,
      handleListBtnClick,
      rightClickSelectedIndex,
      dom_listContent,
      listRef,

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
  background-color: var(--color-surface-base);
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
    color: var(--color-font-label);
  }
}

</style>
