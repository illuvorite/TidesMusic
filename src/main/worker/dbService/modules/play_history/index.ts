import {
  queryPlayHistory,
  insertPlayHistory,
  insertPlayHistoryMultiple,
  deletePlayHistory,
  clearPlayHistory,
  countPlayHistory,
} from './dbHelper'

/**
 * 获取播放历史（按最后播放时间倒序）
 * @param limit 取多少条，默认 1000
 * @param offset 跳过多少条
 */
export const getPlayHistory = (limit = 1000, offset = 0) => {
  return queryPlayHistory(limit, offset)
}

/**
 * 写入播放记录
 * @param info 播放记录
 * @param max 保留上限（<=0 表示不限制）
 */
export const playHistoryAdd = (info: LX.DBService.PlayHistoryInfo, max = 0) => {
  insertPlayHistory(info, max)
}

/**
 * 批量写入播放记录（导入历史 / 数据迁移用）
 */
export const playHistoryAddMultiple = (infos: LX.DBService.PlayHistoryInfo[], max = 0) => {
  insertPlayHistoryMultiple(infos, max)
}

/**
 * 按 id 删除播放记录
 */
export const playHistoryRemove = (ids: string[]) => {
  deletePlayHistory(ids)
}

/**
 * 清空播放记录
 */
export const playHistoryClear = () => {
  clearPlayHistory()
}

/**
 * 统计播放记录数量
 */
export const playHistoryCount = () => {
  return countPlayHistory()
}
