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
  // 全局错误兜底：防止渲染期异常把整棵组件树打断（表现为「点多了页面变白什么都没有」）。
  // 「取消http请求」是快速切页时的正常取消路径（音源 SDK 单例请求对象互相 cancel），静默忽略。
  app.config.errorHandler = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('取消') && msg.includes('请求')) return
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
    console.log('[unhandledrejection]', e.reason)
  })
  initPlugins(app)
  mountComponents(app)
  app.mount('#root')
})

// bubbleCursor()
