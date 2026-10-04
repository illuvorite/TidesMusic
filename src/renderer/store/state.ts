import { ref, reactive, shallowReactive, markRaw } from '@common/utils/vueTools'
import type { SkinParams } from '@common/utils/skinParams'

export const qualityList = ref<LX.QualityList>({})

export const userApi = reactive<{
  status: boolean
  message: string
  apis: Record<string, any>
  list: LX.UserApi.UserApiInfo[]
}>({
  status: false,
  message: '',
  apis: {},
  list: [],
})

export const apiSource = ref('')

export const proxy = reactive<{
  enable: boolean
  host: string
  port: string
  envProxy?: { host: string; port: string }
}>({
  enable: false,
  host: '',
  port: '',
})

export const sync = reactive<{
  mode: 'server' | 'client'
  enable: boolean
  deviceName: string
  type: string
  isShowSyncMode: boolean
  isShowAuthCodeModal: boolean
  server: { port: string; maxSsnapshotNum: number; status: { status: boolean; message: string; address: string[]; code: string; devices: any[] } }
  client: { host: string; status: { status: boolean; message: string; address: string[] } }
}>({
  mode: 'server',
  enable: false,
  deviceName: '',
  type: '',
  isShowSyncMode: false,
  isShowAuthCodeModal: false,
  server: { port: '23332', maxSsnapshotNum: 10, status: { status: false, message: '', address: [], code: '', devices: [] } },
  client: { host: '', status: { status: false, message: '', address: [] } },
})

export const sourceNames = ref<Record<string, string>>({})

export const openAPI = reactive<{
  enable: boolean
  port: string
  bindLan: boolean
  address?: string
  message?: string
  token?: string
}>({
  enable: false,
  port: '23330',
  bindLan: false,
})

export const versionInfo = reactive<{
  version: string
  desc: string
  newVersion?: { version: string; desc: string; history?: { version: string; desc: string }[] }
  reCheck?: boolean
  isUnknown?: boolean
  status?: string
  downloadProgress?: { total: number; delta: number; transferred: number; percent: number; bytesPerSecond: number }
  isLatest?: boolean
  showModal?: boolean
}>({
  version: '',
  desc: '',
})

export const isShowChangeLog = ref(false)

export const isFullscreen = ref(false)

export const windowSizeList = markRaw<{ id: number; name: string; width: number; height: number }[]>([])

export const themeId = ref('')

export const themeInfo = reactive<LX.ThemeInfo>({
  themes: markRaw([]),
  userThemes: shallowReactive([]),
  dataPath: '',
})

export const themeShouldUseDarkColors = ref(false)

/**
 * 参数化自定义皮肤 · 实时预览状态（交互层 → 渲染层）
 * 制作弹窗拖动/缩放/调模糊时写入，主界面背景图层（SkinBackground）优先渲染它；
 * 弹窗关闭或完成制作后置空，回落到已保存的主题参数。
 */
export const skinLivePreview = reactive<{ img: string; params: SkinParams | null }>({
  img: '',
  params: null,
})

export const isShowPact = ref(false)

export const getSourceI18nPrefix = (source: LX.Source): string => {
  return `source_${source}`
}

// 列表状态（allMusicList / defaultList / loveList / tempList / userLists /
// tempListMeta / fetchingListStatus / listUpdateTimes）的唯一来源是
// `@renderer/store/list/state`，此处不再重复声明，避免出现两套互不相通的状态。