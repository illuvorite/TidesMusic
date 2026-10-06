import { type App, ref } from 'vue'
import { messages } from './index'
import type { Messages, Message } from './index'

type TranslateValues = Record<string, string | number | boolean>

type Langs = keyof Messages

export declare interface I18n {
  locale: Langs
  fallbackLocale: Langs
  availableLocales: Langs[]
  messages: Messages
  message: Message
  setLanguage: (locale: Langs) => void
  fillMessage: (message: string, val: TranslateValues) => string
  getMessage: (key: keyof Message, val?: TranslateValues) => string
  t: (key: keyof Message, val?: TranslateValues) => string
}

const locale = ref<Langs>('zh-cn')

let i18n: I18n


const trackReactivityValues = (): any => {
  return locale.value
}

const i18nPlugin = {
  install: (app: App) => {
    // inject a globally available $translate() method
    app.config.globalProperties.$t = (key: keyof Message, val?: TranslateValues): string => {
      // retrieve a nested property in `options`
      // using `key` as the path
      // return key.split('.').reduce((o, i) => {
      //   if (o) return o[i]
      // }, options)
      trackReactivityValues()
      return getMessage(key, val)
    }
  },
}

/**
 * 语言包尚未包含的键的中文兜底文案。
 *
 * 背景：messages 是模块加载时**静态导入**的，新增语言包条目后，
 * 已在运行的实例不会自动获得该键，getMessage 会回退返回 key 本身
 * （界面上就会漏出 `list__name_recent` 这种原始键名）。
 * 下列键在语言包更新生效前用兜底文案顶上，重启应用后自动失效。
 */
const FALLBACK_MESSAGES: Partial<Record<string, string>> = {
  list__name_recent: '最近播放',
}

const getMessage = (key: keyof Message, val?: TranslateValues): string => {
  let targetMessage = i18n.message[key] ?? i18n.messages[i18n.fallbackLocale][key] ?? FALLBACK_MESSAGES[key] ?? key
  return val ? i18n.fillMessage(targetMessage, val) : targetMessage
}

const useI18n = () => {
  return (key: keyof Message, val?: TranslateValues): string => {
    trackReactivityValues()
    return getMessage(key, val)
  }
}

const setLanguage = (lang: Langs) => {
  i18n.setLanguage(lang)
}

const createI18n = (): I18n => {
  return i18n = {
    locale: locale.value,
    fallbackLocale: 'zh-cn',
    availableLocales: Object.keys(messages) as Langs[],
    messages,
    message: messages[locale.value],
    setLanguage(_locale: Langs) {
      this.locale = _locale
      this.message = messages[_locale]
      locale.value = _locale
    },
    fillMessage(message: string, vals: TranslateValues): string {
      for (const [key, val] of Object.entries(vals)) {
        message = message.replaceAll(`{${key}}`, String(val))
      }
      return message
    },
    getMessage,
    t(key: keyof Message, val?: TranslateValues): string {
      trackReactivityValues()
      return getMessage(key, val)
    },
  }
}


export {
  i18nPlugin,
  setLanguage,
  useI18n,
  createI18n,
}
