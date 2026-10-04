<template>
  <SongList ref="list_ref" :list-info="listInfo" @toggle-page="togglePage" />
</template>

<script setup lang="ts">
import { watch, ref, nextTick } from '@common/utils/vueTools'
import { listInfo } from '@renderer/store/songList/state'
import { getAndSetList } from '@renderer/store/songList/action'
import { useRouter, useRoute, onBeforeRouteLeave } from '@common/utils/vueRouter'
import SongList from './components/SongList.vue'


const props = defineProps<{
  source: LX.OnlineSource
  tagId: string
  sortId?: string
  page: number
}>()


const list_ref = ref<any>(null)

const router = useRouter()
const route = useRoute()

const getListData = async(source: LX.OnlineSource, tabId: string, sortId: string, page: number) => {
  // console.log(source, tabId, sortId, page)
  // 快速切页时，音源 SDK 的共享请求对象会把这里的请求 cancel 掉（reject「取消http请求」），
  // 此时组件可能已卸载 —— 必须就地吞掉，避免未捕获 rejection 打断后续渲染调度。
  await getAndSetList(source, tabId, sortId, page).catch(() => {}).then(() => {
    if (listInfo.key == window.lx.songListInfo.songlistKey && window.lx.songListInfo.songlistPosition) {
      void nextTick(() => {
        list_ref.value?.scrollTo(window.lx.songListInfo.songlistPosition)
      })
    } else if (list_ref.value) {
      window.lx.songListInfo.songlistKey = null
      void nextTick(() => {
        list_ref.value.scrollTo(0)
      })
    }
  })
}

const togglePage = (page: number) => {
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      sortId: props.sortId ?? '',
      page,
    },
  })
  // getListData(props.source, props.tagId, props.sortId ?? '', page)
}

watch(() => [props.source, props.tagId, props.sortId, props.page], ([source, tagId, sortId, page]) => {
  // const source = (await getLeaderboardSetting()).source as LX.OnlineSource
  // console.log(source, tagId, sortId)
  if (!source || !sortId) return
  // console.log(source, tagId, sortId, page)
  void getListData(source as LX.OnlineSource, tagId as string, sortId as string, page as number)
}, {
  immediate: true,
})

onBeforeRouteLeave(() => {
  window.lx.songListInfo.songlistKey = listInfo.key
  if (list_ref.value) window.lx.songListInfo.songlistPosition = list_ref.value.getScrollTop()
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
}

.listContent {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  font-size: var(--qm-fs-md, 14px);
  box-sizing: border-box;
  padding: 0 15px;

  ul {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
  }
}
.item {
  width: 32%;
  box-sizing: border-box;
  display: flex;
  margin-top: var(--qm-sp-6, 15px);
  cursor: pointer;
  transition: opacity @transition-normal;
  &:hover {
    opacity: .7;
  }
}
.left {
  flex: none;
  width: 88px;
  height: 88px;
  display: flex;
  background-position: center;
  background-size: cover;
  border-radius: var(--qm-radius-2xs, 4px);
  overflow: hidden;
  opacity: .9;

  img {
    object-fit: cover;
  }
  // box-shadow: 0 0 2px 0 rgba(0,0,0,.2);
}
.right {
  flex: auto;
  padding: 3px 15px 5px 7px;
  overflow: hidden;
  h4 {
    font-size: var(--qm-fs-md, 14px);
    height: 2.6em;
    text-align: justify;
    line-height: 1.3;
    .mixin-ellipsis-2();
  }
}
.songlist_info {
  display: flex;
  flex-flow: row nowrap;
  gap: var(--qm-sp-6, 15px);
  margin-top: var(--qm-sp-5, 12px);
  font-size: var(--qm-fs-xs, 12px);
  .mixin-ellipsis-1();
  text-align: justify;
  line-height: 1.2;
  // text-indent: 24px;
  color: var(--qm-text-4);
  svg {
    margin-right: var(--qm-sp-0, 2px);
  }
}
.author {
  margin-top: var(--qm-sp-2, 6px);
  font-size: var(--qm-fs-xs, 12px);
  .mixin-ellipsis-1();
  text-align: justify;
  line-height: 1.2;
  // text-indent: 24px;
  color: var(--qm-text-4);
}
.pagination {
  text-align: center;
  padding: 15px 0;
  // left: 50%;
  // transform: translateX(-50%);
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
  // background-color: var(--color-000);

  p {
    font-size: var(--qm-fs-5xl, 24px);
    color: var(--qm-text-4);
  }
}

</style>
