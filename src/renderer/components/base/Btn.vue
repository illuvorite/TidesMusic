<template>
  <button
    :class="[$style.btn, {[$style.min]: min}, {[$style.outline]: outline}]"
    tabindex="0"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script>
export default {
  props: {
    min: {
      type: Boolean,
    },
    outline: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--qm-radius-btn, 8px);
  cursor: pointer;
  padding: 7px 16px;
  // 使用「主色浅色调 + 主色文字」（Apple 的 tinted button），
  // 修掉原先「浅底 + 浅色字」导致的对比度不足问题
  color: var(--qm-primary, var(--qm-text-3));
  outline: none;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast),
    box-shadow var(--qm-t-fast), transform var(--qm-t-fast), opacity var(--qm-t-fast);
  background-color: var(--qm-primary-soft, var(--qm-hover));
  font-size: var(--qm-font-title-md, 13px);
  font-weight: var(--qm-fw-medium, 500);
  letter-spacing: var(--qm-tracking-normal, 0);
  white-space: nowrap;

  &[disabled] {
    opacity: .4;
    cursor: not-allowed;
  }

  &.outline {
    background-color: transparent;
    border: 1px solid var(--qm-line-2);
    color: var(--qm-text-2);
  }

  &:hover:not([disabled]) {
    background-color: var(--qm-primary-soft-hover, var(--qm-hover));
    box-shadow: var(--qm-shadow-1, var(--shadow-1));
  }
  &:active:not([disabled]) {
    background-color: var(--qm-primary-soft, var(--qm-hover-strong));
    transform: scale(0.97);
    box-shadow: none;
  }
  &.outline:hover:not([disabled]) {
    background-color: var(--qm-hover, var(--qm-field));
    color: var(--qm-text-1, var(--qm-text-2));
  }
  &:focus-visible {
    box-shadow: var(--focus-ring, 0 0 0 3px rgba(0, 0, 0, .12));
  }
}

.min {
  padding: 4px 12px;
  font-size: var(--qm-font-aux, 12px);
  border-radius: var(--qm-radius-sm, 8px);
}

</style>
