<template>
  <div :class="[$style.wrap, vertical ? $style.vertical : $style.horizontal, { [$style.disabled]: disabled }]">
    <div :class="$style.rail">
      <div :class="$style.fill" :style="fillStyle" />
    </div>
    <div ref="dom_travel" :class="$style.travel">
      <div v-if="hasCenterFill" :class="$style.zeroLine" :style="zeroLineStyle" />
      <div :class="$style.knob" :style="knobStyle" />
    </div>
    <div :class="$style.mask" @mousedown="handleMsDown" />
  </div>
</template>

<script setup>
import { computed, ref, onBeforeUnmount } from '@common/utils/vueTools'

const props = defineProps({
  value: {
    type: Number,
    required: true,
  },
  min: {
    type: Number,
    required: true,
  },
  max: {
    type: Number,
    required: true,
  },
  step: {
    type: Number,
    default: 1,
  },
  /** 竖向滑块（参考图音效面板的均衡器样式） */
  vertical: {
    type: Boolean,
    default: false,
  },
  /**
   * 填充基准值：竖向滑块会从该值对应的位置向当前值填充。
   * 例如均衡器传入 0，则 0dB 时无填充、增益向上填充、衰减向下填充。
   * 不传时等于 min（从底部填充）。
   */
  zero: {
    type: Number,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['change'])

const dom_travel = ref(null)

const ratio = computed(() => {
  const range = props.max - props.min
  if (!range) return 0
  return Math.min(1, Math.max(0, (props.value - props.min) / range))
})

/** 填充基准位置（0 = 轨道底部，1 = 轨道顶部） */
const zeroRatio = computed(() => {
  const range = props.max - props.min
  if (!range) return 0
  const zero = props.zero ?? props.min
  return Math.min(1, Math.max(0, (zero - props.min) / range))
})

const hasCenterFill = computed(() => props.vertical && props.zero !== null)

const fillStyle = computed(() => {
  if (hasCenterFill.value) {
    // 以基准值（如 0dB）为中心向当前值填充
    const from = Math.min(ratio.value, zeroRatio.value)
    const to = Math.max(ratio.value, zeroRatio.value)
    return { bottom: `${from * 100}%`, height: `${(to - from) * 100}%` }
  }
  const percent = `${ratio.value * 100}%`
  return props.vertical ? { height: percent } : { width: percent }
})

/** 基准线（0dB 刻度）位置 */
const zeroLineStyle = computed(() => ({ bottom: `${zeroRatio.value * 100}%` }))
const knobStyle = computed(() => {
  // 竖向滑块从底部起算（与参考图一致）；translate 由样式表负责居中
  return props.vertical ? { top: `${(1 - ratio.value) * 100}%` } : { left: `${ratio.value * 100}%` }
})

// ——— 拖拽（沿用 base/SliderBar 的误触与状态保护逻辑）———
const sliderEvent = {
  isMsDown: false,
  msDownPos: 0,
  msDownRatio: 0,
  moved: false,
}

const clampValue = (val) => {
  if (val < props.min) return props.min
  if (val > props.max) return props.max
  return val
}
const getSteppedValue = (val) => {
  const step = props.step > 0 ? props.step : 1
  const stepped = Math.round((val - props.min) / step) * step + props.min
  return clampValue(Number(stepped.toFixed(10)))
}
const getRect = () => dom_travel.value?.getBoundingClientRect() ?? null
const getRange = () => props.max - props.min

const handleMsDown = (event) => {
  if (props.disabled) return
  const rect = getRect()
  if (!rect) return
  sliderEvent.isMsDown = true
  sliderEvent.msDownPos = props.vertical ? event.clientY : event.clientX
  sliderEvent.msDownRatio = getRange() === 0 ? 0 : (props.value - props.min) / getRange()
  sliderEvent.moved = false
}
const handleMsUp = () => {
  sliderEvent.isMsDown = false
  sliderEvent.moved = false
}
const handleMsMove = (event) => {
  if (!sliderEvent.isMsDown) return
  // 鼠标按键已松开却仍处于拖拽态（mouseup 被吞）→ 立即结束，避免滑杆自己乱跳
  if (event.buttons === 0) {
    sliderEvent.isMsDown = false
    return
  }
  if (props.disabled) return
  const rect = getRect()
  if (!rect) return

  const pos = props.vertical ? event.clientY : event.clientX
  const size = props.vertical ? rect.height : rect.width
  if (!size) return

  const delta = pos - sliderEvent.msDownPos
  // 误触保护：4px 内不视为拖拽
  if (Math.abs(delta) <= 4 && !sliderEvent.moved) return
  sliderEvent.moved = true

  const ratioDelta = (props.vertical ? -delta : delta) / size
  emit('change', getSteppedValue((sliderEvent.msDownRatio + ratioDelta) * getRange() + props.min))
}

document.addEventListener('mousemove', handleMsMove)
document.addEventListener('mouseup', handleMsUp)
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleMsMove)
  document.removeEventListener('mouseup', handleMsUp)
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@accent-a: #4be0a0;
@accent-b: #12b981;
@knob: 12px;

.wrap {
  position: relative;
  flex: none;
  transition: opacity @transition-normal;

  &.disabled {
    opacity: .35;
    .mask {
      cursor: default;
    }
  }
}

.horizontal {
  width: 100%;
  height: 22px;

  .rail {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 4px;
    margin-top: -2px;
    border-radius: 999px;
    overflow: hidden;
  }
  .fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
  }
  .travel {
    position: absolute;
    left: calc(@knob / 2);
    right: calc(@knob / 2);
    top: 0;
    bottom: 0;
  }
  .knob {
    top: 50%;
    transform: translate(-50%, -50%);
  }
}

.vertical {
  width: 24px;
  height: 100%;

  .rail {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 4px;
    margin-left: -2px;
    border-radius: 999px;
    overflow: hidden;
  }
  .fill {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
  }
  .travel {
    position: absolute;
    top: calc(@knob / 2);
    bottom: calc(@knob / 2);
    left: 0;
    right: 0;
  }
  .knob {
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

.rail {
  // 图片化轨道：浅灰底 + 内阴影，营造「凹槽」质感
  background: linear-gradient(180deg, #dcdfe5, #cfd3da);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, .18), 0 0 .5px rgba(0, 0, 0, .06);
}

.fill {
  // 已填充部分：青绿渐变（参考图配色），并带内侧高光
  background: linear-gradient(180deg, @accent-a, @accent-b);
  box-shadow: inset 0 0 0 .5px fade(#000, 6%);
}

.knob {
  position: absolute;
  width: @knob;
  height: @knob;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 28%, #fff 0%, #f6f8fa 58%, #e1e6ec 100%);
  box-shadow: 0 1.5px 4px rgba(0, 0, 0, .32), 0 0 0 .5px rgba(0, 0, 0, .07);
  pointer-events: none;
}

.zeroLine {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background-color: rgba(0, 0, 0, .16);
  pointer-events: none;
}

.mask {
  position: absolute;
  inset: 0;
  cursor: pointer;
}
</style>
