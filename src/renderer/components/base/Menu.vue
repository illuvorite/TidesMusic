<template>
  <teleport to="#root">
    <ul ref="dom_menu" :class="$style.list" :style="menuStyles" role="toolbar" :aria-hidden="!modelValue">
      <li
        v-for="item in menus"
        v-show="!item.hide && (item.action == 'download' ? appSetting['download.enable'] : true)"
        :key="item.action"
        :class="$style.listItem"
        role="tab"
        tabindex="0"
        :aria-label="item[itemName]"
        ignore-tip
        :disabled="item.disabled ? true : null"
        @click="menuClick(item)"
      >
        {{ item[itemName] }}
      </li>
    </ul>
  </teleport>
</template>

<script>
import { computed } from '@common/utils/vueTools'
import useMenuLocation from '@renderer/utils/compositions/useMenuLocation'

import { appSetting } from '@renderer/store/setting'


export default {
  name: 'MenuToolBar',
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    xy: {
      type: Object,
      required: true,
    },
    menus: {
      type: Array,
      default() {
        return []
      },
    },
    itemName: {
      type: String,
      default: 'name',
    },
  },
  emits: ['update:modelValue', 'menu-click'],
  setup(props, { emit }) {
    const visible = computed(() => props.modelValue)
    const location = computed(() => props.xy)

    const onHide = () => {
      emit('update:modelValue', false)
      menuClick(null)
    }

    const { dom_menu, menuStyles } = useMenuLocation({
      visible,
      location,
      onHide,
    })

    const menuClick = (item) => {
      if (item?.disabled) return
      emit('menu-click', item)
    }

    return {
      dom_menu,
      menuStyles,
      menuClick,
      appSetting,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.list {
  font-size: var(--qm-fs-sm, 13px);
  position: absolute;
  opacity: 0;
  transform: scale(0.94);
  transform-origin: 0 0 0;
  transition: opacity 160ms var(--ease-out), transform 160ms var(--ease-out);
  transition-property: transform, opacity;
  border-radius: var(--qm-radius-card);
  // 不透明卡片底 + 1px 描边：避免磨砂/半透明底在页面上形成一圈多余的白色描边。
  // 必须用 --qm-card（跟随主题：浅色主题白、深色主题深），不要写死 #fff，
  // 否则深色主题下会白底配浅字 → 内容不可读。
  background-color: var(--qm-card);
  border: 1px solid var(--qm-line-1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .12);
  // 层级契约：teleport 到 #root 的右键菜单，需高于播放详情页(65)/设置覆盖层(60)/工具栏(40)，
  // 低于 material-modal(99)
  z-index: 70;
  overflow: hidden;
  padding: var(--qm-sp-2, 6px);
  min-width: 140px;
}
.listItem {
  cursor: pointer;
  min-width: 96px;
  line-height: 30px;
  padding: 0 12px;
  text-align: left;
  outline: none;
  border-radius: var(--qm-radius-xs, 6px);
  transition: background-color @transition-fast, color @transition-fast;
  box-sizing: border-box;
  .mixin-ellipsis-1();

  &:hover {
    background-color: var(--qm-hover);
    color: inherit;
  }
  &:active {
    background-color: var(--qm-hover-strong);
    color: inherit;
  }

  &[disabled] {
    cursor: default;
    opacity: .4;
    &:hover {
      background: none !important;
      color: inherit !important;
    }
  }
}

</style>
