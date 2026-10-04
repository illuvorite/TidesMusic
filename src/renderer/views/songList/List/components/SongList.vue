<template>
  <div :class="$style.container">
    <div v-show="!props.listInfo.noItemLabel" ref="dom_list_ref" :class="[$style.listContent, 'qm-scroll']">
      <div :class="$style.grid">
        <common-song-card
          v-for="item in props.listInfo.list" :key="item.id"
          :img="item.img"
          :name="item.name"
          :meta="item.author"
          :play-count="item.play_count || ''"
          @click="toDetail(item)"
          @contextmenu.prevent="handleContextMenu($event, item)"
        />
      </div>
      <div :class="$style.pagination">
        <material-pagination :count="props.listInfo.total" :limit="props.listInfo.limit" :page="props.listInfo.page" @btn-click="togglePage" />
      </div>
    </div>
    <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
      <div v-show="props.listInfo.noItemLabel" :class="$style.noitem">
        <svg-icon name="music" :class="$style.noitemIcon" />
        <p v-text="props.listInfo.noItemLabel" />
      </div>
    </transition>
    <base-menu
      v-model="menuVisible"
      :menus="menus"
      :xy="menuLocation"
      item-name="name"
      @menu-click="handleMenuClick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from '@common/utils/vueTools'
import type { ListInfo, ListInfoItem } from '@renderer/store/songList/state'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import { useI18n } from '@renderer/plugins/i18n'
import { addSongListDetail } from '@renderer/views/songList/Detail/action'


const props = withDefaults(defineProps<{
  listInfo: ListInfo
  visibleSource?: boolean
}>(), {
  visibleSource: false,
})

const router = useRouter()
const route = useRoute()
const t = useI18n()

const dom_list_ref = ref<HTMLElement | null>(null)

const emit = defineEmits(['toggle-page'])


const togglePage = (page: number) => {
  emit('toggle-page', page)
}

const toDetail = (info: ListInfoItem) => {
  void router.push({
    path: '/songList/detail',
    query: {
      source: info.source,
      id: info.id,
      picUrl: info.img,
      fromName: route.name as string,
    },
  })
}

// ---------- 歌单卡右键菜单 ----------
// 卡片此前只有左键进详情；对标主流平台补上右键（打开详情 / 收藏歌单）。
// 收藏直接复用歌单详情页的 addSongListDetail（含重复收藏确认）。
const menuVisible = ref(false)
const menuLocation = reactive({ x: 0, y: 0 })
let contextItem: ListInfoItem | null = null

const menus = computed(() => [
  { name: t('songlist__menu_open_detail'), action: 'openDetail' },
  { name: t('songlist__menu_collect'), action: 'collect' },
])

const handleContextMenu = (event: MouseEvent, item: ListInfoItem) => {
  contextItem = item
  menuLocation.x = event.pageX
  menuLocation.y = event.pageY
  menuVisible.value = true
}

const handleMenuClick = (action: { action: string } | null) => {
  menuVisible.value = false
  if (!action || !contextItem) return
  switch (action.action) {
    case 'openDetail':
      toDetail(contextItem)
      break
    case 'collect':
      void addSongListDetail(contextItem.id, contextItem.source, contextItem.name)
      break
  }
}

defineExpose({
  scrollTo(top: number) {
    dom_list_ref.value?.scrollTo({
      top,
      // behavior: 'smooth',
    })
  },
  getScrollTop() {
    return dom_list_ref.value?.scrollTop ?? 0
  },
})


</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  position: relative;
  background-color: var(--qm-surface);
}

.listContent {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: var(--qm-content-pad-top) var(--qm-content-pad-right) 0 var(--qm-content-pad-left);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(142px, 1fr));
  gap: var(--qm-s6);
}

.pagination {
  text-align: center;
  padding: var(--qm-s5) 0 var(--qm-s7);
}

.noitem {
  position: absolute;
  inset: 0;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  gap: var(--qm-s3);
  color: var(--qm-text-4);

  .noitemIcon { width: 56px; height: 56px; fill: currentColor; opacity: 0.5; }
  p {
    margin: 0;
    font-size: var(--qm-font-meta);
    color: var(--qm-text-4);
  }
}
</style>
