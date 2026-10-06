<template>
  <!--
    无UI 的歌单操作宿主（headless）。

    背景：`/list` 页面原本是「我的列表 + 歌曲列表」两栏布局，左栏
    （`MyList/index.vue`）渲染「我的列表」标题栏 + 歌单列表，与左侧全局
    侧栏（`layout-aside` 的「自建歌单 | 收藏歌单」）功能重复，视觉冗余。

    但左栏并不只是展示：它还**顺带承载了侧栏右键菜单的全部 query 处理器**
    —— `layout/Aside/index.vue` 通过 `router.push({ path: '/list', query: {
    id, sort: '1' } })` 这类query 触发「排序列表 / 移除重复 / 添加本地文件 /
    同步 / 查看源详情 / 导入 / 导出」，以及 `?new=1` 触发新建歌单输入框。
    这些 watch全部写在 `MyList/index.vue` 里，直接删掉那一列会让侧栏
    右键菜单**全部静默失效**。

    所以：把 UI 拿掉，把这层逻辑单独抽成本组件挂在页面上，
    行为与原实现完全一致（含弹窗与新建歌单输入）。
  -->
  <div :class="$style.host" @click="handleContainerClick">
    <base-input
      v-if="isShowNewList" ref="dom_listsNewInput" :class="$style.newListInput"
      type="text" :placeholder="$t('lists__new_list_input')"
      @keyup.enter="handleCreateList" @blur="handleCreateList"
    />
    <DuplicateMusicModal v-model:visible="isShowDuplicateMusicModal" :list-info="duplicateListInfo" />
    <ListSortModal v-model:visible="isShowListSortModal" :list-info="sortListInfo" />
    <ListUpdateModal v-model:visible="isShowListUpdateModal" />
  </div>
</template>

<script>
import { ref, watch, nextTick } from '@common/utils/vueTools'
import { useRouter, useRoute } from '@common/utils/vueRouter'
import { openUrl } from '@common/utils/electron'
import musicSdk from '@renderer/utils/musicSdk'
import { recentList, userLists } from '@renderer/store/list/state'
import { saveListPrevSelectId } from '@renderer/utils/data'
import { useI18n } from '@renderer/plugins/i18n'

import DuplicateMusicModal from './MyList/components/DuplicateMusicModal.vue'
import ListSortModal from './MyList/components/ListSortModal.vue'
import ListUpdateModal from './MyList/components/ListUpdateModal.vue'

import useShare from './MyList/useShare'
import useListUpdate from './MyList/useListUpdate'
import useSort from './MyList/useSort'
import useEditList from './MyList/useEditList'
import useDuplicate from './MyList/useDuplicate'
import { addLocalFile } from './MyList/actions'

