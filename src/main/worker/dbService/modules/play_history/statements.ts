import { getDB } from '../../db'

/**
 * 查询播放历史（按最后播放时间倒序）
 * @returns 查询语句
 */
export const createQueryStatement = () => {
  const db = getDB()
  return db.prepare<[number, number]>(`
    SELECT "id", "musicInfo", "playedAt", "playCount"
    FROM "main"."play_history"
    ORDER BY "playedAt" DESC
    LIMIT ? OFFSET ?
    `)
}

/**
 * 插入播放历史
 * 用 ON CONFLICT 做 upsert：重复播放同一首歌时刷新时间并在原值上累加次数。
 * （不能用 INSERT OR REPLACE —— 那是「先删后插」，会把 playCount 重置为 1；
 *   也会让索引与自增序列无谓抖动。）
 * @returns 插入语句
 */
export const createInsertStatement = () => {
  const db = getDB()
  return db.prepare<[LX.DBService.PlayHistoryInfo]>(`
    INSERT INTO "main"."play_history" ("id", "musicInfo", "playedAt", "playCount")
    VALUES (@id, @musicInfo, @playedAt, @playCount)
    ON CONFLICT("id") DO UPDATE SET
      "musicInfo" = excluded."musicInfo",
      "playedAt"  = excluded."playedAt",
      "playCount" = "play_history"."playCount" + 1`)
}

/**
 * 清空播放历史
 * @returns 清空语句
 */
export const createClearStatement = () => {
  const db = getDB()
  return db.prepare<[]>(`
    DELETE FROM "main"."play_history"
  `)
}

/**
 * 按 id 删除播放历史
 * @returns 删除语句
 */
export const createDeleteStatement = () => {
  const db = getDB()
  return db.prepare<[string]>(`
    DELETE FROM "main"."play_history"
    WHERE "id"=?
  `)
}

/**
 * 统计播放历史数量
 * @returns 统计语句
 */
export const createCountStatement = () => {
  const db = getDB()
  return db.prepare<[]>('SELECT COUNT(*) as count FROM "main"."play_history"')
}

/**
 * 超出条数上限时淘汰最旧的记录
 * LIMIT -1 OFFSET ? → 跳过最新 ? 条，命中的正是需要删掉的旧记录
 * @returns 淘汰语句
 */
export const createTrimStatement = () => {
  const db = getDB()
  return db.prepare<[number]>(`
    DELETE FROM "main"."play_history"
    WHERE "id" IN (
      SELECT "id" FROM "main"."play_history"
      ORDER BY "playedAt" DESC
      LIMIT -1 OFFSET ?
    )
  `)
}
