import { ref, shallowReactive, markRaw } from '@common/utils/vueTools'
import { getListTrashData, saveListTrashData } from '@renderer/utils/ipc'
import { DATA_KEYS } from '@common/constants'

/**
 * 歌单回收站
 *
 * 删除歌单是破坏性操作 —— 歌单一删，里面的歌曲就跟着没了，
 * 误删后只能靠歌单详情重新拉取（自建歌单甚至无法恢复）。
 * 这里在删除前对歌单做一次快照，进入回收站，可还原或彻底清除。
 *
 * 还原逻辑放在 UI 层（ListTrashModal）而不是本 store：
 * 还原要调用 list 模块的 createUserList / overwriteListMusics，
 * 而删除链路（listManage/action）也会引用本 store，若在这里再引回去会形成循环依赖。
 */

/** 回收站最多保留的歌单快照数，超出后淘汰最早的（避免无限膨胀） */
export const LIST_TRASH_MAX = 20

export interface ListTrashItem {
  /** 回收站条目 id（非原歌单 id，避免还原后再次删除时混淆） */
  id: string
  name: string
  source?: LX.OnlineSource
  sourceListId?: string
  /** 原歌单内的歌曲快照 */
  list: LX.Music.MusicInfo[]
  deletedAt: number
  /** 歌曲数（展示用，避免每次渲染都算一遍） */
  count: number
}

export const listTrashItems = shallowReactive<ListTrashItem[]>([])

export const listTrashLoaded = ref(false)

/** 回收站弹层是否可见（状态放在这里，省一个单独的 modal store 文件） */
export const listTrashModalVisible = ref(false)

let loadPromise: Promise<void> | null = null

/**
 * 读取回收站（并发调用共用同一次请求）
 */
export const loadListTrash = (force = false): Promise<void> => {
  if (loadPromise) return loadPromise
  if (listTrashLoaded.value && !force) return Promise.resolve()

  loadPromise = getListTrashData().then((data) => {
    const items = Array.isArray(data) ? data.filter(item => item?.id && Array.isArray(item.list)) : []
    listTrashItems.splice(0, listTrashItems.length, ...items.map(item => markRaw(item) as ListTrashItem))
    listTrashLoaded.value = true
  }).catch(() => {
    listTrashLoaded.value = true
  }).finally(() => {
    loadPromise = null
  })
  return loadPromise
}

const persist = () => {
  saveListTrashData([...listTrashItems])
}

/**
 * 把即将删除的歌单快照进回收站。
 * 由删除链路在真正删除**之前**调用；这里的失败不应阻断删除本身。
 *
 * 必须先确保回收站已从磁盘读入：否则内存里是空数组，写入会把已有快照整个覆盖掉。
 */
export const addListTrash = async(items: Array<{
  name: string
  source?: LX.OnlineSource
  sourceListId?: string
  list: LX.Music.MusicInfo[]
}>) => {
  await loadListTrash().catch(() => {})

  const snapshots = items.filter(item => item?.name && Array.isArray(item.list)).map(item => ({
    id: `trash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: item.name,
    source: item.source,
    sourceListId: item.sourceListId,
    list: item.list,
    deletedAt: Date.now(),
    count: item.list.length,
  }) as ListTrashItem)
  if (!snapshots.length) return

  // 新的排前面；超过上限时淘汰最早的
  listTrashItems.unshift(...snapshots.map(item => markRaw(item)))
  if (listTrashItems.length > LIST_TRASH_MAX) listTrashItems.splice(LIST_TRASH_MAX)
  persist()
}

/** 从回收站移除一个条目（还原成功或彻底删除后调用） */
export const removeListTrash = (id: string) => {
  const index = listTrashItems.findIndex(item => item.id === id)
  if (index < 0) return
  listTrashItems.splice(index, 1)
  persist()
}

/** 清空回收站 */
export const clearListTrash = () => {
  listTrashItems.splice(0, listTrashItems.length)
  persist()
}

export const showListTrashModal = () => {
  listTrashModalVisible.value = true
}

export const hideListTrashModal = () => {
  listTrashModalVisible.value = false
}
