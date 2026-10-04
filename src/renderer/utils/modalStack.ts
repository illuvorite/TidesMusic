/**
 * 弹层栈：让 Esc 能关闭「最上层」的那个弹层。
 *
 * 背景：Esc 原本只做两件事 —— 退出全屏、清空并失焦输入框（见 `useApp/useEventListener.ts`），
 * 各弹层自己要关只能各自绑 `@keyup.esc`，漏一个就变成一个关不掉的浮层。
 * 这里把「关掉我自己」注册进来，由键盘事件统一从栈顶往下问，谁先接谁处理。
 *
 * 用法（组件挂载时注册、卸载时注销）：
 * ```ts
 * const off = registerModalCloser(() => { if (!visible.value) return false; close(); return true })
 * onBeforeUnmount(off)
 * ```
 * 返回 true 表示「我处理了这次 Esc」。
 */

export type ModalCloser = () => boolean

const closers: ModalCloser[] = []

/**
 * 注册一个弹层关闭器
 * @param closer 返回 true 表示这次 Esc 已被消费
 * @returns 注销函数
 */
export const registerModalCloser = (closer: ModalCloser): (() => void) => {
  closers.push(closer)
  return () => {
    const index = closers.indexOf(closer)
    if (index > -1) closers.splice(index, 1)
  }
}

/**
 * 从栈顶向下查找能够处理本次 Esc 的弹层
 * @returns 是否已被处理
 */
export const closeTopModal = (): boolean => {
  for (let i = closers.length - 1; i >= 0; i--) {
    try {
      if (closers[i]()) return true
    } catch {
      // 单个弹层的关闭逻辑出错不应该影响其它弹层收到 Esc
    }
  }
  return false
}
