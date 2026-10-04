// import { getListFromState } from './list'
// import { downloadList } from './download'


// export const getList = (listId: string | null): LX.Download.ListItem[] | LX.Music.MusicInfo[] => {
//   return listId == 'download' ? downloadList : getListFromState(listId)
// }
import { encodePath, isUrl } from '@common/utils/common'
import { joinPath } from '@common/utils/nodejs'
import { markRaw, shallowReactive } from '@common/utils/vueTools'
import { getThemes as getTheme } from '@renderer/utils/ipc'
import { qualityList, themeInfo, themeShouldUseDarkColors } from './index'
import { appSetting } from './setting'

/**
 * 皮肤透明度：解析当前主题的主背景色后，把最终的面板底色写入内联 --qm-surface。
 * 在主题应用（applyTheme）与透明度变更时调用；
 * 不在 color-mix 的百分比位使用 var()，避免主题切换时重算失效导致的整窗闪烁。
 */
export const applySkinSurface = (opacityOverride?: number) => {
  const opacity = Math.min(100, Math.max(0, Math.round(opacityOverride ?? appSetting['theme.skinOpacity'] ?? 82)))
  let mainBg = '#ffffff'
  try {
    mainBg = getComputedStyle(document.documentElement).getPropertyValue('--color-main-background').trim() || '#ffffff'
  } catch {}
  document.documentElement.style.setProperty('--qm-surface', `color-mix(in srgb, ${mainBg} ${opacity}%, transparent)`)
}

/**
 * 当前生效主题是否为暗色（applyTheme 解析主题后写入）。
 * teleport 到 #root 的浮层（右键菜单 / 弹窗）拿不到主题作用域，用它来切明暗卡片。
 */
export const isDarkTheme = shallowReactive({ value: false })

export const assertApiSupport = (source: LX.Source): boolean => {
  return source == 'local' || qualityList.value[source] != null
}

export const buildBgUrl = (originUrl: string, dataPath: string): string => {
  return isUrl(originUrl)
    ? `url(${originUrl})`
    : `url(file:///${encodePath(joinPath(dataPath, originUrl).replaceAll('\\', '/'))})`
}

export const getThemes = (callback: (themeInfo: LX.ThemeInfo) => void) => {
  if (themeInfo.themes.length) {
    callback(themeInfo)
    return
  }
  void getTheme().then(info => {
    themeInfo.themes = markRaw(info.themes)
    themeInfo.userThemes = shallowReactive(info.userThemes)
    themeInfo.dataPath = info.dataPath
    callback(themeInfo)
  })
}
export const buildThemeColors = (theme: LX.Theme, dataPath: string) => {
  if (theme.isCustom && theme.config.extInfo['--background-image'] != 'none') {
    theme = copyTheme(theme)
    theme.config.extInfo['--background-image'] = buildBgUrl(theme.config.extInfo['--background-image'], dataPath)
  }
  const colors: Record<string, string> = {
    ...theme.config.themeColors,
    ...theme.config.extInfo,
  }

  // 参数化皮肤（仿 QQ 音乐）：背景由 SkinBackground 图层按「原图 + scale/offset/blur」
  // 在 GPU 上渲染，这里关闭 #root 的 background-image 避免双层绘制；
  // 渲染参数不进 CSS 变量（JSON 含引号/逗号，注入 :root 无意义且有解析风险）
  if (theme.config.extInfo.skinParams) {
    colors['--background-image'] = 'none'
    delete colors.skinParams
  }

  return colors
}

export const copyTheme = (theme: LX.Theme): LX.Theme => {
  return {
    ...theme,
    config: {
      ...theme.config,
      extInfo: { ...theme.config.extInfo },
      themeColors: { ...theme.config.themeColors },
    },
  }
}

export const findTheme = (themeInfo: LX.ThemeInfo, id: string): LX.Theme | undefined => {
  let theme = themeInfo.themes.find(theme => theme.id == id)
  if (theme) return theme
  theme = themeInfo.userThemes.find(theme => theme.id == id)
  return theme
}

export const applyTheme = (id: string, lightId: string, darkId: string, dataPath: string) => {
  getThemes((themeInfo) => {
    let themeId = id == 'auto'
      ? themeShouldUseDarkColors.value
        ? darkId
        : lightId
      : id

    let theme = findTheme(themeInfo, themeId)
    if (!theme) {
      themeId = id == 'auto' && themeShouldUseDarkColors.value ? 'black' : 'green'
      theme = themeInfo.themes.find(theme => theme.id == themeId)!
    }
    isDarkTheme.value = !!theme.isDark
    window.setTheme(buildThemeColors(theme, dataPath))
    applySkinSurface()
  })
}
