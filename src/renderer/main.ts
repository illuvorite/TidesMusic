// ============================================================
// 受保护文件：该文件已与 lx-music-desktop-2.12.2 同步，
// 包含修复音源切换卡在“初始化中”的关键逻辑。
// 未经授权不得修改。若需变更，请先移除本注释并联系相关负责人。
// ============================================================
import '@common/error'
import { createApp } from 'vue'

import './core/globalData'

import '@renderer/event'

// Components
import mountComponents from './components'

// Plugins
import initPlugins from './plugins'
import { i18nPlugin } from './plugins/i18n'

import App from './App.vue'
import router from './router'
// import store from './store'


import { getSetting, updateSetting } from './utils/ipc'
import { langList } from '@root/lang'
import type { I18n } from '@root/lang/i18n'

import { initSetting } from './store/setting'
import { triggerRouteReload } from './store/navigation'
// import { bubbleCursor } from './utils/cursor-effects/bubbleCursor'

import './worker'
import { saveViewPrevState } from './utils/data'

// sync(store, router)

router.afterEach((to) => {
  if (to.path != '/songList/detail') {
    saveViewPrevState({
      url: to.path,
      query: { ...to.query },
    })
  }
})

void getSetting().then(setting => {
  // window.lx.appSetting = setting
  // Set language automatically
  if (!setting['common.langId'] || !window.i18n.availableLocales.includes(setting['common.langId'])) {
    let langId: I18n['locale'] | null = null
    const locale = window.navigator.language.toLocaleLowerCase() as I18n['locale']
    if (window.i18n.availableLocales.includes(locale)) {
      langId = locale
    } else {
      for (const lang of langList) {
        if (lang.alternate == locale) {
          langId = lang.locale
          break
        }
      }
      langId ??= 'en-us'
    }
    setting['common.langId'] = langId
    void updateSetting({ 'common.langId': langId })
    console.log('Set lang', setting['common.langId'])
  }
  window.setLang(setting['common.langId'])
  window.i18n.setLanguage(setting['common.langId'])

  if (!setting['common.startInFullscreen'] && (document.body.clientHeight > window.screen.availHeight || document.body.clientWidth > window.screen.availWidth) && setting['common.windowSizeId'] > 1) {
    void updateSetting({ 'common.windowSizeId': 1 })
  }

  // store.commit('setSetting', setting)
  initSetting(setting)

  const app = createApp(App)
  app
    .use(router)
    // .use(store)
    .use(i18nPlugin)
  // —— DOM patch 失败的自愈 ——
  // 路由切换时若抛出 insertBefore / removeChild 的 NotFoundError（插入锚点已不是父节点的子节点），
  // Vue 的渲染队列会卡死：此后**所有响应式更新都不再生效**，hash 变了、侧栏数字还在，
  // 但主内容区永久空白 —— 表现为「点了某个页面之后点啥都没东西」。
  // 已定位到「进出歌手页」可稳定复现（实测与本次改动无关，HEAD 版本同样复现）；
  // 根因在 Vue 的 anchor 跟踪，这里不让用户卡在空白里：
  //   ① 先尝试轻量恢复（强制重挂载当前路由组件）
  //   ② 半秒后视图仍是空的 → 说明队列已卡死，只能重载渲染进程
  //      （播放/列表状态都在主进程，重载渲染进程不丢数据）
  const DOM_PATCH_FAIL_RXP = /insertBefore|removeChild|is not a child of this node/
  const RECOVER_STAMP_KEY = 'tides:last-dom-patch-recover'
  let recovering = false
  const recoverFromDomPatchFailure = (reason: unknown): boolean => {
    const msg = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason ?? '')
    if (!DOM_PATCH_FAIL_RXP.test(msg)) return false
    if (recovering) return true // 已在恢复流程中
    recovering = true
    window.setTimeout(() => { recovering = false }, 1000)

    console.log('[recover] 视图 patch 失败，尝试恢复视图')
    triggerRouteReload()
    window.setTimeout(() => {
      const view = document.querySelector('#view')
      if (view?.childElementCount) return // 重挂载成功，无需重载
      // 防止「重载 → 立刻又失败 → 再重载」的死循环：15 秒内只允许重载一次
      let last = 0
      try {
        last = Number(window.sessionStorage.getItem(RECOVER_STAMP_KEY) ?? 0)
      } catch (_) { /* 忽略存储不可用 */ }
      if (Date.now() - last < 15000) return
      try {
        window.sessionStorage.setItem(RECOVER_STAMP_KEY, String(Date.now()))
      } catch (_) { /* 忽略存储不可用 */ }
      console.log('[recover] 渲染队列已卡死，重载界面')
      window.location.reload()
    }, 500)
    return true
  }

  // 全局错误兜底：防止渲染期异常把整棵组件树打断（表现为「点多了页面变白什么都没有」）。
  // 「取消http请求」是快速切页时的正常取消路径（音源 SDK 单例请求对象互相 cancel），静默忽略。
  app.config.errorHandler = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('取消') && msg.includes('请求')) return
    if (recoverFromDomPatchFailure(err)) return
    console.log('[vue errorHandler]', err)
  }
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason ?? '')
    // 页面快速切换时，上一个页面的在线请求会被音源 SDK 的共享请求对象取消，
    // 这些 Promise 的消费方（已卸载组件）来不及 catch —— 属于正常路径，吞掉即可。
    if (msg.includes('取消') && msg.includes('请求')) {
      e.preventDefault()
      return
    }
    if (recoverFromDomPatchFailure(e.reason)) {
      e.preventDefault()
      return
    }
    console.log('[unhandledrejection]', e.reason)
  })
  initPlugins(app)
  mountComponents(app)
  app.mount('#root')
})

// bubbleCursor()
