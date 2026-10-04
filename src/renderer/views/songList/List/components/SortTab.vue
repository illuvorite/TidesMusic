<template>
  <base-tab :model-value="sortId" :class="$style.tab" :list="list" item-label="name" @change="handleToggle" />
</template>

<script setup>
import { watch, shallowReactive } from '@common/utils/vueTools'
import { sortList } from '@renderer/store/songList/state'
import { useRouter, useRoute } from '@common/utils/vueRouter'

const props = defineProps({
  source: {
    type: String,
    required: true,
  },
  tagId: {
    type: String,
    required: true,
  },
  // 注意：tx 的 sortList 里 id 是 Number（5/2），不要写 type: String，
  // 不然非空值走到该类型分支时 assertType 抛 `Right-hand side of 'instanceof' is not an object`，
  // 进而打断组件更新、把 vnode 树补丁搞乱。允许 [String, Number] 并在内部统一 String 化。
  sortId: {
    type: [String, Number],
    default: '',
  },
  // 内联模式：不写路由，改为 emit('change', sortId)（供乐馆「分类歌单」内嵌复用）
  inline: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['change'])

const router = useRouter()
const route = useRoute()

const list = shallowReactive([])


const handleToggle = (id) => {
  // 统一把 id 转成 String：tx 的 sortList 里是 Number，其它源可能是 String，
  // 上下游（MusicHall.squareSortId、loadSquare、TagList 期望 String）若混用会让
  // active class 比较失败、数据 key 不一致。Type 已在 props 上放宽到 [String, Number]，
  // 这里再做一次最终兜底。
  const sortId = String(id ?? '')
  if (props.inline) {
    emit('change', sortId)
    return
  }
  void router.replace({
    path: route.path,
    query: {
      source: props.source,
      tagId: props.tagId,
      sortId,
    },
  })
}
watch(() => props.source, async(source) => {
  // const source = (await getLeaderboardSetting()).source as LX.OnlineSource
  if (!source) return
  let _list = sortList[source] ?? []
  // 列表里也存一份 String 化后的 id，下游 base-tab 用 == 比较无问题，
  // 但 emit 给 MusicHall.squareSortId 的必须是 String，否则 loadSquare 会把 Number 传下去
  // 让 watch(key) 的 key 包含 `${source}__${squareSortId.value}__...` 时类型抖动。
  list.splice(0, list.length, ..._list.map(item => ({ ...item, id: String(item.id) })))
  if (!props.sortId && list.length) handleToggle(list[0].id)
  // console.log(list)
}, {
  immediate: true,
})
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.tagList {
  font-size: var(--qm-fs-xs, 12px);
  position: relative;

  &.active {
    .label {
      .icon {
        svg{
          transform: rotate(180deg);
        }
      }
    }
    .list {
      opacity: 1;
      transform: scaleY(1);
    }
  }
}

.label {
  padding: 8px 15px;
  // background-color: var(--qm-hover);
  transition: background-color @transition-normal;
  // border-top: 2px solid @color-tab-border-bottom;
  // border-left: 2px solid @color-tab-border-bottom;
  box-sizing: border-box;
  text-align: center;
  // border-top-left-radius: 3px;
  color: var(--qm-text-3);
  cursor: pointer;

  display: flex;

  span {
    flex: auto;
  }
  .icon {
    flex: none;
    margin-left: 7px;
    line-height: 0;
    svg {
      width: .9em;
      transition: transform .2s ease;
      transform: rotate(0);
    }
  }

  &:hover {
    color: var(--qm-primary);
  }
}

.list {
  position: absolute;
  top: 100%;
  width: 645px;
  left: 0;
  // border-bottom: 2px solid @color-tab-border-bottom;
  // border-right: 2px solid @color-tab-border-bottom;
  border-radius: var(--qm-radius-card);
  background-color: var(--qm-card);
  box-shadow: var(--qm-shadow-3);
  opacity: 0;
  transform: scaleY(0);
  overflow-y: auto;
  transform-origin: 0 0 0;
  max-height: 250px;
  transition: .25s ease;
  transition-property: transform, opacity;
  z-index: 10;
  padding: var(--qm-sp-4, 10px);
  box-sizing: border-box;

  li {
    cursor: pointer;
    padding: 8px 15px;
    // color: var(--qm-text-3);
    text-align: center;
    outline: none;
    transition: background-color var(--qm-t-fast), color var(--qm-t-fast);
    background-color: transparent;
    box-sizing: border-box;
    border-radius: var(--qm-radius-btn);

    &:hover {
      background-color: var(--qm-hover);
      color: var(--qm-primary);
    }
  }
}

.type {
  padding-top: var(--qm-sp-4, 10px);
  padding-bottom: 3px;
  color: var(--qm-text-4);
}

.tag {
  display: inline-block;
  margin: 5px;
  background-color: var(--qm-hover);
  padding: 8px 10px;
  border-radius: @radius-progress-border;
  transition: background-color @transition-normal;
  cursor: pointer;
  &:hover {
    background-color: var(--qm-hover);
  }
  &:active {
    background-color: var(--qm-hover-strong);
  }
}


</style>
