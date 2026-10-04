import { reactive } from '@common/utils/vueTools'
import { toOldMusicInfo } from '@common/utils/tools'
import musicSdk from '@renderer/utils/musicSdk'

const picCache = reactive({})
const pending = new Set()

export const getCoverUrl = (item) => item?.meta?.picUrl || picCache[item?.id] || ''

/**
 * 直接写入封面缓存。
 * 本地歌曲的封面不走在线音源（musicSdk 里没有 local），由调用方
 * 通过 worker 的 getMusicFilePic 异步取到后写入这里，getCoverUrl 便能读到。
 */
export const setCover = (id, url) => {
  if (id && url) picCache[id] = url
}

export const loadCover = (item) => {
  if (!item?.id || item.meta?.picUrl || picCache[item.id] || pending.has(item.id)) return
  const sdk = musicSdk[item.source]
  if (!sdk?.getPic) return
  pending.add(item.id)
  sdk.getPic(toOldMusicInfo(item)).then((pic) => {
    if (pic) picCache[item.id] = pic
  }).catch(() => {}).finally(() => {
    pending.delete(item.id)
  })
}
