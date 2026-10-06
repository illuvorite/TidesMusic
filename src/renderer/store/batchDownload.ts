import { ref, markRaw } from '@common/utils/vueTools'

/**
 * 批量下载页的待下载列表。
 *
 * 页面是**点「下载」后才进入的独立路由**（#/batch-download），
 * 跳转时把歌曲列表放这里，页面从 store 读取；关闭时清空。
 * 用 markRaw 避免大数组被深度响应化拖慢。
 */
export const batchDownloadList = ref<LX.Music.MusicInfoOnline[]>(markRaw([]))

export const setBatchDownloadList = (list: LX.Music.MusicInfoOnline[]) => {
  batchDownloadList.value = markRaw([...list])
}

export const clearBatchDownloadList = () => {
  batchDownloadList.value = markRaw([])
}
