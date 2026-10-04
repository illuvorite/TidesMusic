<template>
  <teleport to="#root">
    <div
      ref="dom_menu" :class="[$style.menu, { [$style.dark]: isDark, [$style.active]: modelValue }]"
      :style="menuStyles" role="menu" :aria-hidden="!modelValue"
      @mouseleave="handleRootLeave"
    >
      <ul :class="$style.list">
        <template v-for="item in viewMenus" :key="item.__key">
          <li v-if="item.divider" :class="$style.divider" aria-hidden="true" />
          <li
            v-else
            :class="[$style.listItem, { [$style.withIcon]: item.icon, [$style.itemActive]: activeKey === item.__key }]"
            role="menuitem" tabindex="-1" :aria-label="item[itemName]" ignore-tip
            :disabled="item.disabled ? true : null"
            @mouseenter="handleItemEnter(item, $event.currentTarget)"
            @click="handleItemClick(item)"
          >
            <svg-icon v-if="item.icon" :name="item.icon" :class="[$style.icon, { [$style.iconLove]: item.iconActive }]" />
            <span :class="$style.text">{{ item[itemName] }}</span>
            <svg-icon v-if="item.submenu && item.submenu.length" name="chevron-right" :class="$style.chevron" />
          </li>
        </template>
      </ul>

      <!-- 二级面板（添加到 / 移动到）：与主面板同款卡片，首项与父项对心 -->
      <ul v-if="activeSub" ref="dom_sub" :class="[$style.list, $style.submenu]" :style="subStyles">
        <template v-for="item in activeSub" :key="item.__key">
          <li v-if="item.divider" :class="$style.divider" aria-hidden="true" />
          <li
            v-else :class="[$style.listItem, { [$style.withIcon]: item.icon }]" role="menuitem" tabindex="-1"
            :aria-label="item[itemName]" ignore-tip :disabled="item.disabled ? true : null"
            @mouseenter="handleSubEnter" @click="handleSubClick(item)"
          >
            <svg-icon v-if="item.icon" :name="item.icon" :class="$style.icon" />
            <span :class="$style.text">{{ item[itemName] }}</span>
          </li>
        </template>
      </ul>
    </div>
  </teleport>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from '@common/utils/vueTools'
import useMenuLocation from '@renderer/utils/compositions/useMenuLocation'
import { appSetting } from '@renderer/store/setting'
import { isDarkTheme } from '@renderer/store/utils'

