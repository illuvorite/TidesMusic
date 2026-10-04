<template lang="pug">
div(:class="$style.header")
  button(type="button" :class="$style.btn" :aria-label="$t('player__hide_detail_tip')" ignore-tip :title="$t('player__hide_detail_tip')" @click="hide")
    svg-icon(name="chevron-down")
</template>


<script setup>
import { setShowPlayerDetail } from '@renderer/store/player/action'

// 收起播放详情页（返回列表）
const hide = () => {
  setShowPlayerDetail(false)
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.header {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
  padding: 12px 0 0 12px;
  -webkit-app-region: no-drag;

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
      transform @transition-fast;

    :global(.svg-icon) { width: var(--qm-icon-xs); height: var(--qm-icon-xs); }

    &:hover {
      opacity: 1;
      background-color: var(--qm-hover, rgba(255, 255, 255, .14));
    }
    &:active { transform: scale(.92); }
  }
}
</style>
