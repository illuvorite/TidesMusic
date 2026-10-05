<template>
  <div :class="$style.leaderboard">
    <div :class="$style.lists">
      <div :class="$style.listsSelect">
        <base-selection :model-value="source" :class="$style.select" :list="sourceList" item-key="id" item-name="name" @update:model-value="handleToggleSource" />
      </div>
      <BoardList ref="boardListRef" :board-id="boardId" :source="source" @show-menu="$refs.musicListRef?.hideMenu()" />
    </div>
    <div :class="$style.list">
      <MusicList ref="musicListRef" :source="source" :board-id="boardId" @show-menu="$refs.boardListRef?.hideMenu()" />
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from '@common/utils/vueTools'
import { getLeaderboardSetting, setLeaderboardSetting } from '@renderer/utils/data'
import BoardList from './BoardList/index.vue'
import MusicList from './MusicList/index.vue'
import { sources } from '@renderer/store/leaderboard/state'
import { sourceNames } from '@renderer/store'
import { useRoute, useRouter } from '@common/utils/vueRouter'


const source = ref('')
const boardId = ref(null)


export default {
  components: {
    BoardList,
    MusicList,
  },
  setup() {
    const musicListRef = ref(null)
    const boardListRef = ref(null)
    const router = useRouter()
    const route = useRoute()

    /**
     * 把路由 query 同步到 source / boardId。
     *
     * ⚠️ 不用 beforeRouteEnter / beforeRouteUpdate（原实现）：
     *   · View.vue 的 <router-view> 是 v-slot 插槽写法，vue-router 拿不到渲染出来的
     *     组件实例，record.instances 始终为空 → beforeRouteUpdate 永远不触发；
     *   · View.vue 又给路由组件加了 `:key="routeKey + fullPath"`，query 变化时组件是
     *     「重建」而非「复用」，记录对象没变也不在 enteringRecords 里 → beforeRouteEnter 同样不触发。
     *   结果：切榜单 / 切音源只改了 URL，页面状态不动。改成 watch 路由 query 与渲染方式解耦。
     */
    const syncFromQuery = async(query) => {
      let _source = query.source
      let _boardId = query.boardId

      if (_source == null) {
        const setting = await getLeaderboardSetting()
        if (_source == null) {
          _source = setting.source
          _boardId = setting.boardId
        }
        void router.replace({
          path: route.path,
          query: { ...query, source: _source, boardId: _boardId },
        })
      }
      source.value = _source
      boardId.value = _boardId
      void setLeaderboardSetting({ source: _source, boardId: _boardId })
    }

    watch(
      () => [route.query.source, route.query.boardId],
      () => { void syncFromQuery(route.query) },
      { immediate: true },
    )

    const sourceList = computed(() => {
      return sources.map(s => ({ id: s, name: sourceNames.value[s] }))
    })
    const handleToggleSource = (id) => {
      void router.replace({
        path: route.path,
        query: {
          source: id,
        },
      })
    }

    return {
      source,
      boardId,
      sourceList,
      handleToggleSource,
      musicListRef,
      boardListRef,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.leaderboard {
  height: 100%;
  display: flex;
  position: relative;
  background-color: var(--qm-surface);
}
.header {
  flex: none;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;

}
.tab {
  flex: auto;
}
.select {
  flex: none;
  width: 80px;
}
.content {
  flex: auto;
  display: flex;
  overflow: hidden;
  flex-flow: column nowrap;
}

.lists {
  flex: none;
  // 百分比宽度在小窗口（1000px）下只剩 ~148px，榜单名会被压成一列；
  // 加 min-width 兜住可读性，大窗口仍按比例伸缩
  width: 14.8%;
  min-width: 168px;
  display: flex;
  flex-flow: column nowrap;
}
.listsHeader {
  position: relative;
}

.listsSelect {
  font-size: var(--qm-fs-xs, 12px);

  &:hover {
    :global(.icon) {
      opacity: 1;
    }
  }

  >:global(.content) {
    display: block;
    width: 100%;
  }
  :global(.label-content) {
    background-color: transparent !important;
    line-height: 38px;
    height: 38px;
    border-radius: 0;
    &:hover {
      background: none !important;
    }
  }
  :global(.label) {
    color: var(--qm-text-2) !important;
  }
  :global(.icon) {
    opacity: .6;
    transition: opacity .3s ease;
  }

  :global(.selection-list) {
    max-height: 500px;
    box-shadow: var(--qm-shadow-3);
    li {
      // background-color: var(--qm-card);
      line-height: 38px;
      font-size: var(--qm-fs-sm, 13px);
      &:hover {
        background-color: var(--qm-hover);
      }
      &:active {
        background-color: var(--qm-hover-strong);
      }
    }
  }
  // line-height: 38px;
  // padding: 0 10px;
  border-bottom: 1px solid var(--qm-line-1);
  flex: none;
}

.list {
  position: relative;
  overflow: hidden;
  height: 100%;
  flex: auto;
  display: flex;
  flex-flow: column nowrap;
  // .noItem {

  // }
}

</style>
