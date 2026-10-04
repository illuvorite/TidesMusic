import { reactive, markRaw } from '@common/utils/vueTools'
import music from '@renderer/utils/musicSdk'

/**
 * 专辑 / 歌手搜索结果项。
 * 网易的 mediaSearch.js 用 JSDoc 声明了形状，这里用本地类型对齐，避免跨文件类型导入。
 */
export interface AlbumSearchItem {
  id: string
  name: string
  artist: string
  artistId: string
  img: string
  size: number
  publishDate: number
  source: 'wy'
}

export interface SingerSearchItem {
  id: string
  name: string
  img: string
  albumSize: number
  musicSize: number
  source: 'wy'
}

export interface MediaListInfo {
  page: number
  limit: number
  total: number
  list: AlbumSearchItem[] | SingerSearchItem[]
  key: string | null
  noItemLabel: string
  loading: boolean
}

/**
 * 专辑 / 歌手搜索目前仅网易云提供接口（`/api/search/get/web` 的 type=10 / 100）。
 * 其余音源没有可用的对应搜索能力，因此结果不参与「聚合搜索」。
 */
const SUPPORTED_SOURCE = 'wy'

export const albumListInfo: MediaListInfo = reactive({
  page: 1,
  limit: 30,
  total: 0,
  list: [],
  key: null,
  noItemLabel: '',
  loading: false,
})

export const singerListInfo: MediaListInfo = reactive({
  page: 1,
  limit: 30,
  total: 0,
  list: [],
  key: null,
  noItemLabel: '',
  loading: false,
})

const infoMap = {
  album: albumListInfo,
  singer: singerListInfo,
} as const

export type MediaSearchType = keyof typeof infoMap

export const hasMediaSearch = (): boolean => Boolean(music[SUPPORTED_SOURCE]?.mediaSearch)

const resetInfo = (type: MediaSearchType) => {
  const info = infoMap[type]
  info.page = 1
  info.total = 0
  info.list = []
  info.key = null
  info.noItemLabel = ''
  info.loading = false
}

/**
 * 搜索专辑或歌手
 * @param type 搜索类型
 * @param text 关键词
 * @param page 页码（1 起）
 */
export const searchMedia = async(type: MediaSearchType, text: string, page: number) => {
  const info = infoMap[type]
  if (!text) {
    resetInfo(type)
    return []
  }
  const sdk = music[SUPPORTED_SOURCE]?.mediaSearch
  if (!sdk) {
    info.list = []
    info.total = 0
    info.noItemLabel = window.i18n.t('no_item')
    return []
  }
  const key = `${type}__${page}__${text}`
  if (info.key == key && info.list.length) return info.list
  info.key = key
  info.loading = true
  info.noItemLabel = window.i18n.t('list__loading')
  try {
    const result = type == 'album'
      ? await sdk.searchAlbum(text, page, info.limit)
      : await sdk.searchSinger(text, page, info.limit)
    // 期间又发起了新搜索，丢弃本次结果
    if (info.key != key) return []
    markRawList(result.list)
    info.list = result.list
    info.total = result.total
    info.page = page
    info.limit = result.limit
    info.noItemLabel = result.list.length ? '' : window.i18n.t('no_item')
    return info.list
  } catch (err) {
    console.log(err)
    if (info.key == key) {
      info.list = []
      info.total = 0
      info.noItemLabel = window.i18n.t('list__load_failed')
    }
    return []
  } finally {
    if (info.key == key) info.loading = false
  }
}

const markRawList = (list: any[]) => {
  if (Array.isArray(list)) for (const item of list) markRaw(item)
  return list
}
