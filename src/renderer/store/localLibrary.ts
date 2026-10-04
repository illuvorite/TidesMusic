import { ref, reactive, shallowReactive, markRaw, watch } from '@common/utils/vueTools'
import { getLocalLibrary, saveLocalLibrary, showSelectDialog } from '@renderer/utils/ipc'
import { setCover } from '@renderer/utils/compositions/useCoverLoader'
import { appSetting } from '@renderer/store/setting'

/**
 * 本地曲库
 *
 * 与「手动导入文件到某个歌单」不同，这里是「注册目录 → 扫描 → 形成曲库」，
 * 对标主流平台的「本地音乐」：一次配置，之后重新扫描即可同步文件变动。
 *
 * 存储：走主进程的通用 data store（键 DATA_KEYS.localLibrary），不落业务数据库 ——
 * 存的是本机文件路径，属机器本地数据，不需要同步，也避免为此动数据库 schema。
 *
 * 结构上把「扫描到的原始元数据」与「用户的元数据覆盖」分开存，
 * 展示用的列表由两者合成，这样重新扫描既能拿到文件的新元数据、又不丢用户改过的字段。
 */

/** 已注册的扫描目录 */
export const localLibraryDirs = shallowReactive<string[]>([])

/** 展示用的歌曲列表（= 原始扫描结果 + 元数据覆盖） */
export const localMusicList = shallowReactive<LX.Music.MusicInfoLocal[]>([])

/** 应用内元数据覆盖，键为歌曲 id（文件路径）。不写回音频文件标签 */
export const localMusicOverrides = shallowReactive<Record<string, LX.Music.LocalMusicOverride>>({})

/** 上次扫描完成时间（0 表示从未扫描） */
export const localLibraryScannedAt = ref(0)

/** 是否已从磁盘读取过一遍 */
export const localLibraryLoaded = ref(false)

/** 是否正在扫描 */
export const localLibraryScanning = ref(false)

/** 扫描进度 */
export const localLibraryProgress = reactive({
  stage: 'collect' as 'collect' | 'parse',
  done: 0,
  total: 0,
})

/**
 * 扫描得到的原始列表（未应用覆盖）。
 * 故意不放进响应式容器：它只是合成 localMusicList 的原料，
 * 每次覆盖变更都从它重新合成，避免「改了又改」在上一次结果上叠加。
 */
let rawList: LX.Music.MusicInfoLocal[] = []

let loadPromise: Promise<void> | null = null

/** 把覆盖应用到一首歌上；没有覆盖时原样返回（不做无谓复制） */
const applyOverride = (song: LX.Music.MusicInfoLocal): LX.Music.MusicInfoLocal => {
  const override = localMusicOverrides[song.id]
  if (!override) return song
  const next = { ...song, meta: { ...song.meta } }
  if (override.name != null) next.name = override.name
  if (override.singer != null) next.singer = override.singer
  if (override.albumName != null) next.meta.albumName = override.albumName
  return markRaw(next)
}

/** 由 rawList + overrides 合成展示列表 */
const rebuildLocalMusicList = () => {
  localMusicList.splice(0, localMusicList.length, ...rawList.map(applyOverride))
}

/** 写回磁盘。列表里的对象都是 markRaw 过的普通对象，可直接结构化克隆 */
const persist = () => {
  saveLocalLibrary({
    dirs: [...localLibraryDirs],
    // 存原始值：覆盖单独存，读取时再合成，避免同一次覆盖被叠加两次
    list: [...rawList],
    scannedAt: localLibraryScannedAt.value,
    overrides: { ...localMusicOverrides },
  })
}

/**
 * 读取本地曲库（并发调用共用同一次请求）
 */
