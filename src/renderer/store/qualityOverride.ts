import { ref, shallowReactive } from '@common/utils/vueTools'
import { getMusicQualityOverrides, saveMusicQualityOverrides } from '@renderer/utils/ipc'
import { DATA_KEYS } from '@common/constants'

/**
 * 单曲指定音质
 *
 * 全局只有「默认音质」一个设置，但主流平台普遍支持对单曲指定音质
 * （例如某首歌想固定听无损，其它歌仍走默认 128k）。
 *
 * 存储按**歌曲 id** 而不是写进歌单数据：同一首歌会出现在多个列表
 * （我的列表 / 最近播放 / 临时列表），按 id 存一份即可全局生效，
 * 也避免为此改动歌单的持久化结构。
 */

/** 歌曲 id → 指定音质。null/缺失表示跟随全局设置 */
export const musicQualityOverrides = shallowReactive<Record<string, LX.Quality>>({})

export const qualityOverridesLoaded = ref(false)

let loadPromise: Promise<void> | null = null

/**
 * 读取覆盖表（并发调用共用同一次请求）
 */
export const loadQualityOverrides = (force = false): Promise<void> => {
  if (loadPromise) return loadPromise
  if (qualityOverridesLoaded.value && !force) return Promise.resolve()

  loadPromise = getMusicQualityOverrides().then((data) => {
    if (data && typeof data === 'object') {
      for (const [id, quality] of Object.entries(data as Record<string, LX.Quality>)) {
        // 脏数据防御：只接受合法的音质档位
        if (typeof quality === 'string') musicQualityOverrides[id] = quality as LX.Quality
      }
    }
    qualityOverridesLoaded.value = true
  }).catch(() => {
    qualityOverridesLoaded.value = true
  }).finally(() => {
    loadPromise = null
  })
  return loadPromise
}

const persist = () => {
  saveMusicQualityOverrides({ ...musicQualityOverrides })
}

/**
 * 为单曲指定音质；传 null 表示取消指定（恢复跟随全局）
 */
export const setMusicQualityOverride = (id: string, quality: LX.Quality | null) => {
  if (!id) return
  if (quality) musicQualityOverrides[id] = quality
  else delete musicQualityOverrides[id]
  persist()
}
