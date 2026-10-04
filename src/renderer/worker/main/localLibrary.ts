import fs from 'node:fs'
import path from 'node:path'
import { checkPath } from '@common/utils/nodejs'
import { createLocalMusicInfo } from '@renderer/utils/music'

/**
 * 本地曲库扫描
 *
 * 放在渲染进程的 worker 里（与 createLocalMusicInfos 同一个 worker）：
 * 递归遍历目录 + 逐个解析音频元数据都是重活，放主线程会卡住界面。
 * worker 具备 Node 集成，可直接用 fs。
 */

/** 支持的音频扩展名（与「添加本地文件」对话框的过滤器一致，并补上常见无损/其他格式） */
const AUDIO_EXTS = new Set([
  'mp3', 'flac', 'ogg', 'oga', 'wav', 'm4a',
  'aac', 'wma', 'ape', 'opus', 'aiff', 'aif', 'wv', 'tak',
])

/**
 * 递归深度上限。
 * 一是防止用户误选整个盘符时把扫描变成「全盘遍历」，二是与软链跳过一起避免目录成环。
 */
const MAX_DEPTH = 12

/** 明确无意义的目录，直接跳过（不区分大小写） */
const SKIP_DIR_NAMES = new Set([
  'node_modules', '$recycle.bin', 'system volume information',
  'windows', 'program files', 'program files (x86)', 'programdata',
  'appdata', 'library', 'applications',
])

/**
 * 递归收集目录下的音频文件路径
 * @param dir 起始目录
 * @param out 结果收集数组
 * @param depth 当前深度
 */
const collectAudioFiles = async(dir: string, out: string[], depth: number) => {
  if (depth > MAX_DEPTH) return

  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true })
  } catch {
    // 权限不足 / 目录被删除 / 路径过长：跳过该目录，不影响其余部分
    return
  }

  for (const entry of entries) {
    const name = entry.name
    // 跳过隐藏项（.git / .cache 等）与软链接（可能成环，也会指向别处造成重复）
    if (name.startsWith('.') || entry.isSymbolicLink()) continue

    const fullPath = path.join(dir, name)

    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(name.toLowerCase())) continue
      await collectAudioFiles(fullPath, out, depth + 1)
      continue
    }

    if (!entry.isFile()) continue
    const ext = path.extname(name).replace(/^\./, '').toLowerCase()
    if (AUDIO_EXTS.has(ext)) out.push(fullPath)
  }
}

/** 扫描进度 */
export interface LocalLibraryProgress {
  /** 已解析文件数 */
  done: number
  /** 待解析文件总数 */
  total: number
  /** 当前阶段：收集文件 / 解析元数据 */
  stage: 'collect' | 'parse'
}

/**
 * 扫描本地曲库
 * @param dirs 需要扫描的目录
 * @param onProgress 进度回调（Comlink 会把渲染层传入的函数代理过来）
 */
export const scanLocalMusic = async(
  dirs: string[],
  onProgress?: (progress: LocalLibraryProgress) => void,
): Promise<LX.Music.LocalLibraryScanResult> => {
  const dirList = (dirs ?? []).filter(dir => typeof dir === 'string' && dir.trim().length > 0)

  // 1. 收集文件：目录可能互相嵌套（选了 D:\Music 又选了 D:\Music\A），
  //    用 Set 按绝对路径去重。
  const fileSet = new Set<string>()
  for (const dir of dirList) {
    if (!await checkPath(dir)) continue
    const found: string[] = []
    await collectAudioFiles(dir, found, 0)
    for (const file of found) fileSet.add(file)
    onProgress?.({ done: fileSet.size, total: 0, stage: 'collect' })
  }

  const files = [...fileSet]
  const total = files.length
  if (!total) return { list: [], total: 0, failed: 0 }

  // 2. 逐个解析元数据。
  //    串行处理：music-metadata 读文件是 IO 密集，串行可避免大曲库时文件句柄被瞬间打满。
  const list: LX.Music.MusicInfoLocal[] = []
  let failed = 0
  for (let i = 0; i < total; i++) {
    const info = await createLocalMusicInfo(files[i]).catch(() => null)
    if (info) list.push(info)
    else failed++

    // 节流上报：每 20 个文件一次 + 最后一次，避免每个文件都 postMessage
    if (onProgress && (i % 20 === 0 || i === total - 1)) {
      onProgress?.({ done: i + 1, total, stage: 'parse' })
    }
  }

  return { list, total, failed }
}