export const loadLocalLibrary = (force = false): Promise<void> => {
  if (loadPromise) return loadPromise
  if (localLibraryLoaded.value && !force) return Promise.resolve()

  loadPromise = getLocalLibrary().then((data) => {
    if (data) {
      localLibraryDirs.splice(0, localLibraryDirs.length, ...(data.dirs ?? []))

      for (const key of Object.keys(localMusicOverrides)) delete localMusicOverrides[key]
      Object.assign(localMusicOverrides, data.overrides ?? {})

      // markRaw：对象进入响应式容器后不能被代理化，否则回传 IPC 会抛
      // "An object could not be cloned"
      rawList = (data.list ?? []).filter(item => item?.id).map(item => markRaw(item))
      localLibraryScannedAt.value = data.scannedAt ?? 0
      rebuildLocalMusicList()
    }
    localLibraryLoaded.value = true
  }).catch(() => {
    localLibraryLoaded.value = true
  }).finally(() => {
    loadPromise = null
  })
  return loadPromise
}

/**
 * 添加扫描目录（可选：添加后立即扫描）
 */
export const addLocalLibraryDir = async(scanAfterAdd = true) => {
  const { canceled, filePaths } = await showSelectDialog({
    title: window.i18n.t('local_library__select_dir'),
    properties: ['openDirectory', 'multiSelections'],
  })
  if (canceled || !filePaths?.length) return

  let changed = false
  for (const dir of filePaths) {
    if (localLibraryDirs.includes(dir)) continue
    localLibraryDirs.push(dir)
    changed = true
  }
  if (!changed) return
  persist()
  if (scanAfterAdd) await scanLocalLibrary()
}

/** 判断某个绝对路径是否位于指定目录下（补分隔符，避免 D:\Music 误伤 D:\Music2） */
const isUnderDir = (filePath: string, dir: string) => {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const prefix = dir.endsWith('/') || dir.endsWith('\\') ? dir : `${dir}\\`
  return normalizedPath.startsWith(prefix.replace(/\\/g, '/'))
}

/**
 * 移除扫描目录
 * @param dir 目录路径
 * @param removeMusic 是否同时把该目录下已扫描到的歌曲从结果中移除
 */
export const removeLocalLibraryDir = (dir: string, removeMusic = true) => {
  const index = localLibraryDirs.indexOf(dir)
  if (index < 0) return
  localLibraryDirs.splice(index, 1)

  if (removeMusic) {
    // 同步清掉该目录下歌曲的元数据覆盖，否则会留下永远用不到的垃圾键
    for (const key of Object.keys(localMusicOverrides)) {
      if (isUnderDir(key, dir)) delete localMusicOverrides[key]
    }
    const kept = rawList.filter(item => !isUnderDir(item.meta?.filePath ?? item.id, dir))
    if (kept.length !== rawList.length) {
      rawList = kept
      rebuildLocalMusicList()
    }
  }
  persist()
}

/**
 * 扫描本地曲库。
 * 扫描在渲染进程的 worker 中进行（递归遍历 + 元数据解析），不会阻塞界面。
 */
export const scanLocalLibrary = async() => {
  if (localLibraryScanning.value) return
  if (!localLibraryDirs.length) return

  localLibraryScanning.value = true
  localLibraryProgress.stage = 'collect'
  localLibraryProgress.done = 0
  localLibraryProgress.total = 0
  // 重新扫描会拿到全新的文件列表，封面缓存里的旧路径可能已失效，解锁待加载集合
  coverQueued.clear()

  try {
    const result = await window.lx.worker.main.scanLocalMusic(
      [...localLibraryDirs],
      // Comlink 会把该回调代理到 worker 侧执行
      (progress) => {
        localLibraryProgress.stage = progress.stage
        localLibraryProgress.done = progress.done
        localLibraryProgress.total = progress.total
      },
    )

    rawList = (result?.list ?? []).map(item => markRaw(item))
    localLibraryScannedAt.value = Date.now()
    localLibraryDirty.value = false
    rebuildLocalMusicList()
    persist()
    return result
  } finally {
    localLibraryScanning.value = false
  }
}

/**
 * 保存一首本地歌曲的元数据覆盖。
 *
 * 传入空字符串表示「恢复为文件中的原值」（即从覆盖里去掉该字段）。
 * 刻意不写回音频文件：为 mp3/flac/m4a/ogg 各引一套写标签依赖，风险与体积都不划算。
 * @param id 歌曲 id（文件路径）
 * @param patch 需要覆盖的字段
 */