export default {
  name: 'ListQueryHost',
  components: {
    DuplicateMusicModal,
    ListSortModal,
    ListUpdateModal,
  },
  props: {
    listId: {
      type: String,
      required: true,
    },
  },
  emits: ['show-menu'],
  setup(props) {
    const router = useRouter()
    const route = useRoute()
    const t = useI18n()

    const dom_listsNewInput = ref(null)

    const { handleImportList, handleExportList } = useShare()
    const { isShowListUpdateModal, handleUpdateSourceList } = useListUpdate()
    const { isShowListSortModal, sortListInfo, handleSortList } = useSort()
    const { isShowDuplicateMusicModal, duplicateListInfo, handleDuplicateList } = useDuplicate()

    // useEditList 的重命名分支（handleRename / handleSaveListName）依赖已移除的
    // 那一列 DOM，侧栏有自己的行内重命名实现，这里只取「新建歌单」这一支。
    const dom_lists_list = ref(null)
    const { isShowNewList, isNewListLeave, handleCreateList } = useEditList({ dom_lists_list })

    const handleOpenSourceDetailPage = async(listInfo) => {
      const { source, sourceListId } = listInfo
      if (!sourceListId) return
      let url
      if (/board__/.test(sourceListId)) {
        const id = sourceListId.replace(/board__/, '')
        url = musicSdk[source].leaderboard.getDetailPageUrl(id)
      } else if (musicSdk[source]?.songList?.getDetailPageUrl) {
        url = await musicSdk[source].songList.getDetailPageUrl(sourceListId)
      }
      if (!url) return
      void openUrl(url)
    }

    // 新建歌单输入框出现后自动聚焦（原实现靠 transition 的 @after-enter 聚焦，
    // 这里没有过渡动画，改为 nextTick 直接聚焦）
    watch(isShowNewList, (val) => {
      if (!val) return
      void nextTick(() => {
        dom_listsNewInput.value?.focus?.()
      })
    })

    // 监听 ?new=1：触发新建歌单输入（由侧栏「+」进入列表页时使用）
    watch(() => route.query.new, (val) => {
      if (val === '1' || val === 1) {
        isShowNewList.value = true
        const q = { ...route.query }
        delete q.new
        void router.replace({ path: route.path, query: q }).catch(() => {})
      }
    }, { immediate: true })

    // 侧栏右键菜单通过 query 派发的各类操作（原样迁移）
    watch(() => route.query, (query) => {
      if (!props.listId) return
      const list = userLists.find(l => l.id == props.listId)
      if (!list) return

      if (query.sort == '1' || query.sort === 1) {
        handleSortList(list)
        const q = { ...route.query }
        delete q.sort
        void router.replace({ path: route.path, query: q }).catch(() => {})
      } else if (query.dedupe == '1' || query.dedupe === 1) {
        handleDuplicateList(list)
        const q = { ...route.query }
        delete q.dedupe
        void router.replace({ path: route.path, query: q }).catch(() => {})
      } else if (query.addLocal == '1' || query.addLocal === 1) {
        void addLocalFile(list)
        const q = { ...route.query }
        delete q.addLocal
        void router.replace({ path: route.path, query: q }).catch(() => {})
      } else if (query.update == '1' || query.update === 1) {
        handleUpdateSourceList(list)
        const q = { ...route.query }
        delete q.update
        void router.replace({ path: route.path, query: q }).catch(() => {})
      } else if (query.detail == '1' || query.detail === 1) {
        void handleOpenSourceDetailPage(list)
        const q = { ...route.query }
        delete q.detail
        void router.replace({ path: route.path, query: q }).catch(() => {})
      } else if (query.import == '1' || query.import === 1) {
        handleImportList(list, userLists.length)
        const q = { ...route.query }
        delete q.import
        void router.replace({ path: route.path, query: q }).catch(() => {})
      } else if (query.export == '1' || query.export === 1) {
        handleExportList(list)
        const q = { ...route.query }
        delete q.export
        void router.replace({ path: route.path, query: q }).catch(() => {})
      }
    })

    watch(() => props.listId, (listId) => {
      saveListPrevSelectId(listId)
    })

    // 当前列表被删除后回落到默认列表，避免右侧停在空 id 上
    watch(() => userLists, (lists) => {
      if (lists.some(l => l.id == props.listId)) return
      void router.replace({
        path: '/list',
        query: {
          id: recentList.id,
        },
      })
    })

    // 点击空白处收起新建输入（原容器上绑过同名方法但从未实现，
    // 这里保持行为显式化：仅在点击宿主自身时收起）
    const handleContainerClick = () => {
      if (isShowNewList.value) isShowNewList.value = false
    }

    return {
      t,
      dom_listsNewInput,
      isShowListUpdateModal,
      isShowListSortModal,
      sortListInfo,
      isShowDuplicateMusicModal,
      duplicateListInfo,
      isShowNewList,
      isNewListLeave,
      handleCreateList,
      handleContainerClick,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.host {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}
.newListInput {
  position: fixed;
  left: 12px;
  top: 96px;
  width: 180px;
  height: 36px;
}
</style>
