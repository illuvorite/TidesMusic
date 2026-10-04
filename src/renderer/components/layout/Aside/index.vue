<template>
  <aside :class="[$style.aside, { [$style.collapsed]: collapsed, [$style.fullscreen]: isFullscreen }]">
    <!-- 顶部品牌标识：渐变贴片 + 音符标记（矢量，跟随主题色） -->
    <header :class="[$style.brand, { [$style.brandCollapsed]: collapsed }]">
      <span :class="$style.brandMark" role="img" aria-label="落雪 Plus">
        <svg-icon name="brand-logo" :class="$style.brandIcon" />
      </span>
    </header>

    <!-- 主入口：首页 + 乐馆 并列 -->
    <nav :class="$style.quickNav">
      <router-link
        v-for="item in mainQuickNav"
        :key="item.label"
        :to="item.to"
        :class="[$style.quickNavItem, { [$style.active]: isActive(item) }]"
      >
        <svg-icon :name="item.icon" :class="$style.quickNavIcon" />
        <span :class="$style.quickNavLabel">{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- 新建歌单：全宽虚线方块 -->
    <button
      v-if="!collapsed"
      type="button"
      :class="$style.createDashed"
      :aria-label="$t('nav__create_playlist')"
      :title="$t('nav__create_playlist')"
      data-new-list-trigger
      @click.stop="handleShowNew"
    >
      <svg-icon name="plus" />
    </button>

    <!-- 其余入口 -->
    <nav :class="$style.mainNav">
      <router-link
        v-for="item in mainNav"
        :key="item.label"
        :to="item.to"
        :class="[$style.navItem, { [$style.active]: isActive(item) }]"
      >
        <svg-icon :name="item.icon" :class="$style.navIcon" />
        <span :class="$style.navLabel">{{ item.label }}<span v-if="item.badge != null" :class="$style.navCount">·{{ item.badge }}</span></span>
      </router-link>
    </nav>

    <!-- 歌单列表：自建歌单 / 收藏歌单 两组（分组标题由 playlistEntries 一并产出） -->
    <ul v-if="!collapsed" :class="$style.playlist">
      <template v-for="entry in playlistEntries" :key="entry.key">
        <!-- 分组标题 -->
        <li
          v-if="entry.type === 'header'"
          :class="$style.sectionHeader"
          :data-aside-section-header="entry.isAnchor ? '' : null"
        >
          <span :class="$style.sectionTitle">{{ entry.title }}</span>
          <span :class="$style.sectionCount">{{ entry.count }}</span>
          <span :class="$style.sectionSpacer" />
          <button
            v-if="entry.showAdd"
            :class="$style.sectionBtn"
            :aria-label="$t('nav__create_playlist')"
            :title="$t('nav__create_playlist')"
            data-new-list-trigger
            @click.stop="handleShowNew"
          >
            <svg-icon name="plus" :class="$style.sectionIcon" />
          </button>
          <button
            v-if="entry.showRefresh && updatableLists.length"
            :class="$style.sectionBtn"
            :aria-label="$t('list_update_modal__title')"
            :title="$t('list_update_modal__title')"
            data-update-trigger
            @click.stop="toggleUpdatePanel"
          >
            <svg-icon name="refresh" :class="$style.sectionIcon" />
          </button>
        </li>

        <!-- 分组空态 -->
        <li v-else-if="entry.type === 'empty'" :class="$style.playlistEmpty">{{ entry.text }}</li>

        <!-- 歌单项 -->
        <li
          v-else
          :class="[$style.playlistItem, { [$style.active]: $route.path === '/list' && String($route.query.id) === String(entry.id) }]"
          @click="openList(entry)"
          @contextmenu.prevent="handleContextMenu($event, entry.index)"
        >
          <template v-if="isRenaming && renameIndex === entry.index">
            <input
              ref="dom_renameInput"
              :class="$style.renameInput"
              type="text"
              :value="renameValue"
              @input="renameValue = $event.target.value"
              @blur="handleSaveRename"
              @keyup.enter="handleSaveRename"
              @keyup.esc="handleCancelRename"
              @click.stop
              @contextmenu.stop
            >
          </template>
          <template v-else>
            <span :class="$style.playlistCover" @click="openList(entry)">
              <img v-if="entry.cover" :src="entry.cover">
              <svg-icon v-else name="music" :class="$style.playlistCoverIcon" />
            </span>
            <span :class="$style.playlistLabel" :title="entry.name" @click="openList(entry)">{{ entry.name }}</span>
            <span v-if="entry.count != null" :class="$style.playlistCount">{{ entry.count }}</span>
          </template>
        </li>
      </template>
    </ul>

    <!-- 新建歌单内嵌输入（弹层定位到 sectionHeader 下方） -->
    <teleport v-if="isShowNewList && !collapsed" to="body">
      <div :class="$style.createPopover" :style="createPopoverStyle" data-new-list-popover @click.stop>
        <header :class="$style.createPopoverHeader">
          <span :class="$style.createPopoverBadge">
            <svg-icon name="plus" />
          </span>
          <span :class="$style.createPopoverTitle">新建歌单</span>
          <span :class="$style.createPopoverCount">{{ newListName.length }}/30</span>
        </header>
        <div :class="$style.createPopoverField">
          <input
            ref="dom_newInput"
            v-model="newListName"
            type="text" maxlength="30"
            :placeholder="$t('nav__create_playlist_input')"
            @keyup.enter="handleCreateList"
            @keyup.esc="handleCancelCreate"
          >
        </div>
        <footer :class="$style.createPopoverFooter">
          <span :class="$style.createPopoverHint">{{ $t('nav__create_hint') }}</span>
          <div :class="$style.createPopoverActions">
            <button
              :class="$style.createPopoverBtn"
              type="button"
              @click="handleCancelCreate"
            >取消</button>
            <button
              :class="[$style.createPopoverBtn, $style.createPopoverBtnPrimary]"
              type="button"
              @click="handleCreateList"
            >创建</button>
          </div>
        </footer>
      </div>
    </teleport>

    <!-- 列表更新管理面板 -->
    <teleport v-if="isShowUpdatePanel && !collapsed" to="body">
      <div :class="$style.updatePanel" :style="updatePanelStyle" data-update-panel @click.stop>
        <header :class="$style.updatePanelHeader">
          <h3>{{ $t('list_update_modal__title') }}</h3>
          <button :class="$style.updatePanelClose" :aria-label="$t('close')" @click="isShowUpdatePanel = false">
            <svg-icon name="close" />
          </button>
        </header>
        <main :class="$style.updatePanelBody">
          <ul v-if="updatableLists.length" :class="$style.updateList">
            <li
              v-for="list in updatableLists" :key="list.id"
              :class="[$style.updateItem, { [$style.fetching]: fetchingListStatus[list.id] }]"
            >
              <div :class="$style.updateItemInfo">
                <div :class="$style.updateItemName">
                  {{ list.name }}
                  <span :class="$style.updateItemSource">{{ list.source }}</span>
                </div>
                <label :class="$style.updateItemAuto">
                  <input
                    type="checkbox"
                    :checked="updateInfo[list.id]?.isAutoUpdate == true"
                    @change="handleChangeAutoUpdate(list, $event.target.checked)"
                  >
                  <span>自动更新</span>
                </label>
              </div>
              <button
                :class="$style.updateItemSync"
                :disabled="fetchingListStatus[list.id]"
                :aria-label="$t('list_update_modal__update')"
                @click="handleUpdate(list)"
              >
                <svg-icon name="refresh" />
              </button>
            </li>
          </ul>
          <div v-else :class="$style.updateEmpty">暂无可更新的歌单</div>
        </main>
        <footer :class="$style.updatePanelFooter">
          <span>💡 每次启动软件时将会自动更新已勾选「自动更新」的列表</span>
        </footer>
      </div>
    </teleport>

    <!-- 右键菜单 -->
    <base-menu
      v-model="isShowMenu"
      :menus="menus"
      :xy="menuLocation"
      item-name="name"
      @menu-click="handleMenuClick"
    />

    <!-- 底部：收起 / 设置 / 装扮 / 游戏中心 -->
    <footer :class="$style.footer">
      <button
        :class="$style.footerBtn"
        :aria-label="collapsed ? '展开侧边栏' : '折叠侧边栏'"
        :title="collapsed ? $t('nav__expand_sidebar') : $t('nav__collapse_sidebar')"
        @click="toggleCollapsed"
      >
        <svg-icon name="arrow-left-circle-outline" />
      </button>
      <button :class="$style.footerBtn" :aria-label="$t('setting')" :title="$t('setting')" @click="goSetting">
        <svg-icon name="hexagon-outline" />
      </button>
      <button :class="$style.footerBtn" :aria-label="$t('nav__theme')" :title="$t('nav__theme')" @click="goTheme">
        <svg-icon name="tshirt" />
      </button>
      <button :class="$style.footerBtn" :aria-label="$t('nav__change_log')" :title="$t('nav__change_log')" @click="openChangeLog">
        <svg-icon name="gamepad" />
      </button>
      <button
        :class="$style.footerBtn"
        :aria-label="$t('list_trash__title')" :title="$t('list_trash__title')"
        @click="openListTrash"
      >
        <svg-icon name="trash" />
      </button>
    </footer>
  </aside>
</template>

<script setup>
import { computed, reactive, ref, nextTick, watch, onMounted, onBeforeUnmount } from '@common/utils/vueTools'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import { isFullscreen, isShowChangeLog } from '@renderer/store'

import {
  loveList,
  defaultList,
  userLists,
  allMusicList,
  fetchingListStatus,
} from '@renderer/store/list/state'
import { playHistoryList } from '@renderer/store/playHistory'
import { localMusicList } from '@renderer/store/localLibrary'
import { listTrashLoaded, loadListTrash, showListTrashModal } from '@renderer/store/listTrash'
import {
  createUserList,
  removeUserList,
} from '@renderer/store/list/action'
import { getListMusics } from '@renderer/store/list/listManage'
import syncSourceList from '@renderer/store/list/syncSourceList'
import musicSdk from '@renderer/utils/musicSdk'
import { getListUpdateInfo, setListAutoUpdate } from '@renderer/utils/data'
import { dialog } from '@renderer/plugins/Dialog'
import { useI18n } from '@renderer/plugins/i18n'

const t = useI18n()

// 外部传入的 collapsed（保留兼容），以及内部可切换的状态
const props = defineProps({
  collapsed: { type: Boolean, default: false },
})

const route = useRoute()
const router = useRouter()

// 内部折叠状态：用户通过底部的折叠按钮切换
const isCollapsed = ref(false)
const toggleCollapsed = () => { isCollapsed.value = !isCollapsed.value }
// 模板里直接用这个 computed
const collapsed = computed(() => isCollapsed.value || props.collapsed)

const goSetting = () => { void router.push('/setting').catch(() => {}) }
// 主题装扮：跳转到个性主题中心（/theme）
const goTheme = () => { void router.push('/theme').catch(() => {}) }
// 更新日志：复用已有的变更日志弹窗
const openChangeLog = () => { isShowChangeLog.value = true }
const openListTrash = () => {
  if (!listTrashLoaded.value) void loadListTrash()
  showListTrashModal()
}

// ====== 列表真实计数 ======
// 注意：allMusicList 是 markRaw 的普通 Map（非响应式），
// 因此这里用一个响应式对象承接计数，数据到位后再写回。
const listCounts = reactive({})

const allListIds = () => [loveList.id, defaultList.id, ...userLists.map(l => l.id)]

// 把已在缓存里的列表数量同步到响应式计数
const syncCountsFromCache = () => {
  for (const id of allListIds()) {
    const list = allMusicList.get(id)
    if (list) listCounts[id] = list.length
  }
}

// 载入尚未缓存的列表（用于真实计数），失败后自动重试
const loadListCounts = async(retry = 0) => {
  let failed = false
  for (const id of allListIds()) {
    if (allMusicList.has(id)) continue
    try {
      const list = await getListMusics(id)
      listCounts[id] = list.length
    } catch (err) {
      failed = true
      console.warn('load list count failed:', id, err)
    }
  }
  if (failed && retry < 3) {
    setTimeout(() => { void loadListCounts(retry + 1) }, 1500)
  }
}

// ====== 歌单相关 ======
const playlists = computed(() => {
  return userLists.slice(0, 50).map(l => {
    const list = allMusicList.get(l.id)
    return {
      id: l.id,
      name: l.name,
      // 带 source 的歌单是从平台订阅/收藏来的，其余是用户自建
      source: l.source ?? '',
      // 用歌单首曲封面当歌单封面，没有则退回占位图标
      cover: list?.[0]?.meta?.picUrl ?? null,
      count: listCounts[l.id] ?? null,
    }
  })
})

// 侧栏歌单分组：原实现把「自建歌单 | 收藏歌单」两个标题挂在同一个合并列表上（语义自相矛盾）。
// 这里按数据真实分组渲染；同时保留每项在扁平列表中的原始下标 index，
// 因为重命名 / 右键菜单仍以扁平下标定位（见 handleContextMenu / renameIndex）。
const playlistEntries = computed(() => {
  const entries = []
  const groups = [
    { key: 'self', title: t('home__created_list'), match: l => !l.source, emptyText: t('nav__create_empty_tip'), showAdd: true },
    { key: 'fav', title: t('home__collected_list'), match: l => !!l.source, emptyText: t('nav__fav_empty_tip'), showRefresh: true },
  ]
  const all = playlists.value
  for (const group of groups) {
    entries.push({ key: `h-${group.key}`, type: 'header', ...group, count: all.filter(group.match).length, isAnchor: group.key === 'self' })
    let count = 0
    all.forEach((p, index) => {
      if (!group.match(p)) return
      entries.push({ key: p.id, type: 'item', index, ...p })
      count += 1
    })
    if (!count) entries.push({ key: `e-${group.key}`, type: 'empty', text: group.emptyText })
  }
  return entries
})

const loveListCount = computed(() => listCounts[loveList.id] ?? 0)
// 最近播放：直接用持久化历史的条数（历史本身已按歌曲去重）
const recentListCount = computed(() => playHistoryList.length)
const defaultListCount = computed(() => listCounts[defaultList.id] ?? 0)

// 首页 + 乐馆，并列排放
const mainQuickNav = computed(() => [
  { to: { name: 'Home' }, icon: 'home', label: t('home') || '首页', name: 'Home' },
  { to: '/home/music-hall', icon: 'compass', label: t('music_hall') || '乐馆', name: 'MusicHall' },
])
// 其余入口（按设计稿顺序：喜欢 / 最近播放 / 本地和下载 / 试听列表）
const mainNav = computed(() => [
  { to: { name: 'ListLove' }, icon: 'heart-outline', label: t('nav__love'), name: 'ListLove', badge: loveListCount.value },
  { to: { name: 'ListRecent' }, icon: 'clock', label: t('recent_play'), name: 'ListRecent', badge: recentListCount.value },
  // 本地音乐与「本地和下载」拆成两项（对齐主流平台的「本地音乐 / 下载管理」分法）
  { to: { name: 'LocalMusic' }, icon: 'folder', label: t('local_library'), name: 'LocalMusic', badge: localMusicList.length || null },
  { to: { name: 'Download' }, icon: 'download-box', label: t('nav__local_and_download'), name: 'Download' },
  { to: { name: 'ListDefault' }, icon: 'music-note-list', label: t('default_list'), name: 'ListDefault', badge: defaultListCount.value },
])
const isActive = (item) => {
  if (item.name === 'Home') return route.path === '/home' || route.path === '/'
  if (item.name === 'MusicHall') return route.path === '/home/music-hall'
  if (item.name === 'ListLove') return route.path === '/list/love'
  if (item.name === 'ListRecent') return route.path === '/list/recent'
  if (item.name === 'ListDefault') return route.path === '/list/default'
  if (item.name === 'Download') return route.path === '/download'
  if (item.name === 'LocalMusic') return route.path === '/local'
  if (item.name === 'SongList') return route.path.startsWith('/songList')
  if (item.name === 'List') {
    if (!route.path.startsWith('/list')) return false
    const qid = String(route.query.id ?? '')
    const want = item.query?.id
    return want ? qid === String(want) : false
  }
  return route.path.startsWith(item.to)
}

const openList = (p) => {
  void router.push({ path: '/list', query: { id: p.id } }).catch(() => {})
}

// ====== 新建歌单 ======
const isShowNewList = ref(false)
const isNewListLeave = ref(false)
const newListName = ref('')
const dom_newInput = ref(null)
const createPopoverStyle = ref({ top: '0px', left: '0px' })
const handleShowNew = async() => {
  // 如果更新面板开着，先关掉，避免两个弹层叠在一起
  isShowUpdatePanel.value = false
  isShowNewList.value = !isShowNewList.value
  isNewListLeave.value = false
  if (isShowNewList.value) {
    await nextTick()
    // 定位到 sectionHeader 下方
    const headerEl = document.querySelector('[data-aside-section-header]')
    if (headerEl) {
      const r = headerEl.getBoundingClientRect()
      createPopoverStyle.value = {
        top: `${r.bottom + 4}px`,
        left: `${r.left}px`,
        width: `${r.width}px`,
      }
    }
    await nextTick()
    dom_newInput.value?.focus()
    dom_newInput.value?.select()
  }
}
const handleCreateList = async() => {
  const name = newListName.value.trim()
  if (!name) {
    isShowNewList.value = false
    return
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    const list = await createUserList({ name })
    isShowNewList.value = false
    newListName.value = ''
    if (list?.id) {
      void router.push({ path: '/list', query: { id: list.id } }).catch(() => {})
    }
  } catch (err) {
    console.error('createUserList failed:', err)
    isShowNewList.value = false
  }
}
const handleCancelCreate = () => {
  isShowNewList.value = false
  newListName.value = ''
}
watch(route, () => {
  // 切路由时收起新建输入
  isShowNewList.value = false
  newListName.value = ''
})

// ====== 右键菜单 ======
const isShowMenu = ref(false)
const menuLocation = ref({ x: 0, y: 0 })
const rightClickItemId = ref(null)
const rightClickItemIndex = ref(-1)

const menus = computed(() => {
  return [
    { name: t('lists__rename'), action: 'rename' },
    { name: t('lists__sort_list'), action: 'sort' },
    { name: t('lists__duplicate'), action: 'dedupe' },
    { name: t('lists__select_local_file'), action: 'addLocal' },
    { name: t('lists__sync'), action: 'update' },
    { name: t('lists__source_detail'), action: 'detail' },
    { name: t('lists__import'), action: 'import' },
    { name: t('lists__export'), action: 'export' },
    { name: t('lists__remove'), action: 'remove', disabled: false },
  ]
})

const handleContextMenu = (event, index) => {
  if (index < 0 || index >= playlists.value.length) return
  rightClickItemIndex.value = index
  rightClickItemId.value = playlists.value[index].id
  menuLocation.value = { x: event.clientX, y: event.clientY }
  isShowMenu.value = true
}

const handleMenuClick = async(action) => {
  if (!action) return
  if (rightClickItemIndex.value < 0 || rightClickItemIndex.value >= playlists.value.length) return
  const item = playlists.value[rightClickItemIndex.value]
  const idx = rightClickItemIndex.value
  rightClickItemIndex.value = -1
  isShowMenu.value = false

  switch (action.action) {
    case 'rename':
      handleRename(idx)
      break
    case 'sort':
      await router.push({ path: '/list', query: { id: item.id, sort: '1' } }).catch(() => {})
      break
    case 'dedupe':
      await router.push({ path: '/list', query: { id: item.id, dedupe: '1' } }).catch(() => {})
      break
    case 'addLocal':
      await router.push({ path: '/list', query: { id: item.id, addLocal: '1' } }).catch(() => {})
      break
    case 'update':
      await router.push({ path: '/list', query: { id: item.id, update: '1' } }).catch(() => {})
      break
    case 'detail':
      await router.push({ path: '/list', query: { id: item.id, detail: '1' } }).catch(() => {})
      break
    case 'import':
      await router.push({ path: '/list', query: { id: item.id, import: '1' } }).catch(() => {})
      break
    case 'export':
      await router.push({ path: '/list', query: { id: item.id, export: '1' } }).catch(() => {})
      break
    case 'remove':
      await handleRemove(item)
      break
  }
}

// 重命名：内嵌输入框
const isRenaming = ref(false)
const renameIndex = ref(-1)
const renameValue = ref('')
const dom_renameInput = ref(null)
const handleRename = (idx) => {
  if (idx < 0 || idx >= userLists.length) return
  isRenaming.value = true
  renameIndex.value = idx
  renameValue.value = userLists[idx].name
  nextTick().then(() => {
    const input = dom_renameInput.value
    if (Array.isArray(input)) {
      input[0]?.focus()
      input[0]?.select()
    } else {
      input?.focus()
      input?.select()
    }
  }).catch(() => {})
}
const handleSaveRename = () => {
  if (renameIndex.value < 0) return
  const name = renameValue.value.trim()
  const target = userLists[renameIndex.value]
  if (!target) return
  if (name && name !== target.name) {
    target.name = name
  }
  isRenaming.value = false
  renameIndex.value = -1
  renameValue.value = ''
}
const handleCancelRename = () => {
  isRenaming.value = false
  renameIndex.value = -1
  renameValue.value = ''
}

// 移除：弹确认
const handleRemove = async(item) => {
  try {
    const ok = await dialog.confirm({
      message: t('nav__delete_list_confirm', { name: item.name }),
      confirmButtonText: t('common__delete'),
    })
    if (!ok) return
    await removeUserList([item.id])
  } catch (err) {
    console.error('removeUserList failed:', err)
  }
}

// ====== 列表更新管理面板 ======
const updatableLists = computed(() =>
  userLists.filter(l => !!l.source && !!musicSdk[l.source]?.songList),
)

const isShowUpdatePanel = ref(false)
const updatePanelStyle = ref({ top: '0px', left: '0px' })
const updateInfo = ref({})

const toggleUpdatePanel = async() => {
  isShowUpdatePanel.value = !isShowUpdatePanel.value
  if (isShowUpdatePanel.value) {
    await nextTick()
    const headerEl = document.querySelector('[data-aside-section-header]')
    if (headerEl) {
      const r = headerEl.getBoundingClientRect()
      updatePanelStyle.value = {
        top: `${r.bottom + 4}px`,
        left: `${r.left}px`,
      }
    }
  }
}

const handleUpdate = (targetListInfo) => {
  void syncSourceList(targetListInfo)
}

const handleChangeAutoUpdate = (list, enable) => {
  void setListAutoUpdate(list.id, enable).then(() => {
    if (!updateInfo.value[list.id]) updateInfo.value[list.id] = {}
    updateInfo.value[list.id].isAutoUpdate = enable
  })
}

const onDocClick = (e) => {
  const target = e.target
  if (!(target instanceof Element)) return
  if (isShowUpdatePanel.value) {
    if (target.closest('[data-update-panel]')) return
    if (target.closest('[data-update-trigger]')) return
    isShowUpdatePanel.value = false
  }
  if (isShowNewList.value) {
    if (target.closest('[data-new-list-popover]')) return
    if (target.closest('[data-new-list-trigger]')) return
    isShowNewList.value = false
    newListName.value = ''
  }
}
// 列表数据变化（增删歌曲/列表）时刷新计数
const handleMyListUpdate = () => {
  syncCountsFromCache()
  void loadListCounts()
}

onMounted(() => {
  void getListUpdateInfo().then(info => { updateInfo.value = info ?? {} })
  syncCountsFromCache()
  void loadListCounts()
  window.app_event.on('myListUpdate', handleMyListUpdate)
  document.addEventListener('click', onDocClick, true)
})
onBeforeUnmount(() => {
  window.app_event.off('myListUpdate', handleMyListUpdate)
  document.removeEventListener('click', onDocClick, true)
})

// 监听 userLists 变化时收起重命名输入，并补齐新增列表的计数
watch(userLists, () => {
  isRenaming.value = false
  renameIndex.value = -1
  void loadListCounts()
})
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/home-tokens.less';

// ============================================================
//  左侧栏（按设计稿复刻）
//  宽 214px，内容左右各 17px；行距节奏 48px
// ============================================================
.aside {
  flex: none;
  width: @width-home-sidebar;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  padding: 0 17px;
  box-sizing: border-box;
  // 皮肤面板材质：跟随「皮肤透明度」滑块（--qm-surface 由 applySkinSurface 写入），
  // 与主面板同底色，壁纸/皮肤图可从半透明面板透出
  background-color: var(--qm-surface, var(--qm-card, #F5F5F5));
  user-select: none;
  -webkit-app-region: no-drag;

  &.collapsed {
    padding: 0 8px;
    .sectionHeader, .playlist,
    .navLabel, .navCount, .createDashed { display: none; }
    .quickNav { flex-flow: column nowrap; }
    .navItem { justify-content: center; padding: 0; }
    .footer { padding-left: 0; justify-content: center; }
  }
}

// -------- 品牌标识 --------
.brand {
  flex: none;
  display: flex;
  align-items: center;
  height: 32px;
  margin: 22px 0 0;
  padding-left: var(--qm-sp-0, 2px);
}

.brandCollapsed {
  justify-content: center;
  padding-left: 0;
}

// 渐变圆角贴片：Apple 应用图标的经典处理，30px 下依然干净可辨
.brandMark {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--qm-radius-card);
  background: linear-gradient(135deg, var(--qm-primary), var(--qm-primary-active));
  box-shadow:
    0 2px 6px color-mix(in srgb, var(--qm-primary) 34%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
  transition: transform var(--qm-t-base), box-shadow var(--qm-t-base);

  &:hover {
    transform: translateY(-1px) scale(1.02);
    box-shadow:
      0 4px 12px color-mix(in srgb, var(--qm-primary) 40%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.32);
  }
}

.brandIcon {
  width: 18px;
  height: 18px;
  color: var(--qm-text-invert, #fff);
  fill: currentColor;

  :global(.svg-icon) {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
}

// -------- 快捷入口：首页 / 乐馆 --------
.quickNav {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  gap: var(--qm-sp-3, 8px);
  margin-top: var(--qm-sp-7, 16px);
}

.quickNavItem {
  flex: 1 1 0;
  min-width: 0;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--qm-radius-card, 10px);
  background-color: var(--qm-tile-bg);
  color: var(--qm-text-3);
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--qm-t-base), color var(--qm-t-base), transform var(--qm-t-fast);

  &:hover { background-color: var(--qm-tile-bg-active); }
  &:active { transform: scale(0.97); }

  &.active {
    background-color: var(--qm-tile-bg-active);
    // 跟随主题文字色阶，避免深色主题下出现近黑的硬编码色
    color: var(--qm-text-1);
  }
}
.quickNavLabel { display: none; }

.quickNavIcon {
  width: 20px;
  height: 20px;
  fill: currentColor;
  :global(.svg-icon) { width: 20px; height: 20px; fill: currentColor; }
}

// -------- 新建歌单 --------
// Apple 风格：不再用虚线框这种「装饰性边框」，改为安静的幽灵行，
// 常态几乎隐入背景，hover 时才浮现填充与主色
.createDashed {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  margin-top: var(--qm-sp-2, 6px);
  padding: 0;
  border: 0;
  border-radius: var(--qm-radius-card, 10px);
  background-color: transparent;
  color: var(--qm-text-4);
  cursor: pointer;
  // transform 必须列入过渡，否则 :active 的缩放会是「瞬跳」而非平滑反馈
  transition: color var(--qm-t-fast), background-color var(--qm-t-fast), transform var(--qm-t-fast);

  :global(.svg-icon) { width: 13px; height: 13px; fill: currentColor; }
  &:hover {
    color: var(--qm-primary);
    background-color: var(--qm-hover);
  }
  &:active { transform: scale(0.98); }
}

// -------- 主入口列表 --------
.mainNav {
  flex: none;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-0, 2px);
  margin-top: 18px;
}

.navItem {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  height: 40px;
  padding: 0 12px;
  border-radius: var(--qm-radius-card, 10px);
  color: var(--qm-text-2);
  text-decoration: none;
  font-size: var(--qm-font-title-md, 13px);
  font-weight: var(--qm-fw-medium, 500);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast), transform var(--qm-t-fast);

  // 激活指示条：与设置页导航、列表「当前播放行」保持同一套视觉语言
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 3px;
    height: 0;
    border-radius: 0 3px 3px 0;
    background-color: var(--qm-primary, var(--qm-primary-hover));
    transform: translateY(-50%);
    transition: height var(--qm-t-base);
  }

  &:hover { background-color: var(--qm-hover); }

  &.active {
    color: var(--qm-primary, var(--qm-primary-hover));
    background-color: var(--qm-primary-soft);
    font-weight: var(--qm-fw-semibold, 600);

    &::before { height: 18px; }
  }

  &:active { transform: scale(0.99); }
}

