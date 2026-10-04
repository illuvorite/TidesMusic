<template lang="pug">
div(:class="$style.header")
  div(ref="dom_btns" :class="$style.controBtn")
    button(type="button" :class="$style.btn" :aria-label="$t('min')" ignore-tip :title="$t('min')" @click="minWindow")
      svg(:class="$style.icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true")
        use(xlink:href="#icon-window-minimize-2")
    button(type="button" :class="$style.btn" :aria-label="$t('max')" ignore-tip :title="$t('max')" @click="maxWindowToggle")
      svg(:class="$style.icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true")
        use(xlink:href="#icon-window-maximize-2")
    button(type="button" :class="[$style.btn, $style.close]" :aria-label="$t('close')" ignore-tip :title="$t('close')" @click="closeWindow")
      svg(:class="$style.icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true")
        use(xlink:href="#icon-window-close-2")
</template>


<script setup>
import { onMounted, onBeforeUnmount, ref, useCssModule } from '@common/utils/vueTools'
import { minWindow, maxWindowToggle, closeWindow } from '@renderer/utils/ipc'

const dom_btns = ref()
const cssModule = useCssModule()

const handle_focus = () => {
  if (!dom_btns.value) return
  for (const node of dom_btns.value.childNodes) {
    if (node.tagName != 'BUTTON') continue
    node.classList.remove(cssModule.hover)
  }
}
const getBtnEl = (el) => el.tagName == 'BUTTON' || !el ? el : getBtnEl(el.parentNode)
const handle_mouseover = (event) => {
  const btn = getBtnEl(event.target)
  if (!btn) return
  btn.classList.add(cssModule.hover)
}
const handle_mouseout = (event) => {
  const btn = getBtnEl(event.target)
  if (!btn) return
  btn.classList.remove(cssModule.hover)
}


onMounted(() => {
  window.app_event.on('focus', handle_focus)
  dom_btns.value.addEventListener('mouseover', handle_mouseover)
  dom_btns.value.addEventListener('mouseout', handle_mouseout)
})
onBeforeUnmount(() => {
  window.app_event.off('focus', handle_focus)
  dom_btns.value.removeEventListener('mouseover', handle_mouseover)
  dom_btns.value.removeEventListener('mouseout', handle_mouseout)
})
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.header {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 3;
  padding: 12px 12px 0 0;
  -webkit-app-region: no-drag;

  .controBtn {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    gap: var(--qm-sp-1, 4px);
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: none;
    outline: none;
    cursor: pointer;
    border-radius: 50%;
    color: var(--qm-text-2);
    background-color: transparent;
    opacity: .72;
    transition:
      background-color @transition-base,
      opacity @transition-base,
      color @transition-base,
      transform @transition-fast;

    .icon {
      display: block;
      fill: currentColor;
    }

    &.hover {
      opacity: 1;
      background-color: var(--qm-hover, rgba(255, 255, 255, .14));
    }
    &.close.hover {
      background-color: var(--color-btn-close);
      color: #fff;
    }
    &:active { transform: scale(.92); }
  }
}
</style>
