// 兜底：worker 进程里也要有 uncaughtException 兜底
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[dbService.worker] uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[dbService.worker] unhandledRejection:', reason)
})

import { init } from './db'
import { exposeWorker } from '../utils/worker'
import { list, lyric, music_url, music_other_source, download, dislike_list, play_history } from './modules/index'


const common = {
  init,
}

exposeWorker(Object.assign(common, list, lyric, music_url, music_other_source, download, dislike_list, play_history))

export type workerDBSeriveTypes = typeof common
  & typeof list
  & typeof lyric
  & typeof music_url
  & typeof music_other_source
  & typeof download
  & typeof dislike_list
  & typeof play_history
