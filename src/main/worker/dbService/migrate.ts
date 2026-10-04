import type Database from 'better-sqlite3'
import tables, { DB_VERSION, type Tables } from './tables'

/**
 * 表 / 索引若不存在则按 tables.ts 的定义创建。
 * 建的可能是表也可能是索引，所以这里不按 sqlite_master.type 过滤，只按名字判断。
 */
const ensureExists = (db: Database.Database, name: Tables) => {
  const exists = db.prepare('SELECT name FROM "main".sqlite_master WHERE name=?;').get(name)
  if (exists) return
  const sql = tables.get(name)
  if (sql) db.exec(sql)
}

const setVersion = (db: Database.Database, version: string) => {
  db.prepare('UPDATE "main"."db_info" SET "field_value"=@value WHERE "field_name"=@name')
    .run({ name: 'version', value: version })
}

const migrateV1 = (db: Database.Database) => {
  // 修复 v2.4.0 的默认数据库版本号不对的问题
  ensureExists(db, 'dislike_list')
}

const migrateV2 = (db: Database.Database) => {
  // v3：新增播放历史表（「最近播放」持久化 + 个性化推荐输入）
  ensureExists(db, 'play_history')
  ensureExists(db, 'index_play_history')
}

export default (db: Database.Database) => {
  // PRAGMA user_version = x
  // console.log(db.prepare('PRAGMA user_version').get().user_version)
  // https://github.com/WiseLibs/better-sqlite3/issues/668#issuecomment-1145285728
  const row = db.prepare<[string]>('SELECT "field_value" FROM "main"."db_info" WHERE "field_name" = ?').get('version') as { field_value: string } | undefined
  const version = row?.field_value
  if (version == null || version === DB_VERSION) return

  // 依次补跑所有「比当前版本新」的迁移，最后统一写入最新版本号。
  // 注意：原实现是 switch，只处理「当前所处版本」对应的那一段，
  // 于是 v1 用户升级时会直接跳到最新版本号，中间的迁移段被整段跳过 ——
  // 新增迁移段后，老用户就会缺少中间版本要建的表，进而被 verifyDB 判为校验失败。
  let current = version
  if (current === '1') {
    migrateV1(db)
    current = '2'
  }
  if (current === '2') {
    migrateV2(db)
    current = '3'
  }

  if (current !== version) setVersion(db, DB_VERSION)
}
