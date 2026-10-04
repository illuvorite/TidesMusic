import { setMeta } from '@common/utils/musicMeta'
import { buildLyrics } from './lrcTool'

export const writeMeta = async({ filePath, isEmbedLyricLx, isEmbedLyricT, isEmbedLyricR, ...meta }: {
  filePath: string
  isEmbedLyricLx: boolean
  isEmbedLyricT: boolean
  isEmbedLyricR: boolean
  title: string
  artist: string
  album: string
  APIC: string | null
}, lyric: LX.Music.LyricInfo, proxy?: { host: string, port: number }) => {
  // 向上返回 Promise，写入失败时调用方可以感知并提示，
  // 否则封面/标签写入失败会完全静默
  return setMeta(filePath, { ...meta, lyrics: buildLyrics(lyric, isEmbedLyricLx, isEmbedLyricT, isEmbedLyricR) }, proxy)
}

export { saveLrc } from './utils'
