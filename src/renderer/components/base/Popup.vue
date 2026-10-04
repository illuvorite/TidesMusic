<template>
  <component :is="Teleport" to="#root">
    <div
      :class="[$style.popup, 'qm-popup', {[$style.top]: isShowTop}, {[$style.active]: props.visible}, {[$style.dark]: isDark}, { 'qm-popup-dark': isDark }]"
      :style="popupStyle"
      :aria-hidden="!props.visible"
      @click.stop
      @mouseenter="emit('mouseenter', $event)"
      @mouseleave="emit('mouseleave', $event)"
      @transitionend="emit('transitionend', $event)"
    >
      <div ref="dom_content" class="scroll" :class="$style.list">
        <slot />
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from '@common/utils/vueTools'
import { isShowPlayerDetail } from '@renderer/store/player/state'
import { getRootOrigin } from '@renderer/core/globalData'

// https://github.com/vuejs/core/issues/2855#issuecomment-768388962
import {
  Teleport as teleport_,
  type TeleportProps,
  type VNodeProps,
} from 'vue'
const Teleport = teleport_ as new () => {
  $props: VNodeProps & TeleportProps
}

const props = defineProps<{
  visible: boolean
  btnEl: HTMLElement | null
}>()

interface Emitter {
  (event: 'update:visible', visible: boolean): void
  (event: 'mouseenter', visible: MouseEvent): void
  (event: 'mouseleave', visible: MouseEvent): void
  (event: 'transitionend', visible: TransitionEvent): void
}
const emit = defineEmits<Emitter>()

const dom_content = ref<HTMLElement | null>(null)
const isShowTop = ref(false)

// 弹窗一律 teleport 到 #root，因此拿不到播放详情页在 .container 上
// 重定义的语义色。详情页是全屏深色画布，弹窗必须跟着切深色，
// 否则会出现「白卡 + 白字」完全看不见的菜单。
const isDark = computed(() => !!isShowPlayerDetail.value)

const popupStyle = reactive({
  maxHeight: 'none',
  top: '0px',
  left: '0px',
  '--arrow-left': '0px',
})

const arrowHeight = 9
const arrowWidth = 8
const sidePadding = 50

watch(() => props.visible, (visible) => {
  if (!visible || !dom_content.value || !props.btnEl) return
  const rect = props.btnEl.getBoundingClientRect()
  const origin = getRootOrigin()
  const maxHeight = document.body.clientHeight
  const elTop = rect.top - origin.y
  const bottomTopVal = elTop + rect.height
  const contentHeight = dom_content.value.scrollHeight + arrowHeight + sidePadding
  if (bottomTopVal + contentHeight < maxHeight || (contentHeight > elTop && elTop <= maxHeight - bottomTopVal)) {
    isShowTop.value = false
    popupStyle.top = bottomTopVal + arrowHeight + 'px'
    popupStyle.maxHeight = maxHeight - bottomTopVal - arrowHeight - sidePadding + 'px'
  } else {
    isShowTop.value = true
    let maxContentHeight = elTop - arrowHeight - sidePadding
    popupStyle.top = (elTop - (elTop < contentHeight ? elTop : contentHeight) + sidePadding) + 'px'
    popupStyle.maxHeight = maxContentHeight + 'px'
  }

  const maxWidth = document.body.clientWidth - 20
  let center = dom_content.value.clientWidth / 2
  let left = rect.left + rect.width / 2 - origin.x - center
  if (left < sidePadding) {
    center -= sidePadding - left
    left = sidePadding
  } else if (left + dom_content.value.clientWidth > maxWidth) {
    let newLeft = maxWidth - dom_content.value.clientWidth
    center = center + left - newLeft
    left = newLeft
  }
  popupStyle.left = left + 'px'
  popupStyle['--arrow-left'] = center - arrowWidth + 'px'
})

const handleHide = (evt?: MouseEvent) => {
  // if (evt && (evt.target as HTMLElement)?.parentNode != dom_content.value && props.visible) return emit('update:visible', false)
  // console.log(this.$refs)
  // if (evt && (evt.target == dom_btn.value || dom_btn.value?.contains(evt.target as HTMLElement))) return
  // setTimeout(() => {
  //   popupVisible.value = false
  emit('update:visible', false)
  // }, 50)
}


onMounted(() => {
  document.addEventListener('click', handleHide)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleHide)
})

</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.popup {
  position: absolute;
  max-width: 98%;
  border-radius: var(--qm-radius-panel, 12px);
  // 卡片底色 / 描边 / 投影统一走变量：浅色外壳为白卡，播放详情页切深色卡
  --qm-popup-bg: var(--color-content-background, #fff);
  --qm-popup-border: var(--qm-line-1);
  --qm-popup-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  background-color: var(--qm-popup-bg);
  border: 1px solid var(--qm-popup-border);
  opacity: 0;
  transform: scale(.94);
  transform-origin: 50% 0;
  transition: opacity 180ms var(--ease-out), transform 180ms var(--ease-out);
  transition-property: transform, opacity;
  max-height: 250px;
  // 层级契约：需高于播放详情页(65)、设置覆盖层(60)、工具栏(40)，低于 material-modal(99)
  z-index: 70;
  pointer-events: none;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.14));
  display: flex;
  box-sizing: border-box;

  &:before {
    content: " ";
    position: absolute;
    top: -6px;
    left: var(--arrow-left);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 8px solid var(--qm-popup-bg);
  }

  &.active {
    opacity: 1;
    transform: scale(1);
    pointer-events: initial;
  }

  &.top {
    filter: drop-shadow(0 -8px 24px rgba(0, 0, 0, 0.14));
    transform-origin: 50% 100%;

    &:before {
      top: 100%;
      border-bottom: none;
      border-top: 8px solid var(--qm-popup-bg);
    }
  }
}

// 播放详情页（深色画布）下的卡片配色
.dark {
  --qm-popup-bg: rgba(41, 41, 43, 0.98);
  --qm-popup-border: rgba(255, 255, 255, 0.08);
  --qm-popup-shadow: 0 -8px 28px rgba(0, 0, 0, 0.45);
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));

  &.top {
    filter: drop-shadow(0 -10px 30px rgba(0, 0, 0, 0.5));
  }
}

// 注意：这里必须用 `.popup .list` 两级选择器。
// 全局 .scroll 也声明了 scrollbar-gutter: stable，与本类**特异性相同(0,1,0)**，
// 谁生效取决于样式表注入顺序 —— 写单类时实测仍是 stable，
// 结果是弹窗按内容(66)定宽、却被多撑出 8px 滚动条槽(卡片 76)，
// 内容和向下的箭头都因此看着偏左。
.popup .list {
  // 内边距交给各弹窗内容自己定义（.qm-menu 6px / 音量面板自带），
  // 这里再加一层会让不同弹窗的留白叠成两倍、无法对齐参考图
  padding: 0;
  box-sizing: border-box;
  scrollbar-gutter: auto;
}

</style>