.navIcon {
  flex: none;
  width: 18px;
  height: 18px;
  color: var(--qm-text-3);
  fill: currentColor;
  transition: color var(--qm-t-fast);
  :global(.svg-icon) { width: 18px; height: 18px; fill: currentColor; }
}

.navItem:hover .navIcon,
.navItem.active .navIcon { color: var(--qm-primary, var(--qm-primary-hover)); }

.navLabel {
  flex: none;
  .mixin-ellipsis-1();
}

.navCount {
  flex: none;
  margin-left: var(--qm-sp-0, 2px);
  font-size: var(--qm-font-aux, 12px);
  // 小号数字用 text-3：#9A9A9A 在白底仅 ~2.9:1，不达标
  color: var(--qm-text-3);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--qm-num-feature, 'tnum' 1);
}

// -------- 分组标题 --------
.sectionHeader {
  flex: none;
  display: flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  margin-top: 22px;
}

// 分组标题：Apple 侧栏习惯用小号中性标题，而非高对比粗黑
.sectionTitle {
  font-size: var(--qm-font-aux, 12px);
  font-weight: var(--qm-fw-semibold, 600);
  letter-spacing: var(--qm-tracking-wide, 0.02em);
  // 使用 text-3 而非 text-4：12px 小字需保证 ≥4.5:1 对比度
  color: var(--qm-text-3);
  .mixin-ellipsis-1();
}

