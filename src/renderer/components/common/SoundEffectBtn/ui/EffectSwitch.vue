<template>
  <button
    :class="[$style.switch, { [$style.on]: modelValue, [$style.disabled]: disabled }]"
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="handleToggle"
  >
    <span :class="$style.track">
      <svg :class="$style.check" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 40 448 448" space="preserve">
        <use xlink:href="#icon-check" />
      </svg>
      <span :class="$style.knob" />
    </span>
  </button>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['update:modelValue'])
const handleToggle = () => {
  emit('update:modelValue', !props.modelValue)
}
</script>

<style lang="less" module>
@accent-a: #4be0a0;
@accent-b: #12b981;

.switch {
  flex: none;
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 0;

  &.disabled {
    opacity: .45;
    cursor: not-allowed;
  }
}

.track {
  position: relative;
  display: block;
  width: 46px;
  height: 25px;
  border-radius: 999px;
  background: linear-gradient(180deg, #d6dae1, #c6cbd4);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, .22), 0 0 0 .5px rgba(0, 0, 0, .04);
  transition: background .28s cubic-bezier(.4, 0, .2, 1), box-shadow .28s cubic-bezier(.4, 0, .2, 1);
}

.on .track {
  background: linear-gradient(135deg, @accent-a, @accent-b);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, .16), 0 0 0 .5px fade(@accent-b, 30%);
}

.check {
  position: absolute;
  left: 7px;
  top: 6.5px;
  width: 12px;
  height: 12px;
  fill: #fff;
  opacity: 0;
  transform: scale(.5);
  transition: opacity .22s, transform .22s;
}

.on .check {
  opacity: .95;
  transform: scale(1);
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 28%, #fff 0%, #f4f6f9 55%, #dfe4ea 100%);
  box-shadow: 0 1.5px 4px rgba(0, 0, 0, .3), 0 0 0 .5px rgba(0, 0, 0, .06);
  transition: transform .28s cubic-bezier(.4, 0, .2, 1);
}

.on .knob {
  transform: translateX(21px);
}
</style>
