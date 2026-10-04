import { checkUpdate, getEnvParams, getViewPrevState, sendInited } from '@renderer/utils/ipc'

import { watch } from '@common/utils/vueTools'
import { proxy, isFullscreen, themeId } from '@renderer/store'
import { appSetting } from '@renderer/store/setting'
import { applySkinSurface, applyTheme, getThemes } from '@renderer/store/utils'
import { loadPlayHistory } from '@renderer/store/playHistory'
import { loadLocalLibrary } from '@renderer/store/localLibrary'
import { loadQualityOverrides } from '@renderer/store/qualityOverride'

import useSync from './useSync'
import useOpenAPI from './useOpenAPI'
import useStatusbarLyric from './useStatusbarLyric'
import useUpdate from './useUpdate'
import useDataInit from './useDataInit'
import useHandleEnvParams from './useHandleEnvParams'
import useEventListener from './useEventListener'
import useDeeplink from './useDeeplink'
import usePlayer from './usePlayer'
import useSettingSync from './useSettingSync'
import { useRouter } from '@common/utils/vueRouter'
import handleListAutoUpdate from './listAutoUpdate'


export default () => {
  // apiSource.value = appSetting['common.apiSource']
  proxy.enable = appSetting['network.proxy.enable']
  proxy.host = appSetting['network.proxy.host']
  proxy.port = appSetting['network.proxy.port']
  isFullscreen.value = appSetting['common.startInFullscreen']
  themeId.value = appSetting['theme.id']

  // 皮肤透明度：解析主题主背景色后写入面板底色（--qm-surface，见 store/utils.applySkinSurface）
  applySkinSurface()
  watch(() => appSetting['theme.skinOpacity'], applySkinSurface)

  // 启动/刷新后按配置恢复主题：URL 注入的主题停留在应用启动时的选择，
  // 之后切换的主题在刷新/重启时需要按配置重新应用，否则会「丢主题」
  watch(() => appSetting['theme.id'], (id) => {
    if (!id) return
    getThemes(({ dataPath }) => {
      applyTheme(id, appSetting['theme.lightId'], appSetting['theme.darkId'], dataPath)
    })
  }, { immediate: true })

  const router = useRouter()
  const initSyncService = useSync()
  const initOpenAPI = useOpenAPI()
  const initStatusbarLyric = useStatusbarLyric()
  useEventListener()
  const initPlayer = usePlayer()
  const handleEnvParams = useHandleEnvParams()
  const initData = useDataInit()
  const initDeeplink = useDeeplink()
  // const handleListAutoUpdate = useListAutoUpdate()

  useUpdate()
  useSettingSync()

  void getEnvParams().then(envParams => {
    // 移除代理相关的环境变量设置，防止请求库自动应用它们
    // eslint-disable-next-line no-undef
    // const processEnv = ENVIRONMENT
    // for (const key of Object.keys(processEnv)) {
    //   // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    //   if (/^(?:http_proxy|https_proxy|NO_PROXY)$/i.test(key)) delete processEnv[key]
    // }
    const envProxy = envParams.cmdParams['proxy-server']
    if (envProxy && typeof envProxy == 'string') {
      const [host, port = ''] = envProxy.split(':')
      proxy.envProxy = {
        host,
        port,
      }
    }

    void getViewPrevState().then(state => {
      void router.push({ path: state.url, query: state.query })
    })

    // 初始化我的列表、下载列表等数据
    void initData().then(() => {
      // 读取持久化的播放历史（「最近播放」页 + 个性化推荐的输入）
      void loadPlayHistory()
      // 读取本地曲库（扫描目录 + 上次扫描结果）：文件系统扫描很慢，
      // 这里只读缓存结果，需要更新时由用户在本地音乐页手动触发扫描
      void loadLocalLibrary()
      // 读取单曲音质覆盖表（播放器取 URL 时按歌曲 id 查询）
      void loadQualityOverrides()
      initPlayer()
      handleEnvParams(envParams) // 处理传入的启动参数
      void initDeeplink(envParams)
      void initSyncService()
      void initOpenAPI()
      void initStatusbarLyric()
      sendInited()

      handleListAutoUpdate()
      if (window.lx.isProd && appSetting['common.isAgreePact']) checkUpdate()
    })
  })
}