// 分组计数：弱化的数字，跟在小标题后
.sectionCount {
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-5);
  font-variant-numeric: tabular-nums;
}

// 占位撑开，把操作按钮推到右侧
.sectionSpacer {
  flex: auto;
  min-width: 0;
}

.sectionBtn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: var(--qm-radius-xs, 6px);
  background: transparent;
  color: var(--qm-text-4);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);

  &:first-of-type { margin-left: auto; }
  &:hover { background-color: var(--qm-hover); color: var(--qm-text-1); }
}

.sectionIcon {
  width: 12px;
  height: 12px;
  fill: currentColor;
}

// -------- 歌单列表 --------
.playlist {
  flex: none;
  min-height: 0;
  max-height: 50vh;
  overflow-y: auto;
  margin-top: var(--qm-sp-4, 10px);
  display: flex;
  flex-flow: column nowrap;
  scrollbar-gutter: stable;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: var(--qm-line-2);
    border-radius: var(--qm-radius-chip, 999px);
  }
}

.playlistItem {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  height: 38px;
  padding: 0 10px;
  border-radius: var(--qm-radius-card, 10px);
  color: var(--qm-text-2);
  cursor: pointer;
  font-size: var(--qm-font-title-md, 13px);
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast);

  &:hover { background-color: var(--qm-hover); }

  &.active {
    color: var(--qm-primary, var(--qm-primary-hover));
    background-color: var(--qm-primary-soft);
    font-weight: var(--qm-fw-semibold, 600);
  }
}

