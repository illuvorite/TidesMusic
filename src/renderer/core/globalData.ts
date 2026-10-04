// import defaultSetting from '@common/defaultSetting'
import createWorkers from '@renderer/worker'

window.lx = {
  // appSetting: defaultSetting,
  isEditingHotKey: false,
  isPlayedStop: false,
  appHotKeyConfig: {
    local: {
      enable: false,
      keys: {},
    },
    global: {
      enable: false,
      keys: {},
    },
  },
  songListInfo: {
    fromName: '',
    searchKey: '',
    searchPosition: 0,
    songlistKey: '',
    songlistPosition: 0,
  },
  restorePlayInfo: null,
  worker: createWorkers(),
  isProd: process.env.NODE_ENV == 'production',
  rootOffset: window.dt ? 0 : 8,
  apiInitPromise: [Promise.resolve(false), true, () => {}],
}

/**
 * 弹层坐标原点
 *
 * 弹窗 / 右键菜单都以 position:absolute 挂在 #root 下，坐标原点是 #root 的定位盒。
 * 历史上用写死的 `window.lx.rootOffset`（非 dt 模式为 8）做补偿，
 * 但当前外壳里 #root 是 position:relative 且位于 (0,0) —— 多减的 8px 让**所有弹层整体偏左上 8px**
 * （音量弹窗表现为「没和触发按钮对齐」）。这里改成运行时读取真实位置，两种外壳都算得对。
 */
export const getRootOrigin = () => {
  const el = document.getElementById('root')
  if (!el) return { x: 0, y: 0 }
  // #root 为 static 时，absolute 子元素以初始包含块（视口）为原点
  if (window.getComputedStyle(el).position === 'static') return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  return { x: rect.left, y: rect.top }
}

window.lxData = {}

window.ELECTRON_DISABLE_SECURITY_WARNINGS = process.env.ELECTRON_DISABLE_SECURITY_WARNINGS
