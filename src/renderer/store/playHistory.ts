import { ref, shallowReactive, markRaw, toRaw, watch } from '@common/utils/vueTools'
import {
  getPlayHistory,
  addPlayHistory,
  removePlayHistory,
  clearPlayHistory,
} from '@renderer/utils/ipc'
import { appSetting } from '@renderer/store/setting'

/**
 * 播放历史（持久化）
 *
 * 背景：此前「最近播放」读的是播放器内存里的 playedList，有两个问题 ——
 *   ① 重启即丢；
 *   ② playedList 只在「随机播放」模式下写入（见 core/player/action.ts 中
 *      `if (appSetting['player.togglePlayMethod'] == 'random') addPlayedList(...)`），
 *      所以默认的列表循环模式下，「最近播放」永远是空的。
 * 这里改为落库：任何播放模式都会记录，重启不丢，并可按条数上限淘汰旧记录。
 */

/**
 * 历史保留条数上限：来自设置项。
 * 之前是常量 1000，改成设置后要注意所有用到处都要跟着变。
 */
const getPlayHistoryMax = (): number => {
  const max = Number(appSetting['player.playHistoryMax'])
  return Number.isFinite(max) && max > 0 ? Math.floor(max) : 1000
}

/** 播放历史（最新在前），供「最近播放」页与个性化推荐消费 */
export const playHistoryList = shallowReactive<LX.Music.MusicInfo[]>([])

export const playHistoryLoading = ref(false)
export const playHistoryLoaded = ref(false)

let loadPromise: Promise<void> | null = null

/** musicInfo 以 JSON 存储；脏数据（手工改库 / 旧版本）解析失败时跳过该条 */
const parseRow = (row: LX.Music.PlayHistoryInfo): LX.Music.MusicInfo | null => {
  try {
    const info = JSON.parse(row.musicInfo) as LX.Music.MusicInfo
    return info?.id ? info : null
  } catch {
    return null
  }
}

/**
 * 载入播放历史。并发调用共用同一次请求。
 * @param force 为 true 时强制重新从数据库读取
 */
export const loadPlayHistory = (force = false): Promise<void> => {
  if (loadPromise) return loadPromise
  if (playHistoryLoaded.value && !force) return Promise.resolve()

  playHistoryLoading.value = true
  loadPromise = getPlayHistory(getPlayHistoryMax(), 0).then((rows) => {
    const list: LX.Music.MusicInfo[] = []
    for (const row of rows ?? []) {
      const info = parseRow(row)
      // markRaw：对象进入响应式容器后不能被代理化，否则后续传给 IPC 会抛
      // "An object could not be cloned"
      if (info) list.push(markRaw(info))
    }
    playHistoryList.splice(0, playHistoryList.length, ...list)
    playHistoryLoaded.value = true
  }).catch(() => {
    // 读取失败不阻塞播放：页面会退化为空态，用户可重试
  }).finally(() => {
    playHistoryLoading.value = false
    loadPromise = null
  })
  return loadPromise
}

/**
 * 记录一次播放。内存列表立即更新（去重后置顶），落库异步进行。
 *
 * 是否记录由设置项 `player.isSavePlayHistory` 控制：
 * 关闭后不再写入，但**已存在的记录不会被清掉** —— 用户可能只是暂时不想记，
 * 重新打开后历史还在，比一键清空温和。
 *
 * @param musicInfo 正在播放的歌曲
 */
export const recordPlayHistory = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem | null | undefined) => {
  if (!appSetting['player.isSavePlayHistory']) return
  if (!musicInfo?.id) return

  const max = getPlayHistoryMax()

  // 已经记录过同一首歌就删掉旧位置，再插到最前 —— 即「按最近播放排序 + 去重」
  const index = playHistoryList.findIndex(item => item.id === musicInfo.id)
  if (index >= 0) playHistoryList.splice(index, 1)
  playHistoryList.unshift(markRaw({ ...(toRaw(musicInfo) as LX.Music.MusicInfo) }))
  if (playHistoryList.length > max) playHistoryList.splice(max)

  // playCount 由 SQL 侧的 ON CONFLICT 在原值上累加，这里固定传 1 即可
  void addPlayHistory({
    id: musicInfo.id,
    musicInfo: JSON.stringify(toRaw(musicInfo)),
    playedAt: Date.now(),
    playCount: 1,
  }, max).catch(() => {})
}

/** 上限被调小后，把超出部分从库里清掉（只在设置变化时触发） */
const prunePlayHistoryToMax = async() => {
  const max = getPlayHistoryMax()
  if (playHistoryList.length <= max) return
  const overflow = playHistoryList.slice(max).map(item => item.id)
  playHistoryList.splice(max)
  if (overflow.length) await removePlayHistory(overflow).catch(() => {})
}

// 条数上限变化时修剪历史；模块级 watch，store 是单例无需随组件销毁
watch(() => appSetting['player.playHistoryMax'], () => {
  void prunePlayHistoryToMax()
})

/**
 * 从历史中移除若干首歌
 */
export const removePlayHistoryAction = async(ids: string[]) => {
  if (!ids.length) return
  await removePlayHistory(ids).catch(() => {})
  const removeSet = new Set(ids)
  for (let i = playHistoryList.length - 1; i >= 0; i--) {
    if (removeSet.has(playHistoryList[i].id)) playHistoryList.splice(i, 1)
  }
}

/**
 * 清空播放历史
 */
export const clearPlayHistoryAction = async() => {
  await clearPlayHistory().catch(() => {})
  playHistoryList.splice(0, playHistoryList.length)
}