.playlistCover {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: var(--qm-radius-cover, 8px);
  background-color: var(--qm-field);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
}

.playlistCoverIcon {
  width: 13px;
  height: 13px;
  color: var(--qm-text-4);
  fill: currentColor;
}

.playlistLabel {
  flex: auto;
  min-width: 0;
  .mixin-ellipsis-1();
}

.playlistCount {
  flex: none;
  color: var(--qm-text-3);
  font-size: var(--qm-font-badge, 11px);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--qm-num-feature, 'tnum' 1);
}

.playlistEmpty {
  padding: 12px 8px;
  text-align: center;
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-4);
  line-height: 1.6;
}

// -------- 底部图标行 --------
.footer {
  flex: none;
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
  padding-bottom: 9px;
}

.footerBtn {
  flex: none;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--qm-radius-card, 10px);
  background: transparent;
  color: var(--qm-text-3);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast), transform var(--qm-t-fast);

  &:hover {
    background-color: var(--qm-hover);
    color: var(--qm-text-1);
  }
  &:active { transform: scale(0.94); }
  &:focus-visible { box-shadow: var(--focus-ring, 0 0 0 3px rgba(0, 0, 0, .12)); }
  :global(.svg-icon) { width: 19px; height: 19px; fill: currentColor; }
}