// ---------------------------------------------------------------- 目录监听

/** 最多监听的目录数（仅在平台不支持 recursive 的退化路径上生效） */
const MAX_WATCH_DIRS = 500

/** 变更合并窗口：批量拷贝文件会产生大量事件，合并成一次提示 */
const WATCH_DEBOUNCE = 3000

const isAudioFileName = (name: string) => AUDIO_EXTS.has(path.extname(name).replace(/^\./, '').toLowerCase())

let watchers: fs.FSWatcher[] = []
let watchNotify: (() => void) | null = null
let watchTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 收集目录下的所有子目录（含自身）。
 * 只在 `fs.watch` 不支持 recursive 的平台上用到（Linux），并设有数量上限，
 * 避免大曲库把 inotify 的 watch 配额吃满。
 */
const collectDirs = async(dir: string, out: string[], depth: number) => {
  if (depth > MAX_DEPTH || out.length >= MAX_WATCH_DIRS) return

  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (out.length >= MAX_WATCH_DIRS) return
    const name = entry.name
    if (name.startsWith('.') || entry.isSymbolicLink()) continue
    if (!entry.isDirectory() || SKIP_DIR_NAMES.has(name.toLowerCase())) continue
    const fullPath = path.join(dir, name)
    out.push(fullPath)
    await collectDirs(fullPath, out, depth + 1)
  }
}

const handleWatchEvent = (filename: string | Buffer | null) => {
  // 拿不到文件名时无法判断类型，保守起见也提示一次（例如某些平台的重命名事件）
  const name = typeof filename === 'string' ? filename : filename?.toString() ?? ''
  if (name && !isAudioFileName(name)) return

  if (watchTimer) clearTimeout(watchTimer)
  watchTimer = setTimeout(() => {
    watchTimer = null
    watchNotify?.()
  }, WATCH_DEBOUNCE)
}

/** 停止全部监听 */
export const stopWatchLocalDirs = () => {
  for (const watcher of watchers) {
    try {
      watcher.close()
    } catch {}
  }
  watchers = []
  if (watchTimer) {
    clearTimeout(watchTimer)
    watchTimer = null
  }
  watchNotify = null
}

/**
 * 监听目录变化并在有音频文件变动时回调。
 *
 * Windows / macOS 的 `fs.watch` 支持 `recursive`，一次即可覆盖整个子树；
 * Linux 上不支持（会同步抛 ERR_FEATURE_UNAVAILABLE_ON_PLATFORM），
 * 此时退化为「遍历子目录后逐个监听」。
 *
 * 只关心音频文件的增删改：写标签、缩略图、系统临时文件等无关变动不应打扰用户。
 * 变更会合并 3 秒后再上报，避免批量拷贝时刷屏。
 *
 * @param dirs 需要监听的目录
 * @param onChange 检测到变动时的回调
 */
export const watchLocalDirs = async(dirs: string[], onChange: () => void) => {
  stopWatchLocalDirs()
  watchNotify = onChange

  for (const dir of dirs ?? []) {
    if (typeof dir !== 'string' || !dir.trim()) continue
    if (!await checkPath(dir)) continue

    try {
      watchers.push(fs.watch(dir, { recursive: true }, (_eventType, filename) => {
        handleWatchEvent(filename)
      }))
    } catch {
      // 该平台不支持 recursive：退化为逐个监听子目录
      const subDirs: string[] = []
      await collectDirs(dir, subDirs, 0)
      for (const target of [dir, ...subDirs]) {
        try {
          watchers.push(fs.watch(target, (_eventType, filename) => {
            handleWatchEvent(filename)
          }))
        } catch {}
      }
    }
  }
}