export const setLocalMusicOverride = (id: string, patch: LX.Music.LocalMusicOverride) => {
  if (!id) return
  const next: LX.Music.LocalMusicOverride = { ...localMusicOverrides[id] }

  for (const key of ['name', 'singer', 'albumName'] as const) {
    if (!(key in patch)) continue
    const value = patch[key]?.trim()
    if (value) next[key] = value
    else delete next[key]
  }

  if (Object.keys(next).length) localMusicOverrides[id] = next
  else delete localMusicOverrides[id]

  rebuildLocalMusicList()
  persist()
}

/** 清除某首歌的全部元数据覆盖 */
export const resetLocalMusicOverride = (id: string) => {
  if (!(id in localMusicOverrides)) return
  delete localMusicOverrides[id]
  rebuildLocalMusicList()
  persist()
}

// ---------------------------------------------------------------- 封面懒加载

/**
 * 封面并发上限。
 * 上千首歌的曲库若一次性发起请求，会把 worker 的 IPC 队列打满；
 * 限制并发后按需慢慢补齐，用户滚动时封面陆续出现即可。
 */
const COVER_CONCURRENCY = 4

const coverQueue: LX.Music.MusicInfoLocal[] = []
/** 已入过队的歌曲 id：解析失败/无封面时不再反复重试 */
const coverQueued = new Set<string>()
let coverRunning = 0

const pumpCoverQueue = () => {
  while (coverRunning < COVER_CONCURRENCY && coverQueue.length) {
    const song = coverQueue.shift() as LX.Music.MusicInfoLocal
    coverRunning++
    void window.lx.worker.main.getMusicFilePic(song.meta?.filePath as string)
      .then(url => setCover(song.id, url))
      .catch(() => {})
      .finally(() => {
        coverRunning--
        pumpCoverQueue()
      })
  }
}

/**
 * 请求加载本地封面（去重 + 并发受限）。
 * 本地歌曲没有在线音源，useCoverLoader 的 loadCover 对它们会直接返回，
 * 所以封面由这里取出后写进公共封面缓存，列表组件的 getCoverUrl 便能读到。
 * @param items 需要加载封面的歌曲
 */
export const loadLocalCovers = (items: LX.Music.MusicInfoLocal[]) => {
  for (const song of items) {
    if (!song?.id || !song.meta?.filePath) continue
    if (song.meta.picUrl || coverQueued.has(song.id)) continue
    coverQueued.add(song.id)
    coverQueue.push(song)
  }
  pumpCoverQueue()
}

/**
 * 清空扫描结果（保留已注册的目录）
 */
export const clearLocalLibraryMusic = () => {
  rawList = []
  localMusicList.splice(0, localMusicList.length)
  localLibraryScannedAt.value = 0
  persist()
}

// ---------------------------------------------------------------- 目录监听

/** 是否正在监听目录变化 */
export const localLibraryWatching = ref(false)

/** 自上次扫描后是否检测到文件变动（用于提示「重新扫描」） */
export const localLibraryDirty = ref(false)

/**
 * 按当前设置与目录列表启停目录监听。
 *
 * 变动**不会自动重新扫描**：扫描是重活，静默触发会在批量拷贝时突然卡住，
 * 也会把用户正在看的列表整批换掉。这里只置一个「有新变动」标记，由页面提示用户点一下。
 */
export const syncLocalLibraryWatch = async() => {
  const shouldWatch = appSetting['local.libraryWatch'] && localLibraryDirs.length > 0

  if (!shouldWatch) {
    if (localLibraryWatching.value) {
      localLibraryWatching.value = false
      await window.lx.worker.main.stopWatchLocalDirs().catch(() => {})
    }
    return
  }

  localLibraryWatching.value = true
  // 重新监听会替换上一批 watcher，worker 侧会先关掉旧的
  await window.lx.worker.main.watchLocalDirs([...localLibraryDirs], () => {
    localLibraryDirty.value = true
  }).catch(() => {
    localLibraryWatching.value = false
  })
}

// 设置开关或目录列表变化时自动重启监听。
// 放在模块级：store 是单例，无需随组件卸载而销毁。
watch([
  () => appSetting['local.libraryWatch'],
  () => localLibraryDirs.length,
], () => {
  void syncLocalLibraryWatch()
}, { immediate: true })