// ============================================================
//  弹层（新建歌单 / 列表更新管理）
// ============================================================
.createPopover {
  position: fixed;
  z-index: 1500;
  min-width: 240px;
  display: flex;
  flex-flow: column nowrap;
  padding: var(--qm-sp-5, 12px);
  box-sizing: border-box;
  border-radius: var(--qm-radius-panel);
  border: 1px solid var(--glass-border, var(--qm-line-2));
  background-color: var(--glass-bg-strong, var(--qm-card));
  backdrop-filter: blur(@glass-blur) saturate(@glass-saturate);
  -webkit-backdrop-filter: blur(@glass-blur) saturate(@glass-saturate);
  box-shadow: var(--shadow-4), var(--glass-highlight);
  transform-origin: 16px top;
  animation: createPopoverIn 220ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;

  @keyframes createPopoverIn {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
}

// -------- 弹层头部：图标徽章 + 标题 + 字数 --------
.createPopoverHeader {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  margin-bottom: var(--qm-sp-4, 10px);
}

.createPopoverBadge {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--qm-radius-sm, 8px);
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  color: var(--color-primary);
  transition: background-color var(--transition-fast), transform var(--transition-fast);

  :global(.svg-icon) { width: 12px; height: 12px; fill: currentColor; }
}

.createPopoverTitle {
  flex: auto;
  min-width: 0;
  font-size: var(--qm-fs-sm, 13px);
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-2, var(--qm-text-1));
  .mixin-ellipsis-1();
}

