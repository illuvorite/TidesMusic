<template>
  <aside :class="[$style.sidebar, { [$style.collapsed]: collapsed }]">
    <!-- 上半：主导航 -->
    <nav :class="$style.nav" role="toolbar" aria-label="Home primary">
      <ul :class="$style.navList">
        <li v-for="item in primaryNav" :key="item.to">
          <router-link
            :to="item.to"
            :class="[$style.navItem, { [$style.active]: isActive(item) }]"
            :aria-label="item.tips"
          >
            <span :class="$style.navIcon">
              <svg-icon :name="item.iconName" />
            </span>
            <span :class="$style.navLabel">{{ item.tips }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <!-- 分隔 -->
    <div :class="$style.divider" />

    <!-- 下半：我的音乐 + 自建歌单 -->
    <section :class="$style.section" aria-label="My library">
      <header :class="$style.sectionHeader">
        <span :class="$style.sectionTitle">{{ $t('my_list') ?? '我的音乐' }}</span>
        <button
          type="button" :class="$style.sectionAdd"
          :aria-label="$t('lists__new_list_btn')" ignore-tip
          @click="handleCreateList"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      <ul :class="$style.playlistList">
        <li>
          <router-link
            :to="{ path: '/list', query: { id: loveListId } }"
            :class="[$style.playlistItem, { [$style.active]: $route.path === '/list' && $route.query.id === loveListId }]"
            @contextmenu.prevent="handleListContextMenu($event, loveList, 'love')"
          >
            <span :class="[$style.playlistIcon, $style.iconLove]">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.65 12 21 12 21z" fill="currentColor" />
              </svg>
            </span>
            <span :class="$style.playlistLabel">{{ $t('love_list_name') ?? '我喜欢' }}</span>
            <span :class="$style.playlistCount">{{ loveCount }}</span>
          </router-link>
        </li>
        <li>
          <router-link
            :to="{ path: '/list', query: { id: defaultListId } }"
            :class="[$style.playlistItem, { [$style.active]: $route.path === '/list' && $route.query.id === defaultListId }]"
            @contextmenu.prevent="handleListContextMenu($event, defaultList, 'default')"
          >
            <span :class="[$style.playlistIcon, $style.iconDefault]">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </span>
            <span :class="$style.playlistLabel">{{ $t('default_list_name') ?? '试听列表' }}</span>
          </router-link>
        </li>
        <li v-for="list in subscribedLists" :key="list.id">
          <template v-if="isRenaming && renameIndex === list._userListIndex">
            <base-input
              ref="dom_renameInput"
              :class="$style.renameInput"
              type="text"
              :model-value="renameValue"
              @update:model-value="renameValue = $event"
              @submit="handleSaveListName"
              @blur="handleSaveListName"
            />
          </template>
          <router-link
            v-else
            :to="{ path: '/list', query: { id: list.id } }"
            :class="[$style.playlistItem, { [$style.active]: $route.path === '/list' && $route.query.id === list.id }]"
            @contextmenu.prevent="handleListContextMenu($event, list, 'user')"
            @dblclick.prevent="handleRename(list._userListIndex)"
          >
            <span :class="[$style.playlistIcon, $style.iconSub]">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M5 4h11l3 3v13H5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                <path d="M9 11h6M9 15h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </span>
            <span :class="$style.playlistLabel">{{ list.name }}</span>
            <span v-if="list.count != null" :class="$style.playlistCount">{{ list.count }}</span>
          </router-link>
        </li>
      </ul>
      <base-menu v-model="isShowListMenu" :menus="listMenus" :xy="listMenuLocation" item-name="name" @menu-click="handleListMenuClick" />

      <ListSortModal v-model:visible="isShowListSortModal" :list-info="sortListInfo" />
      <DuplicateMusicModal v-model:visible="isShowDuplicateMusicModal" :list-info="duplicateListInfo" />

      <button type="button" :class="$style.addPlaylist" @click="handleCreateList">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span>{{ $t('lists__new_list_btn') ?? '新建歌单' }}</span>
      </button>
    </section>

    <!-- 底部：主题 + 设置 -->
    <footer :class="$style.footer">
      <button
        type="button" :class="$style.footerBtn"
        :aria-label="$t('theme')" ignore-tip :title="$t('theme')"
        @click="emit('open-theme')"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 3a9 9 0 1 0 9 9 5 5 0 0 1-5-5 4 4 0 0 0-4-4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="7.5" cy="10.5" r="1.2" fill="currentColor" />
          <circle cx="9.5" cy="7" r="1.2" fill="currentColor" />
          <circle cx="13" cy="6.5" r="1.2" fill="currentColor" />
        </svg>
        <span :class="$style.footerLabel">{{ $t('theme') ?? '主题' }}</span>
      </button>
      <router-link to="/setting" :class="$style.footerBtn" :aria-label="$t('setting')">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4z" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
        </svg>
        <span :class="$style.footerLabel">{{ $t('setting') ?? '设置' }}</span>
      </router-link>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from '@common/utils/vueTools'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import { defaultList, loveList, userLists, allMusicList } from '@renderer/store/list/state'
import { useI18n } from '@renderer/plugins/i18n'
import useHomeSidebarMenu from './useHomeSidebarMenu'
import ListSortModal from '@renderer/views/List/MyList/components/ListSortModal.vue'
import DuplicateMusicModal from '@renderer/views/List/MyList/components/DuplicateMusicModal.vue'
import useSort from '@renderer/views/List/MyList/useSort'
import useDuplicate from '@renderer/views/List/MyList/useDuplicate'
import { updateUserList } from '@renderer/store/list/action'

defineProps({
  collapsed: { type: Boolean, default: false },
})
const emit = defineEmits(['open-theme', 'create-list'])

const route = useRoute()
const router = useRouter()
const _i18n = useI18n()
const t = _i18n.bind(_i18n) as (key: string) => string

const defaultListId = computed(() => defaultList.id)
const loveListId = computed(() => loveList.id)
const loveCount = computed(() => (allMusicList.get(loveList.id)?.length ?? 0))

const primaryNav = computed(() => ([
  { to: '/home', iconName: 'home', tips: t('home') ?? '首页' },
  { to: '/home/music-hall', iconName: 'album', tips: t('music_hall') ?? '乐馆' },
  { to: '/leaderboard', iconName: 'leaderboard', tips: t('leaderboard') },
  { to: '/home/recent', iconName: 'time', tips: t('recent_play') ?? '最近播放' },
]))

const isActive = (item: { to: string }) => {
  if (item.to === '/home') {
    return route.path === '/home' || route.path === '/'
  }
  if (item.to.startsWith('/leaderboard')) {
    return route.path.startsWith('/leaderboard')
  }
  return route.path.startsWith(item.to)
}

const subscribedLists = computed(() => {
  return userLists
    .filter(l => l.sourceListId)
    .slice(0, 8)
    .map(l => ({ ...l, count: allMusicList.get(l.id)?.length ?? null, _userListIndex: userLists.indexOf(l) }))
})

const handleCreateList = () => {
  emit('create-list')
}

// 内联重命名
const isRenaming = ref(false)
const renameIndex = ref(-1)
const renameValue = ref('')
const dom_renameInput = ref<HTMLInputElement | null>(null)
const handleRename = (index: number) => {
  if (index < 0 || index >= userLists.length) return
  isRenaming.value = true
  renameIndex.value = index
  renameValue.value = userLists[index].name
  nextTick().then(() => {
    dom_renameInput.value?.focus()
    dom_renameInput.value?.select()
  }).catch(() => {})
}
const handleSaveListName = async() => {
  if (renameIndex.value < 0) return
  const name = renameValue.value.trim()
  const targetList = userLists[renameIndex.value]
  if (!targetList) return
  if (name && name !== targetList.name) {
    await updateUserList([{ ...targetList, name }])
  }
  isRenaming.value = false
  renameIndex.value = -1
  renameValue.value = ''
}

// 排序与去重弹窗
const { isShowListSortModal, sortListInfo } = useSort()
const { isShowDuplicateMusicModal, duplicateListInfo } = useDuplicate()

// ===== 右键菜单 =====
const {
  menus: listMenus,
  menuLocation: listMenuLocation,
  isShowMenu: isShowListMenu,
  showMenu: showListMenu,
  menuClick: handleListMenuClick,
} = useHomeSidebarMenu({
  router,
  handleRename,
  isShowListSortModal,
  sortListInfo,
  isShowDuplicateMusicModal,
  duplicateListInfo,
})

const handleListContextMenu = (event: MouseEvent, listInfo: LX.List.MyListInfo, kind: 'love' | 'default' | 'user') => {
  showListMenu(event, listInfo, kind)
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/home-tokens.less';

.sidebar {
  flex: none;
  width: @width-home-sidebar;
  display: flex;
  flex-flow: column nowrap;
  background-color: transparent;
  border-right: 1px solid var(--color-border-subtle);
  user-select: none;
  transition: width @transition-base, background-color @transition-base;
  overflow: hidden;
  -webkit-app-region: no-drag;

  &.collapsed {
    width: @width-home-sidebar-collapsed;
    .navLabel, .playlistLabel, .playlistCount, .sectionTitle, .footerLabel, .addPlaylist span { display: none; }
    .playlistItem { justify-content: center; }
  }
}

.nav {
  flex: none;
  padding: 10px 10px 0;
}

.navList {
  display: flex;
  flex-flow: column;
  gap: var(--qm-sp-0, 2px);
}

.navItem {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  padding: 0 12px;
  height: 42px;
  border-radius: var(--qm-radius-md, 10px);
  font-size: var(--qm-fs-md, 14px);
  font-weight: var(--qm-fw-medium, 500);
  color: var(--color-font);
  text-decoration: none;
  cursor: pointer;
  position: relative;
  transition: background-color @transition-fast, color @transition-fast, transform @transition-fast;

  &:hover {
    background-color: var(--color-button-background-hover, rgba(0,0,0,0.04));
    color: var(--color-accent);
  }
  &.active {
    background-color: var(--color-accent-soft);
    color: var(--color-accent);
    font-weight: var(--qm-fw-semibold, 600);
  }
}

.navIcon {
  flex: none;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: currentColor;

  :global(.svg-icon) {
    width: var(--qm-icon);
    height: var(--qm-icon);
    fill: currentColor;
  }
}

.navLabel {
  flex: auto;
  .mixin-ellipsis-1();
}

.divider {
  flex: none;
  height: 1px;
  margin: 10px 16px;
  background: var(--color-border-subtle);
}

.section {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  padding: 0 10px;
  overflow: hidden;
}

.sectionHeader {
  flex: none;
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 10px;
  color: var(--color-font-label, rgba(0,0,0,0.55));
  font-size: var(--qm-fs-2xs, 11px);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.sectionTitle {
  flex: auto;
  .mixin-ellipsis-1();
}

.sectionAdd {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  border-radius: var(--qm-radius-sm, 8px);
  color: var(--color-font);
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast, transform @transition-fast;
  &:hover {
    background-color: var(--color-accent-soft);
    color: var(--color-accent);
  }
  &:active { transform: scale(0.92); }
}

.playlistList {
  flex: auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-flow: column;
  gap: var(--qm-sp-0, 2px);
  padding-bottom: var(--qm-sp-1, 4px);
  scrollbar-gutter: stable;
  /* 滚动条收敛 */
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb {
    background: var(--color-button-background-hover, rgba(0,0,0,0.12));
    border-radius: var(--qm-radius-chip, 999px);
  }
}

.playlistItem {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  padding: 0 12px;
  height: 36px;
  border-radius: var(--qm-radius-md, 10px);
  color: var(--color-font);
  text-decoration: none;
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast, transform @transition-fast;
  font-size: var(--qm-fs-sm, 13px);
  font-weight: var(--qm-fw-medium, 500);

  &:hover {
    background-color: var(--color-button-background-hover, rgba(0,0,0,0.04));
    color: var(--color-accent);
  }
  &.active {
    background-color: var(--color-accent-soft);
    color: var(--color-accent);
    font-weight: var(--qm-fw-semibold, 600);
  }
}

.playlistIcon {
  flex: none;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--qm-radius-sm, 8px);
  background: var(--color-button-background, rgba(0,0,0,0.05));
  color: var(--color-primary);

  &.iconLove { color: var(--color-danger); }
  &.iconDefault { color: var(--color-primary); }
  &.iconSub { color: var(--color-primary); }
}

.playlistLabel {
  flex: auto;
  min-width: 0;
  .mixin-ellipsis-1();
}

.playlistCount {
  flex: none;
  color: var(--color-font-label, rgba(0,0,0,0.45));
  font-size: var(--qm-fs-2xs, 11px);
  font-variant-numeric: tabular-nums;
  padding: 1px 6px;
  border-radius: var(--qm-radius-chip, 999px);
  background: var(--color-button-background, rgba(0,0,0,0.04));
}

.addPlaylist {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--qm-sp-2, 6px);
  height: 36px;
  margin: 4px 0 10px;
  padding: 0 12px;
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--qm-radius-md, 10px);
  color: var(--color-font-label, rgba(0,0,0,0.55));
  font-size: var(--qm-fs-xs, 12px);
  font-weight: var(--qm-fw-medium, 500);
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast, border-color @transition-fast, transform @transition-fast;

  &:hover {
    background-color: var(--color-accent-soft);
    color: var(--color-accent);
    border-color: var(--color-accent);
    transform: translateY(-1px);
  }
  &:active { transform: translateY(0) scale(0.98); }
}

.renameInput {
  height: 36px;
  padding: 0 12px;
  border-radius: var(--qm-radius-md, 10px);
  font-size: var(--qm-fs-sm, 13px);
  font-weight: var(--qm-fw-medium, 500);
  background-color: var(--color-primary-background);
  border: 1px solid var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
  color: var(--color-font);
  width: 100%;
}

.footer {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-1, 4px);
  padding: var(--qm-sp-4, 10px);
  border-top: 1px solid var(--color-border-subtle);
}

.footerBtn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--qm-sp-2, 6px);
  height: 34px;
  padding: 0 8px;
  background: transparent;
  border: 0;
  border-radius: var(--qm-radius-sm, 8px);
  color: var(--color-font);
  font-size: var(--qm-fs-xs, 12px);
  font-weight: var(--qm-fw-medium, 500);
  text-decoration: none;
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast, transform @transition-fast;
  &:hover {
    background-color: var(--color-button-background-hover, rgba(0,0,0,0.04));
    color: var(--color-accent);
  }
  &:active { transform: scale(0.97); }
}
.footerLabel { .mixin-ellipsis-1(); }
</style>
