<template>
  <component :is="Teleport" to="#root">
    <div
      :class="[$style.popup, {[$style.top]: isShowTop}, {[$style.active]: props.visible}]"
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
import { ref, watch, onMounted, onBeforeUnmount, reactive } from '@common/utils/vueTools'

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
  const maxHeight = document.body.clientHeight
  const elTop = rect.top - window.lx.rootOffset
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
  let left = rect.left + rect.width / 2 - window.lx.rootOffset - center
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
  border-radius: @radius-md;
  // 不透明卡片底 + 1px 描边，去掉磨砂导致的白边光晕。
  // 用 --qm-card 跟随主题，避免深色主题下白底配浅字。
  background-color: var(--qm-card);
  border: 1px solid var(--qm-line-1);
  opacity: 0;
  transform: scale(.94);
  transform-origin: 50% 0 0;
  transition: opacity 180ms var(--ease-out), transform 180ms var(--ease-out);
  transition-property: transform, opacity;
  max-height: 250px;
  // 层级契约：需高于播放详情页(65)、设置覆盖层(60)、工具栏(40)，低于 material-modal(99)
  z-index: 70;
  pointer-events: none;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.14));
  display: flex;

  &:before {
    content: " ";
    position: absolute;
    top: -6px;
    left: var(--arrow-left);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 8px solid #fff;
  }

  &.active {
    opacity: 1;
    transform: scale(1);
    pointer-events: initial;
  }

  &.top {
    filter: drop-shadow(0 -8px 24px rgba(0, 0, 0, 0.14));
    transform-origin: 50% 100% 0;

    &:before {
      top: 100%;
      border-bottom: none;
      border-top: 8px solid #fff;
    }
  }
}
.list {
  padding: var(--qm-sp-4, 10px);
  box-sizing: border-box;
}

</style>
