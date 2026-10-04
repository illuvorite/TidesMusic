<template>
  <div :class="$style.checkbox">
    <input
      :id="id" ref="dom_input" :type="need ? 'radio' : 'checkbox'" :aria-hidden="true" :checked="checked"
      :class="$style.input" :disabled="disabled" :value="value" :name="name" @input="handleInput($event.target.checked)"
    >
    <label :for="id" :class="$style.content">
      <div :class="$style.container" :role="need ? 'radio' : 'checkbox'" tabindex="0" :aria-label="ariaLabel || label" :aria-checked="checked" :aria-disabled="disabled" @keydown.enter.space.stop.prevent="handleToggle">
        <svg version="1.1" :class="$style.icon" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" width="100%" viewBox="0 32 448 448" space="preserve">
          <use xlink:href="#icon-check-true" />
        </svg>
      </div>
      <slot v-if="label == null" />
      <span v-else :class="$style.label">
        {{ label }}
      </span>
    </label>
  </div>
</template>

<script>
export default {
  props: {
    modelValue: {
      type: [String, Boolean, Number, Array],
      required: true,
    },
    value: {
      type: [String, Boolean, Number, Array],
      default: undefined,
    },
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: undefined,
    },
    need: {
      type: Boolean,
      default: false,
    },
    ariaLabel: {
      type: String,
      default: undefined,
    },
    label: {
      type: String,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      checked: false,
    }
  },
  watch: {
    modelValue(n) {
      this.setValue(n)
    },
  },
  mounted() {
    this.setValue(this.modelValue)
  },
  methods: {
    handleInput(checked) {
      let modelValue
      if (Array.isArray(this.modelValue)) {
        modelValue = [...this.modelValue]
        if (checked) modelValue.push(this.value)
        else {
          const index = modelValue.indexOf(this.value)
          if (index > -1) modelValue.splice(index, 1)
        }
      } else {
        if (typeof this.modelValue == 'boolean') {
          modelValue = checked
        } else modelValue = checked ? this.value : ''
      }
      this.$emit('update:modelValue', modelValue)
      this.$emit('change', modelValue)
    },
    setValue(value) {
      let checked
      if (Array.isArray(value)) {
        checked = value.includes(this.value)
      } else {
        if (typeof this.modelValue == 'boolean') {
          checked = this.modelValue
        } else if (value == null) checked = this.modelValue != ''
        else checked = this.modelValue == this.value
      }
      // console.log(this.need, this.value, checked)
      // this.checked = this.need ? checked && this.value : checked
      if (this.checked == checked) return
      this.checked = checked
    },
    handleToggle(event) {
      event.lx_handled = true
      if (this.need) {
        if (this.$refs.dom_input.checked) return
        this.$refs.dom_input.checked = true
        this.handleInput(true)
      } else {
        this.$refs.dom_input.checked = !this.$refs.dom_input.checked
        this.handleInput(this.$refs.dom_input.checked)
      }
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.checkbox {
  display: inline-block;
  // font-size: 56px;
}
.input {
  display: none;
  &[disabled] {
    + .content {
      opacity: .5;
      .container, .label {
        cursor: default;
      }
    }
  }
  // 选中态：主色实心块 + 白色对勾（比原来的「只换描边色」更明确）
  &:checked {
    + .content {
      .container {
        color: #fff;
        &:after {
          border-color: var(--qm-primary);
          background-color: var(--qm-primary);
        }
      }
      .icon {
        transform: scale(1);
      }
    }
  }
}
.content {
  display: flex;
  align-items: center;
}
.container {
  flex: none;
  position: relative;
  width: 1em;
  height: 1em;
  cursor: pointer;
  display: flex;
  color: var(--qm-primary, var(--color-primary));
  transition: transform var(--qm-t-fast, @transition-fast);
  &:after {
    position: absolute;
    content: ' ';
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    border: 1.5px solid var(--qm-line-2, var(--qm-text-4));
    transition: border-color var(--qm-t-fast), background-color var(--qm-t-fast);
    border-radius: var(--qm-radius-xs, 6px);
  }
  &:hover:after {
    border-color: var(--qm-primary);
  }
  &:active {
    transform: scale(0.92);
  }
}
.icon {
  transition: transform 220ms var(--qm-ease-spring, var(--ease-spring));
  transition-property: transform;
  transform: scale(0);
  border-radius: var(--qm-radius-2xs, 4px);
}

.label {
  flex: auto;
  margin-left: var(--qm-sp-2, 6px);
  line-height: var(--qm-leading-normal, 1.5);
  cursor: pointer;
}

</style>
