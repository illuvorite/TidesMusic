<template>
  <!-- 三态：加载中 / 失败可重试 / 空。原实现无任何态，接口慢或不可用时左栏是一片空白 -->
  <common-empty-state v-if="loading" variant="loading" compact :class="$style.stateBox" />
  <common-empty-state
    v-else-if="loadError"
    variant="error"
    compact
    :class="$style.stateBox"
    :title="$t('common__board_load_failed')"
    :description="$t('common__board_none_desc')"
    :action-text="$t('common__retry')"
    @action="load(props.source)"
  />
  <common-empty-state
    v-else-if="!list.length"
    compact
    :class="$style.stateBox"
    icon="list-ordered"
    :title="$t('common__board_none')"
    :description="$t('common__board_none_switch')"
  />
  <ul v-else ref="dom_lists_list" class="scroll" :class="$style.listsContent">
    <li
      v-for="(item, index) in list"
      :key="item.id" :class="[$style.listsItem, { [$style.active]: item.id == boardId }, { [$style.clicked]: rightClickItemIndex == index }]"
      :aria-label="item.name" @click="handleToggleList(item.id)" @contextmenu="handleRigthClick($event, index)"
    >
      <span :class="$style.listsLabel">
        <transition name="list-active">
          <svg-icon v-if="item.id == boardId" name="angle-right-solid" :class="$style.activeIcon" />
        </transition>
        {{ item.name }}
      </span>
    </li>
  </ul>
  <base-menu
    v-model="isShowMenu"
    :menus="menus"
    :xy="menuLocation"
    item-name="name"
    @menu-click="handleMenuClick"
  />
</template>

<script setup>
import { watch, shallowReactive, ref } from '@common/utils/vueTools'
import { getBoardsList, setBoard } from '@renderer/store/leaderboard/action'
import { boards } from '@renderer/store/leaderboard/state'
import useMenu from './useMenu'
import { useRouter, useRoute } from '@common/utils/vueRouter'

const props = defineProps({
  source: {
    type: String,
    required: true,
  },
  // 同 TagList：undefined 不能出现在 type 数组里（会打断组件更新），允许缺省用 default: undefined
  boardId: {
    type: String,
    default: undefined,
  },
})

const emit = defineEmits(['show-menu'])

const router = useRouter()
const route = useRoute()

const list = shallowReactive([])
const rightClickItemIndex = ref(-1)
const loading = ref(false)
const loadError = ref(false)

const handleToggleList = (id) => {
  void router.replace({
    path: route.path,
    query: {
      source: props.source,
      boardId: id,
    },
  })
}

const {
  menus,
  menuLocation,
  isShowMenu,
  showMenu,
  menuClick,
} = useMenu({ emit, list })

const handleRigthClick = (event, index) => {
  rightClickItemIndex.value = index
  showMenu(event, index)
}
const handleMenuClick = (action) => {
  if (rightClickItemIndex.value < 0) return
  let index = rightClickItemIndex.value
  rightClickItemIndex.value = -1
  menuClick(action, index, props.source)
}


// 加载榜单目录：补上加载/失败/空三态。
// 注意 musicSdk[source]?.leaderboard.getBoards() 只在 musicSdk[source] 上做了可选链，
// 若该音源存在但没有 leaderboard 实现，取 .getBoards 会直接抛错 —— 这里统一用 try/catch 兜住。
const load = async(source) => {
  loading.value = true
  loadError.value = false
  try {
    let boardList = boards[source]
    if (boardList == null) setBoard(boardList = await getBoardsList(source), source)
    if (!boardList?.list) {
      loadError.value = true
      return
    }
    list.splice(0, list.length, ...boardList.list)
    if (!props.boardId && boardList.list.length) handleToggleList(boardList.list[0].id)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.source, (source) => {
  void load(source)
}, {
  immediate: true,
})

defineExpose({ hideMenu: handleMenuClick })

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.listsContent {
  flex: auto;
  min-width: 0;
  overflow-y: scroll;
}

// 三态容器：与 .listsContent 同样占满左栏，保证切换时布局不跳
.stateBox {
  flex: auto;
  min-width: 0;
}

.listsItem {
  position: relative;
  transition: .3s ease;
  transition-property: color, background-color;
  background-color: transparent;
  &:hover:not(.active) {
    background-color: var(--qm-hover);
    cursor: pointer;
  }
  &.active {
    color: var(--qm-primary);
  }
  &.selected {
    background-color: var(--qm-hover-strong);
  }
  &.clicked {
    background-color: var(--qm-hover);
  }
  &.editing {
    padding: 0 10px;
    background-color: var(--qm-hover);
    .listsLabel {
      display: none;
    }
    .listsInput {
      display: block;
    }
  }
}
.activeIcon {
  height: .9em;
  width: .9em;
  margin-left: -0.45em;
  vertical-align: -0.05em;
}
.listsLabel {
  display: block;
  height: 100%;
  padding: 0 10px;
  font-size: var(--qm-fs-sm, 13px);
  line-height: 36px;
  .mixin-ellipsis-1();
}


</style>

