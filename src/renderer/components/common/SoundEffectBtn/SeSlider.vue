<template>
  <div
    :class="[$style.wrap, { [$style.disabled]: disabled }]"
    role="slider"
    :aria-valuenow="value"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :tabindex="disabled ? -1 : 0"
    @keydown="handleKeydown"
  >
    <div :class="$style.track">
      <div :class="$style.fill" :style="{ width: ratioPercent }" />
    </div>
    <div :class="$style.thumb" :style="{ left: ratioPercent }" />
    <div :class="$style.hit" @mousedown="handleDown" />
  </div>
</template>

<script>
import { computed, onBeforeUnmount } from '@common/utils/vueTools'

// QQ 音乐音效面板同款横向滑条：
//   4px 圆角轨道 + 主绿填充 + 白色圆形滑块
// 与全局 SliderBar 的差别只在外观（带滑块）；交互逻辑保持一致：
// 按下先记值不跳变、位移 4px 内视为误触、buttons===0 兜底结束拖拽。
export default {
  props: {
    value: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    step: { type: Number, default: 1 },
    disabled: { type: Boolean, default: false },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const drag = { active: false, startX: 0, startValue: 0, width: 0, moved: false }

    const ratioPercent = computed(() => {
      const range = props.max - props.min
      const r = range === 0 ? 0 : (props.value - props.min) / range
      return `${Math.min(1, Math.max(0, r)) * 100}%`
    })

    const clamp = val => {
      if (val < props.min) return props.min
      if (val > props.max) return props.max
      return val
    }
    const stepped = raw => {
      const step = props.step > 0 ? props.step : 1
      const v = Math.round((raw - props.min) / step) * step + props.min
      return clamp(Number(v.toFixed(10)))
    }
    const emitStepped = raw => {
      const next = stepped(raw)
      if (next !== props.value) emit('change', next)
    }

    const handleDown = event => {
      if (props.disabled) return
      const width = event.currentTarget.clientWidth
      if (!width) return
      drag.active = true
      drag.moved = false
      drag.startX = event.clientX
      drag.startValue = props.value
      drag.width = width
    }
    const handleMove = event => {
      if (!drag.active) return
      // 拖拽途中鼠标键已松开（mouseup 被组件重挂载等场景吞掉）时立即收尾，避免取值乱跳
      if (event.buttons === 0) {
        drag.active = false
        return
      }
      if (props.disabled) return
      const dx = event.clientX - drag.startX
      // 误触保护：4px 内不视为拖拽
      if (Math.abs(dx) <= 4 && !drag.moved) return
      drag.moved = true
      emitStepped(drag.startValue + dx / drag.width * (props.max - props.min))
    }
    const handleUp = () => {
      drag.active = false
      drag.moved = false
    }
    const handleKeydown = event => {
      if (props.disabled) return
      const step = props.step > 0 ? props.step : 1
      const big = step * 10
      let next = null
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = props.value - step
      else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = props.value + step
      else if (event.key === 'PageDown') next = props.value - big
      else if (event.key === 'PageUp') next = props.value + big
      else if (event.key === 'Home') next = props.min
      else if (event.key === 'End') next = props.max
      if (next == null) return
      event.preventDefault()
      emitStepped(next)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    onBeforeUnmount(() => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    })

    return {
      ratioPercent,
      handleDown,
      handleKeydown,
    }
  },
}
</script>

<style lang="less" module>
.wrap {
  position: relative;
  flex: auto;
  min-width: 0;
  height: 16px;
  display: flex;
  align-items: center;
  outline: none;
  cursor: pointer;

  &.disabled {
    opacity: 0.4;
    cursor: default;
  }
}

.track {
  position: relative;
  width: 100%;
  height: var(--se-track-h, 4px);
  border-radius: 999px;
  background-color: var(--se-track, #acacac);
  overflow: hidden;
}

.fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 999px;
  background-color: var(--se-accent, #1ecc94);
}

// 白色圆形滑块：带一圈浅描边，保证在浅色卡片底上也可见
.thumb {
  position: absolute;
  top: 50%;
  width: var(--se-thumb, 12px);
  height: var(--se-thumb, 12px);
  margin-left: calc(var(--se-thumb, 12px) / -2);
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.2);
  transform: translateY(-50%);
  pointer-events: none;
  transition: box-shadow var(--qm-t-fast, 150ms ease);
}

.wrap:hover .thumb,
.wrap:focus-visible .thumb {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.2), 0 0 0 4px rgba(30, 204, 148, 0.18);
}

.hit {
  position: absolute;
  // 纵向扩一点便于点中，但不超过行距（增强滑条行距 30px）以免相邻行热区重叠
  inset: -6px 0;
  cursor: pointer;
}
</style>
