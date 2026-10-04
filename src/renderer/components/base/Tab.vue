<template>
  <ul :class="[$style.list, $style[align]]" role="tablist">
    <li
      v-for="item in list"
      :key="item[itemKey]" :class="[$style.listItem, {[$style.active]: modelValue == item[itemKey]}]" tabindex="-1" role="tab"
      :aria-label="item[itemLabel]" ignore-tip :aria-selected="modelValue == item[itemKey]" @click="handleToggle(item[itemKey])"
    >
      <span :class="$style.label">{{ item[itemLabel] }}</span>
    </li>
  </ul>
</template>

<script>

export default {
  props: {
    list: {
      type: Array,
      default() {
        return []
      },
    },
    align: {
      type: String,
      default: 'left',
    },
    itemKey: {
      type: String,
      default: 'id',
    },
    itemLabel: {
      type: String,
      default: 'label',
    },
    modelValue: {
      type: [String, Number],
      default: '',
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const handleToggle = id => {
      if (id == props.modelValue) return
      emit('update:modelValue', id)
      emit('change', id)
    }

    return {
      handleToggle,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.list {
  display: flex;
  flex-flow: row nowrap;
  font-size: var(--qm-fs-sm, 13px);
  font-weight: var(--qm-fw-medium, 500);
  gap: var(--qm-sp-9, 24px);
  padding: 0 16px;

  &.left {
    justify-content: flex-start;
  }
  &.center {
    justify-content: center;
  }
  &.right {
    justify-content: flex-end;
  }
}
.listItem {
  display: block;
  cursor: pointer;
  transition: color @transition-base;
  color: var(--qm-text-4);

  &:hover {
    color: var(--qm-primary);
  }

  &.active {
    color: var(--qm-primary);
    font-weight: var(--qm-fw-semibold, 600);
    cursor: default;

    >.label {
      &:after {
        opacity: 1;
        transform: translateY(0) scaleX(1);
      }
    }
  }
}

.label {
  display: block;
  position: relative;
  padding: 10px 2px;
  &:after {
    .mixin-after();
    left: 0;
    bottom: 0;
    width: 100%;
    height: 2px;
    border-radius: var(--qm-radius-2xs, 4px);
    background-color: var(--qm-primary);
    transform: translateY(2px) scaleX(0.6);
    opacity: 0;
    transition: transform var(--transition-base), opacity var(--transition-base);
  }
}
</style>
