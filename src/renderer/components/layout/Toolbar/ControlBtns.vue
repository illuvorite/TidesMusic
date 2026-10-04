<template>
  <div v-show="!isFullscreen" ref="dom_btns" :class="$style.control">
    <!-- 还原 / 隐藏到托盘 -->
    <button type="button" :class="[$style.btn, $style.hide]" :aria-label="$t('hide')" ignore-tip :title="$t('hide')" @click="showHideWindowToggle">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M15 7.5v-1A1.5 1.5 0 0 0 13.5 5h-7A1.5 1.5 0 0 0 5 6.5v6A1.5 1.5 0 0 0 6.5 14h1"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        />
        <rect x="9.2" y="11" width="9.8" height="6" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </button>
    <!-- 最小化 -->
    <button type="button" :class="[$style.btn, $style.min]" :aria-label="$t('min')" ignore-tip :title="$t('min')" @click="minWindow">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M4.5 12h15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
    <!-- 最大化 / 还原 -->
    <button type="button" :class="[$style.btn, $style.max]" :aria-label="$t('max')" ignore-tip :title="$t('max')" @click="maxWindowToggle">
      <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
        <rect x="5.4" y="5.4" width="13.2" height="13.2" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </button>
    <!-- 关闭 -->
    <button type="button" :class="[$style.btn, $style.close]" :aria-label="$t('close')" ignore-tip :title="$t('close')" @click="closeWindow">
      <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
        <path d="M5.8 5.8 18.2 18.2M18.2 5.8 5.8 18.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { minWindow, maxWindowToggle, closeWindow, showHideWindowToggle } from '@renderer/utils/ipc'
import { onMounted, onBeforeUnmount, ref, useCssModule } from '@common/utils/vueTools'
import { isFullscreen } from '@renderer/store'

const dom_btns = ref()

const cssModule = useCssModule()

const handle_focus = () => {
  if (!dom_btns.value) return
  // 必须先转成静态数组再遍历：`childNodes` 是**活节点集**，遍历过程中若 DOM 被
  // 移除/重排（设置页关闭等场景会触发），迭代器可能拿到已脱离文档的节点，
  // 读它的 tagName 抛 `Cannot read properties of null (reading 'tagName')`。
  const nodes = Array.prototype.slice.call(dom_btns.value.childNodes)
  for (const node of nodes) {
    if (!node || node.tagName != 'BUTTON') continue
    node.classList.remove(cssModule.hover)
  }
}
// 注意：向上找祖先时必须在 document 处停下。原实现 `el.tagName == 'BUTTON' || !el ? el : getBtnEl(el.parentNode)`
// 对 document 会继续往上取 parentNode（恒为 null）→ 下一层读 null.tagName 抛错。
const getBtnEl = (el) => {
  let cur = el
  while (cur && cur !== document) {
    if (cur.tagName == 'BUTTON') return cur
    cur = cur.parentNode
  }
  return null
}
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

.control {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
  height: 30px;

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 36px;
    height: 30px;
    padding: 0;
    background: none;
    border: none;
    outline: none;
    border-radius: var(--qm-radius-sm, 8px);
    cursor: pointer;
    color: rgb(138, 138, 138);
    transition: background-color 0.16s ease-in-out, color 0.16s ease-in-out;

    &:active { transform: scale(0.94); }

    &.hover {
      &.hide, &.min, &.max {
        background-color: rgba(0, 0, 0, 0.05);
        color: rgb(60, 60, 60);
      }
      &.close {
        background-color: var(--color-btn-close);
        color: rgb(60, 60, 60);
      }
    }
  }
}

</style>