.createPopoverCount {
  flex: none;
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-4);
  font-variant-numeric: tabular-nums;
  transition: color var(--transition-fast);
}

.createPopoverField {
  flex: none;

  input {
    width: 100%;
    height: 36px;
    padding: 0 12px;
    border: 1px solid var(--qm-line-2);
    border-radius: var(--qm-radius-card);
    background: color-mix(in srgb, var(--qm-text-2) 4%, transparent);
    color: var(--qm-text-2, var(--qm-text-1));
    font-size: var(--qm-fs-sm, 13px);
    outline: none;
    box-sizing: border-box;
    transition: border-color var(--transition-base), box-shadow var(--transition-base), background-color var(--transition-base);

    &::placeholder { color: var(--qm-text-4); opacity: 0.75; }

    &:focus {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 4%, transparent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
    }
  }
}

// -------- 弹层底部：快捷键提示 + 操作按钮 --------
.createPopoverFooter {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qm-sp-3, 8px);
  margin-top: var(--qm-sp-4, 10px);
}

.createPopoverHint {
  flex: none;
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-4);
  letter-spacing: 0.2px;
  opacity: 0.85;
}

.createPopoverActions {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
}

.createPopoverBtn {
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--qm-radius-sm, 8px);
  background: transparent;
  color: var(--qm-text-2, var(--qm-text-1));
  font-size: var(--qm-fs-xs, 12px);
  font-weight: var(--qm-fw-medium, 500);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);

  &:hover { background: color-mix(in srgb, var(--qm-text-2) 7%, transparent); }
  &:active { transform: scale(0.96); }
}