const CARD_PAD = 7 // 卡片上下内边距（QQ 实测值，见 docs/qq-music-todo ㊸）

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
    // 强制暗色卡片：null = 跟随应用主题；详情页画布内传 true
    dark: {
      type: Boolean,
      default: null,
    },
    // 触发按钮的外接矩形（{left,top,right,bottom}）：菜单展开后若盖住它，
    // 自动挪到按钮上方/下方 —— 否则再次点击会命中菜单项而不是按钮（表现为「点了没用」）
    anchorRect: {
      type: Object,
      default: null,
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
      // 关闭由各使用方的 menuClick → hideMenu() 完成（避免二次 emit 丢失行号）
      emit('menu-click', item)
    }

    // 展示项：过滤 hide / 全局下载开关，并生成稳定 key
    const viewMenus = computed(() => (props.menus || [])
      .filter(m => !m.hide && (m.action != 'download' ? true : appSetting['download.enable']))
      .map((m, i) => ({ ...m, __key: m.key || m.action || `i${i}` })))

    // ── 二级面板 ────────────────────────────────────────────
    const activeKey = ref(null)
    const activeSub = ref(null)
    const dom_sub = ref(null)
    const subStyles = reactive({ left: 'calc(100% + 8px)', top: '0px' })
    let closeTimer = null

    const cancelClose = () => {
      if (closeTimer) {
        clearTimeout(closeTimer)
        closeTimer = null
      }
    }
    const closeSub = () => {
      cancelClose()
      activeKey.value = null
      activeSub.value = null
    }
    const scheduleClose = () => {
      cancelClose()
      closeTimer = setTimeout(() => {
        activeKey.value = null
        activeSub.value = null
      }, 160)
    }

    const openSub = (item, el) => {
      cancelClose()
      activeKey.value = item.__key
      activeSub.value = item.submenu.map((m, i) => ({ ...m, __key: m.key || m.action || `s${i}` }))
      // 首项与父项对心：父项 offsetTop 含卡片 padding，减掉即为子面板顶部
      subStyles.top = `${Math.max(0, el.offsetTop - CARD_PAD)}px`
      subStyles.left = 'calc(100% + 8px)'
      void nextTick(() => {
        const sub = dom_sub.value
        if (!sub || !dom_menu.value) return
        // 纵向：不超出视口
        const maxTop = window.innerHeight - sub.offsetHeight - 8
        const top = Math.min(Math.max(0, el.offsetTop - CARD_PAD), Math.max(8, maxTop))
        subStyles.top = `${top}px`
        // 横向：放不下就翻到左侧
        const rect = dom_menu.value.getBoundingClientRect()
        subStyles.left = rect.right + 8 + sub.offsetWidth > window.innerWidth - 4
          ? `${-(sub.offsetWidth + 8)}px`
          : 'calc(100% + 8px)'
      })
    }

    const handleItemEnter = (item, el) => {
      cancelClose()
      if (item.submenu?.length) {
        openSub(item, el)
        return
      }
      closeSub()
    }
    const handleRootLeave = () => {
      if (activeSub.value) scheduleClose()
    }
    const handleSubEnter = () => {
      cancelClose()
    }

    const handleItemClick = (item) => {
      if (item.disabled) return
      // 有二级面板的项：点击只开合面板，不触发动作
      if (item.submenu?.length) {
        if (activeKey.value === item.__key) closeSub()
        return
      }
      closeSub()
      menuClick(item)
    }
    const handleSubClick = (item) => {
      if (item.disabled) return
      closeSub()
      menuClick(item)
    }

    watch(visible, v => {
      if (!v) closeSub()
      else void adjustAgainstAnchor()
    })

    // ── 避让触发按钮：菜单展开后若与其外接矩形重叠，挪到上/下不重叠的位置 ──
    const adjustAgainstAnchor = async() => {
      const rect = props.anchorRect
      if (!rect || !visible.value) return
      await nextTick()
      const el = dom_menu.value
      if (!el) return
      const mr = el.getBoundingClientRect()
      const overlap = !(mr.right < rect.left || mr.left > rect.right || mr.bottom < rect.top || mr.top > rect.bottom)
      if (!overlap) return
      const up = rect.top - mr.height - 6 // 按钮上方
      const down = rect.bottom + 6 // 按钮下方
      const curTop = parseFloat(menuStyles.top) || 0
      let dy
      if (up >= 8) {
        dy = up - mr.top
      } else {
        dy = down - mr.top
      }
      menuStyles.top = `${curTop + dy}px`
      // 横向：以按钮左缘对齐（钳位交给 useMenuLocation 的 translate 已在展开时算好，
      // 这里只在原 translate 基础上平移，保持视口内）
    }

    // ── Esc 关闭 ──
    const handleKeydown = (e) => {
      if (e.key != 'Escape') return
      if (activeSub.value) { closeSub(); return }
      onHide()
    }
    onMounted(() => { document.addEventListener('keydown', handleKeydown) })
    onBeforeUnmount(() => { document.removeEventListener('keydown', handleKeydown) })

    return {
      dom_menu,
      menuStyles,
      menuClick,
      appSetting,
      isDark: computed(() => (props.dark ?? isDarkTheme.value)),
      viewMenus,
      activeKey,
      activeSub,
      dom_sub,
      subStyles,
      handleItemEnter,
      handleItemClick,
      handleSubClick,
      handleRootLeave,
      handleSubEnter,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

// QQ 音乐右键菜单（实测值见 docs/qq-music-todo ㊸）：
// 卡片 210 宽 / 项高 32 / 左右满幅 hover / 分隔线满幅上下 11px /
// 图标列 12px 内缩（20px 盒）/ 文字 46px 起 / 箭头右缩 6px（中心 16px）
.menu {
  // 明色卡片（浅色主题）
  --menu-bg: #fff;
  --menu-border: var(--qm-line-1);
  --menu-hover: var(--qm-hover);
  --menu-divider: var(--qm-line-1);
  --menu-font: var(--color-font);
  --menu-disabled: rgba(0, 0, 0, .32);
  --menu-icon: rgba(0, 0, 0, .62);

  position: absolute;
  opacity: 0;
  transform: scale(0.94);
  transform-origin: 0 0 0;
  transition: opacity 160ms var(--ease-out), transform 160ms var(--ease-out);
  transition-property: transform, opacity;
  // 层级契约：teleport 到 #root 的右键菜单，需高于播放详情页(65)/设置覆盖层(60)/工具栏(40)，
  // 低于 material-modal(99)
  z-index: 70;
  pointer-events: none;

  &.dark {
    // 暗色卡片（QQ 实测色值：无描边、圆角 6px）
    --menu-bg: #29292B;
    --menu-border: transparent;
    --menu-hover: #3B3B3D;
    --menu-divider: #323234;
    --menu-font: rgba(255, 255, 255, .92);
    --menu-disabled: #929293;
    --menu-icon: rgba(255, 255, 255, .78);
  }

  &.active {
    opacity: 1;
    transform: scale(1);
    pointer-events: initial;
  }
}

.list {
  margin: 0;
  padding: 7px 0;
  list-style: none;
  width: max-content;
  min-width: 210px;
  max-width: 300px;
  box-sizing: border-box;
  font-size: var(--qm-fs-sm, 13px);
  line-height: 32px;
  // 参考图实测圆角 6px（角部剖面 6/3/2/1/1/0，见 docs/qq-music-todo ㊸）
  border-radius: 6px;
  background-color: var(--menu-bg);
  border: 1px solid var(--menu-border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
  overflow: hidden;
  color: var(--menu-font);
}

// 二级面板与主卡片同款，绝对定位到卡片右侧 8px（QQ 实测）
.submenu {
  position: absolute;
  top: 0;
}

.listItem {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 32px;
  padding: 0 34px 0 46px;
  cursor: pointer;
  outline: none;
  white-space: nowrap;
  transition: background-color @transition-fast, color @transition-fast;
  box-sizing: border-box;

  .text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // 图标列：12px 内缩 + 20px 盒 + 14px 间距 → 文字起点 46px（与无图标项对齐）
  .icon {
    flex: none;
    width: var(--qm-icon);
    height: var(--qm-icon);
    color: var(--menu-icon);
  }

  // 我喜欢：红心（实心为已收藏，参考图 #FF6A6A）
  .iconLove {
    color: var(--color-danger, #FF6A6A);
  }

  .chevron {
    position: absolute;
    right: 6px;
    width: var(--qm-icon);
    height: var(--qm-icon);
    color: var(--menu-icon);
  }

  &:hover,
  &.itemActive {
    background-color: var(--menu-hover);
  }

  &[disabled] {
    cursor: default;
    color: var(--menu-disabled);
    .icon,
    .chevron {
      color: var(--menu-disabled);
    }
    &:hover {
      background: none !important;
    }
  }
}

// 有图标的项：12px 内缩，图标 20 + 间距 14 → 文字与无图标项的 46px 对齐
.withIcon {
  padding-left: 12px;
}

.divider {
  height: 1px;
  margin: 11px 0;
  background-color: var(--menu-divider);
}

</style>
