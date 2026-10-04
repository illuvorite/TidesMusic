<template>
  <button
    :class="[$style.tile, { [$style.selected]: selected, [$style.disabled]: disabled }]"
    type="button"
    :style="{ backgroundImage: backgroundImage }"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <span :class="$style.glow" />
    <span :class="$style.wave" />
    <span :class="$style.label">
      <slot>{{ label }}</slot>
    </span>
    <span v-if="selected" :class="$style.badge">
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 40 448 448" space="preserve">
        <use xlink:href="#icon-check" />
      </svg>
    </span>
    <slot name="corner" />
  </button>
</template>

<script setup>
import { computed } from '@common/utils/vueTools'

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  /** 磁贴底色渐变（CSS 渐变字符串，无图片时使用） */
  colors: {
    type: String,
    default: 'linear-gradient(135deg, #7f8c9b, #5c6674)',
  },
  /** 磁贴背景图片（优先于 colors） */
  image: {
    type: String,
    default: '',
  },
  selected: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
defineEmits(['click'])

// 有图片用图片（background-size: cover），否则退回矢量渐变
const backgroundImage = computed(() => (props.image ? `url("${props.image}")` : props.colors))
</script>

<style lang="less" module>
.tile {
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 84px;
  padding: 0 6px;
  border: 2px solid transparent;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  box-sizing: border-box;
  color: #fff;
  background-size: 100% 100%;
  transition: transform var(--qm-t-fast, .18s), box-shadow var(--qm-t-fast, .18s), border-color var(--qm-t-fast, .18s);

  &:hover:not(.disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(0, 0, 0, .22);
  }
  &:active:not(.disabled) {
    transform: scale(.97);
  }

  &.selected {
    // 参考图：选中态为绿色描边 + 绿色勾选角标
    border-color: #12b981;
    box-shadow: 0 0 0 1px rgba(18, 185, 129, .30), 0 6px 14px rgba(0, 0, 0, .22);
  }

  &.disabled {
    opacity: .45;
    cursor: not-allowed;
  }
}

// 磁贴遮罩：底部轻微压暗保证文字可读，顶部一点高光增加层次（不洗白图片）
.glow {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, .05) 0%, rgba(0, 0, 0, .30) 100%),
    radial-gradient(circle at 78% 14%, rgba(255, 255, 255, .14), transparent 42%);
  pointer-events: none;
}

// 极淡的声场波纹（图片模式下几乎不可见）
.wave {
  position: absolute;
  inset: 0;
  background: repeating-radial-gradient(circle at 62% 30%, rgba(255, 255, 255, .05) 0 1px, transparent 1px 10px);
  pointer-events: none;
}

.label {
  position: relative;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, .35);
  word-break: break-all;
}

.badge {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4be0a0, #12b981);
  border-top-left-radius: 8px;

  svg {
    width: 11px;
    height: 11px;
    fill: #fff;
  }
}
</style>
