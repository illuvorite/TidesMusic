import { ref } from '@common/utils/vueTools'

/**
 * 列表页「下滑收起页头」通用逻辑：
 * - 向下滚动（scrollTop 增大）→ 收起页头；
 * - 向上滚动或滚回顶部 → 展开；
 * - 带 2px 迟滞，避免轻微抖动来回闪。
 * 首次事件只记录基准（不判定方向），避免恢复滚动位置后被误判为「下滑」。
 */
export default () => {
  const isHeadCollapsed = ref(false)
  let lastTop = -1

  const handleHeadScroll = (event) => {
    const el = event?.target
    if (!el) return
    const top = el.scrollTop
    if (top <= 4) {
      isHeadCollapsed.value = false
    } else if (lastTop >= 0) {
      if (top > lastTop + 2) isHeadCollapsed.value = true
      else if (top < lastTop - 2) isHeadCollapsed.value = false
    }
    lastTop = top
  }

  // 切换列表 / 清空后重置（回到展开态，并清除方向基准）
  const resetHeadCollapse = () => {
    isHeadCollapsed.value = false
    lastTop = -1
  }

  return {
    isHeadCollapsed,
    handleHeadScroll,
    resetHeadCollapse,
  }
}
