<template>
  <svg class="svg-icon" aria-hidden="true">
    <use :xlink:href="id" />
  </svg>
</template>

<script>

export default {
  name: 'SvgIcon',
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  computed: {
    id() {
      return `#icon-${this.name}`
    },
  },
}
</script>

<style>
/* 全局图标基线：尺寸走 --qm-icon-* token（默认 20px），颜色一律 currentColor。
   描边/实心由各 svg 资源内部定义，这里不覆盖，保证「同一套图形语言」。 */
.svg-icon {
  width: var(--qm-icon, 20px);
  height: var(--qm-icon, 20px);
  flex: none;
  vertical-align: -0.22em;
  fill: currentColor;
  overflow: hidden;
  transition:
    opacity var(--qm-t-fast, 150ms cubic-bezier(0.16, 1, 0.3, 1)),
    color var(--qm-t-fast, 150ms cubic-bezier(0.16, 1, 0.3, 1)),
    transform var(--qm-t-fast, 150ms cubic-bezier(0.16, 1, 0.3, 1));
}
</style>