.createPopoverBtnPrimary {
  background: var(--color-primary);
  color: var(--qm-text-invert);

  &:hover { background: var(--color-primary-dark-100, var(--color-primary)); }
  &:active { transform: scale(0.96); }
}

.renameInput {
  flex: 1;
  min-width: 0;
  padding: 2px 6px;
  border-radius: var(--qm-radius-xs, 6px);
  background: rgba(0, 0, 0, 0.04);
  color: var(--qm-text-1);
  font-size: var(--qm-fs-sm, 13px);
  outline: none;
  &:focus { box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06); }
}

.updatePanel {
  position: fixed;
  z-index: 1500;
  width: 460px;
  max-width: calc(100vw - 32px);
  max-height: 70vh;
  display: flex;
  flex-flow: column nowrap;
  // 必须用 --qm-card（跟随主题）：写死 #fff 会在深色主题下白底配浅字 → 面板内容不可读
  background-color: var(--qm-card);
  border: 1px solid var(--qm-line-2);
  border-radius: var(--qm-radius-card);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

.updatePanelHeader {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--qm-line-1);
  background: var(--qm-hover);
  h3 {
    margin: 0;
    font-size: var(--qm-fs-md, 14px);
    font-weight: var(--qm-fw-semibold, 600);
    color: var(--qm-text-1);
  }
}

