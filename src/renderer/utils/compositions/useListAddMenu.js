import { computed, nextTick, reactive, ref } from '@common/utils/vueTools'
import useListTargetMenu from './useListTargetMenu'

/**
 * 锚定按钮的「添加到」菜单（QQ 版式，与右键菜单同款卡片）：
 * 行内「+」按钮 / 播放栏 / 播放详情页 / 榜单详情共用，替代旧的 ListAddModal。
 *
 * 用法：
 *   const addMenu = useListAddMenu()
 *   openMenu(event.currentTarget, musicInfo)   // 打开（同一按钮再点一次 = 关闭）
 *   <base-menu v-model="isShow" :menus="menus" :xy="location" @menu-click="handleMenuClick" />
 */
export default () => {
  const { buildSubmenu, handleTargetAction } = useListTargetMenu()
  const musicInfo = ref(null)
  const location = reactive({ x: 0, y: 0 })
  const anchorRect = reactive({ left: 0, top: 0, right: 0, bottom: 0 })
  const isShow = ref(false)
  let lastAnchor = null

  /**
   * @param {Element|DOMRect} anchor 触发元素（取其外接矩形做锚点）
   * @param {LX.Music.MusicInfo} info 目标歌曲
   */
  const openMenu = (anchor, info) => {
    const rect = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor
    if (!rect || !info) return
    // 同一按钮再次点击 → 关闭
    if (isShow.value && lastAnchor === anchor) {
      isShow.value = false
      lastAnchor = null
      return
    }
    lastAnchor = anchor
    musicInfo.value = info
    anchorRect.left = rect.left
    anchorRect.top = rect.top
    anchorRect.right = rect.right
    anchorRect.bottom = rect.bottom
    location.x = Math.round(rect.left)
    location.y = Math.round(rect.bottom + 6)
    // 先等菜单按新歌曲渲染出真实高度，再置为可见 ——
    // 否则 useMenuLocation 的视口钳位会拿到上一轮（可能为空）的内容高度，
    // 底部触发时菜单不会被上移、被窗口边缘裁掉
    // 先等菜单按新歌曲渲染出真实高度，再置为可见 ——
    // 否则 useMenuLocation 的视口钳位会拿到上一轮（可能为空）的内容高度，
    // 底部触发时菜单不会被上移、被窗口边缘裁掉
    nextTick(() => {
      isShow.value = true
    })
  }

  const hideMenu = () => {
    isShow.value = false
    lastAnchor = null
  }

  const handleMenuClick = (item) => {
    hideMenu()
    if (!item?.action) return
    handleTargetAction(item.action, musicInfo.value)
  }

  // 未指定歌曲时返回空数组（base-menu 的 menus 不接受 null）
  const menus = computed(() => buildSubmenu('add', musicInfo.value) || [])

  return {
    musicInfo,
    location,
    anchorRect,
    isShow,
    menus,
    openMenu,
    hideMenu,
    handleMenuClick,
  }
}
