import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { mainHandle } from '@common/mainIpc'

// 播放历史（「最近播放」持久化）。
// 单独成文件而不是并入 music.ts：music.ts 带有「受保护文件」标记（与 2.12.2 同步），
// 新功能放这里可以避免改动受保护逻辑。
export default () => {
  mainHandle<{ limit?: number, offset?: number }, LX.DBService.PlayHistoryInfo[]>(WIN_MAIN_RENDERER_EVENT_NAME.get_play_history, async({ params }) => {
    return global.lx.worker.dbService.getPlayHistory(params?.limit, params?.offset)
  })

  mainHandle<{ info: LX.DBService.PlayHistoryInfo, max?: number }>(WIN_MAIN_RENDERER_EVENT_NAME.add_play_history, async({ params }) => {
    await global.lx.worker.dbService.playHistoryAdd(params.info, params.max ?? 0)
  })

  // 批量写入：备份恢复 / 数据迁移用，一次事务写入，避免逐条 IPC
  mainHandle<{ infos: LX.DBService.PlayHistoryInfo[], max?: number }>(WIN_MAIN_RENDERER_EVENT_NAME.add_play_history_multiple, async({ params }) => {
    await global.lx.worker.dbService.playHistoryAddMultiple(params.infos, params.max ?? 0)
  })

  mainHandle<string[]>(WIN_MAIN_RENDERER_EVENT_NAME.remove_play_history, async({ params: ids }) => {
    await global.lx.worker.dbService.playHistoryRemove(ids)
  })

  mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.clear_play_history, async() => {
    await global.lx.worker.dbService.playHistoryClear()
  })

  mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.get_play_history_count, async() => {
    return global.lx.worker.dbService.playHistoryCount()
  })
}