.updatePanelClose {
  flex: none;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--qm-radius-xs, 6px);
  background: transparent;
  color: var(--qm-text-4);
  cursor: pointer;
  &:hover { background-color: var(--qm-hover); color: var(--qm-text-1); }
  :global(.svg-icon) { width: 14px; height: 14px; fill: currentColor; }
}

.updatePanelBody {
  flex: auto;
  min-height: 80px;
  overflow-y: auto;
}

.updateList {
  display: flex;
  flex-flow: column nowrap;
}

.updateItem {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  padding: 10px 14px;
  transition: background-color var(--transition-fast), opacity var(--transition-fast);
  border-bottom: 1px solid var(--qm-line-1);
  &:last-child { border-bottom: 0; }
  &:hover { background-color: var(--qm-hover); }
  &.fetching { opacity: 0.5; }
}

.updateItemInfo {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-1, 4px);
}

.updateItemName {
  font-size: var(--qm-fs-sm, 13px);
  font-weight: var(--qm-fw-medium, 500);
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.updateItemSource {
  margin-left: var(--qm-sp-2, 6px);
  font-size: var(--qm-fs-2xs, 11px);
  font-weight: var(--qm-fw-regular, 400);
  color: var(--qm-text-4);
  opacity: 0.7;
  text-transform: lowercase;
}

.updateItemAuto {
  display: inline-flex;
  align-items: center;
  gap: var(--qm-sp-1, 4px);
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
  cursor: pointer;
  user-select: none;
  input {
    width: 13px;
    height: 13px;
    margin: 0;
    accent-color: var(--color-primary);
  }
}

.updateItemSync {
  flex: none;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--qm-radius-sm, 8px);
  background: transparent;
  color: var(--qm-primary-hover);
  cursor: pointer;
  transition: background-color var(--transition-fast), transform var(--transition-fast);
  &:hover:not(:disabled) { background-color: rgba(35, 240, 140, 0.12); }
  &:active:not(:disabled) { transform: scale(0.92); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  :global(.svg-icon) { width: 16px; height: 16px; fill: currentColor; }
}

.updateEmpty {
  padding: 32px 16px;
  text-align: center;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-4);
}

.updatePanelFooter {
  flex: none;
  padding: 8px 14px;
  font-size: var(--qm-fs-xs, 12px);
  line-height: 1.5;
  color: var(--qm-text-4);
  border-top: 1px solid var(--qm-line-1);
  background: rgba(0, 0, 0, 0.02);
}
</style>
