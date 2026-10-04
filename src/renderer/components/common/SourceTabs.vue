<template>
  <div :class="$style.tabs">
    <span :class="$style.label">音乐平台</span>
    <div :class="$style.list">
      <button
        v-for="item in list" :key="item.id"
        type="button"
        :class="[$style.tab, { [$style.active]: item.id === modelValue }]"
        @click="handleClick(item.id)"
      >
        {{ item.name }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from '@common/utils/vueTools'
import { getAvailableSources, getSourceName } from '@renderer/utils/personalRecommend'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const list = computed(() => getAvailableSources().map(id => ({ id, name: getSourceName(id) })))

const handleClick = (id) => {
  if (id === props.modelValue) return
  emit('update:modelValue', id)
  emit('change', id)
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.tabs {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  min-width: 0;
}

.label {
  flex: none;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
}

.list {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
}

.tab {
  flex: none;
  height: 28px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--qm-radius-panel);
  font-size: var(--qm-fs-xs, 12px);
  line-height: 28px;
  color: var(--qm-text-3);
  background-color: rgba(0, 0, 0, .05);
  cursor: pointer;
  white-space: nowrap;
  transition: color @transition-fast, background-color @transition-fast, transform @transition-fast;

  &:hover {
    color: var(--qm-text-1);
    background-color: rgba(0, 0, 0, .08);
  }

  &:active { transform: scale(.96); }

  &.active {
    color: var(--qm-text-invert);
    background-color: var(--qm-primary);

    &:hover { background-color: var(--qm-primary-hover); }
  }
}
</style>
