<template>
  <div :class="[$style.tagList, {[$style.active]: popupVisible}]">
    <div ref="dom_btn" :class="$style.label" @click.stop="handleShow">
      <span>{{ tagName }}</span>
      <div :class="$style.icon">
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 451.847 451.847" space="preserve">
          <use xlink:href="#icon-down" />
        </svg>
      </div>
    </div>
    <div :class="$style.popup" :style="popupStyle" :aria-hidden="!popupVisible" @click.stop>
      <div :class="$style.list" class="scroll">
        <div :class="$style.tag" @click="handleToggleTag('')">{{ $t('default') }}</div>
        <dl v-for="tagInfo in list" :key="tagInfo.name">
          <dt :class="$style.type">{{ tagInfo.name }}</dt>
          <dd v-for="tag in tagInfo.list" :key="tag.id" :class="$style.tag" @click="handleToggleTag(tag.id)">{{ tag.name }}</dd>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, shallowReactive, ref, onMounted, onBeforeUnmount, computed, reactive } from '@common/utils/vueTools'
import { setTags, getTags } from '@renderer/store/songList/action'
import { tags } from '@renderer/store/songList/state'
import { useRouter, useRoute } from '@common/utils/vueRouter'
import { useI18n } from '@renderer/plugins/i18n'

const props = defineProps({
  source: {
    type: String,
    required: true,
  },
  tagId: {
    type: String,
    required: true,
  },
  // 注意：不要写 type: [String, undefined] —— undefined 不是构造函数，
  // 非空值走到该类型分支时 assertType 会抛 "Right-hand side of 'instanceof' is not an object"，
  // 进而打断组件更新、把 vnode 树补丁搞乱。允许缺省用 default: undefined 即可（null/undefined 会跳过校验）。
  sortId: {
    type: String,
    default: undefined,
  },
  // 内联模式：不写路由，改为 emit('change', tagId)（供乐馆「分类歌单」内嵌复用）
  inline: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['change'])

const router = useRouter()
const route = useRoute()
const t = useI18n()

const list = shallowReactive([])
const handleToggleTag = (id) => {
  if (props.inline) {
    emit('change', id)
  } else {
    void router.replace({
      path: route.path,
      query: {
        source: props.source,
        tagId: id,
        sortId: props.sortId,
      },
    })
  }
  handleHide()
}
watch(() => props.source, async(source) => {
  if (!source) return
  // const source = (await getLeaderboardSetting()).source as LX.OnlineSource
  let tagInfo = tags[source]
  // 首次进入时该请求可能与页面其它请求竞争而失败（表现为下拉为空、分类名退化成 id），失败后重试几次
  if (tagInfo == null) {
    for (let attempt = 0; attempt < 3 && tagInfo == null; attempt++) {
      if (attempt) await new Promise(resolve => { setTimeout(resolve, 400 * attempt) })
      tagInfo = await getTags(source).catch(() => null)
    }
    if (tagInfo == null) return
    setTags(tagInfo, source)
  }

  list.splice(0, list.length, ...[{ name: window.i18n.t('songlist__tag_info_hot_tag'), list: [...tagInfo.hotTag] }, ...tagInfo.tags])
}, {
  immediate: true,
})
const tagName = computed(() => {
  if (!props.tagId) return t('default')
  for (const tags of list) {
    const tag = tags.list.find(t => t.id == props.tagId)
    if (tag) return tag.name
  }
  return props.tagId
})

const popupStyle = reactive({
  width: '645px',
  maxHeight: '250px',
})

const setTagPopupWidth = () => {
  window.setTimeout(() => {
    const dom_view = document.getElementById('view')
    popupStyle.width = dom_view.clientWidth * 0.96 + 'px'
    popupStyle.maxHeight = dom_view.clientHeight * 0.65 + 'px'
  }, 50)
}

const dom_btn = ref<HTMLElement | null>(null)
const popupVisible = ref(false)
const handleShow = () => popupVisible.value = !popupVisible.value
const handleHide = (evt) => {
  // if (e && e.target.parentNode != this.$refs.dom_popup && this.show) return this.show = false
  // console.log(this.$refs)
  if (evt && (evt.target == dom_btn.value || dom_btn.value?.contains(evt.target))) return
  popupVisible.value = false
}


onMounted(() => {
  setTagPopupWidth()
  document.addEventListener('click', handleHide)
  window.addEventListener('resize', setTagPopupWidth)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleHide)
  window.removeEventListener('resize', setTagPopupWidth)
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
    .popup {
      opacity: 1;
      transform: scale(1);
      pointer-events: initial;
    }
  }
}

.label {
  padding: 8px 15px;
  // background-color: var(--qm-hover);
  transition: color @transition-normal;
  // border-top: 2px solid @color-tab-border-bottom;
  // border-left: 2px solid @color-tab-border-bottom;
  box-sizing: border-box;
  text-align: center;
  // border-top-left-radius: 3px;
  color: var(--qm-text-2);
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
      width: .8em;
      transition: transform .2s ease;
      transform: rotate(0);
    }
  }

  &:hover {
    color: var(--qm-primary);
  }
}

.popup {
  position: absolute;
  top: 100%;
  width: 645px;
  left: 8px;
  margin-top: var(--qm-sp-5, 12px);
  border-radius: var(--qm-radius-card);
  background-color: var(--qm-card);
  opacity: 0;
  transform: scale(.95, .8);
  transform-origin: 0 0 0;
  transition: .25s ease;
  transition-property: transform, opacity;
  max-height: 250px;
  z-index: 10;
  pointer-events: none;
  box-shadow: var(--qm-shadow-3);
  display: flex;
}
.list {
  padding: var(--qm-sp-4, 10px);
  box-sizing: border-box;
  // box-shadow: 0 0 4px rgba(0, 0, 0, .2);
}

.type {
  padding: 6px 0 4px;
  color: var(--qm-text-4);
}

.tag {
  display: inline-block;
  margin: 5px;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 5px 10px;
  font-size: var(--qm-font-aux);
  border-radius: var(--qm-radius-chip);
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast);
  cursor: pointer;
  &:hover {
    color: var(--qm-primary);
  }
}

</style>
