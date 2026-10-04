import { getDB } from '../../db'
import {
  createQueryStatement,
  createInsertStatement,
  createDeleteStatement,
  createClearStatement,
  createCountStatement,
  createTrimStatement,
} from './statements'

/**
 * 查询播放历史（按最后播放时间倒序）
 * @param limit 取多少条
 * @param offset 跳过多少条
 */
export const queryPlayHistory = (limit: number, offset = 0) => {
  const statement = createQueryStatement()
  return statement.all(limit, offset) as LX.DBService.PlayHistoryInfo[]
}

/**
 * 写入一条播放记录（同一首歌只保留一条，重复播放刷新时间并累加次数）
 * @param info 播放记录
 * @param max 保留上限，超出时淘汰最旧的
 */
export const insertPlayHistory = (info: LX.DBService.PlayHistoryInfo, max: number) => {
  const db = getDB()
  const insertStatement = createInsertStatement()
  const trimStatement = createTrimStatement()
  db.transaction((info: LX.DBService.PlayHistoryInfo, max: number) => {
    insertStatement.run(info)
    if (max > 0) trimStatement.run(max)
  })(info, max)
}

/**
 * 批量写入播放记录
 */
export const insertPlayHistoryMultiple = (infos: LX.DBService.PlayHistoryInfo[], max: number) => {
  const db = getDB()
  const insertStatement = createInsertStatement()
  const trimStatement = createTrimStatement()
  db.transaction((infos: LX.DBService.PlayHistoryInfo[], max: number) => {
    for (const info of infos) insertStatement.run(info)
    if (max > 0) trimStatement.run(max)
  })(infos, max)
}

/**
 * 按 id 删除播放记录
 */
export const deletePlayHistory = (ids: string[]) => {
  const db = getDB()
  const statement = createDeleteStatement()
  db.transaction((ids: string[]) => {
    for (const id of ids) statement.run(id)
  })(ids)
}

/**
 * 清空播放记录
 */
export const clearPlayHistory = () => {
  createClearStatement().run()
}

/**
 * 统计播放记录数量
 */
export const countPlayHistory = () => {
  return (createCountStatement().get() as { count: number }).count
}
