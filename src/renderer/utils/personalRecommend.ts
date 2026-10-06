/**
 * 听歌风格个性化推荐引擎
 *
 * 说明：
 * - 风格来源完全基于用户自己的数据：我喜欢 / 试听列表 / 自建歌单 / 播放历史；
 * - 通过「常听歌手」去当前音源搜索歌曲，过滤掉不喜欢与曲库里已有的歌，得到「你可能喜欢的新歌」；
 * - 百万收藏 = 平台榜单（真实数据）聚合出的霸榜金曲；
 * - 无听歌数据时自动降级为平台热歌，保证卡片永远有内容。
 */
import { LIST_IDS } from '@common/constants'
import { markRawList } from '@common/utils/vueTools'
import { toNewMusicInfo } from '@common/utils/tools'
import { deduplicationList } from '@renderer/utils'
import musicSdk from '@renderer/utils/musicSdk'
import { allMusicList, userLists } from '@renderer/store/list/state'
import { getListMusics } from '@renderer/store/list/listManage'
import { playHistoryList } from '@renderer/store/playHistory'
import { hasDislike } from '@renderer/store/dislikeList/action'
import { qualityList } from '@renderer/store/state'

export interface StyleArtist {
  name: string
  score: number
}

export interface ListenStyle {
  /** 常听歌手（权重从高到低） */
  artists: StyleArtist[]
  /** 用户曲库里已有歌曲（name+singer 归一化） */
  ownedKeys: Set<string>
  /** 是否存在听歌数据 */
  hasData: boolean
}

const SINGER_SPLIT_REG = /\s*(?:、|&|,|，|;|；|\/|\||feat\.?|ft\.?)\s*/i

const normalizeKey = (name?: string | null, singer?: string | null) =>
  `${name ?? ''}__${singer ?? ''}`.replace(/\s/g, '').toLowerCase()

const splitSingers = (singer?: string | null): string[] => {
  if (!singer) return []
  return singer.split(SINGER_SPLIT_REG).map(s => s.trim()).filter(s => s.length > 0 && s.length < 30)
}

const unwrap = (info: LX.Music.MusicInfo | LX.Download.ListItem | null | undefined): LX.Music.MusicInfo | null => {
  if (!info) return null
  return 'progress' in info ? info.metadata.musicInfo : info
}

const shuffle = <T>(list: T[]): T[] => {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

/**
 * 推荐使用的音源
 * 优先选择「搜索结果自带封面」的音源（kw/kg 搜索不返回封面，会导致卡片空白）
 */
const SOURCE_PRIORITY: LX.OnlineSource[] = ['tx', 'wy', 'mg', 'kg', 'kw']

export const getRecommendSource = (fallback: LX.OnlineSource = 'tx'): LX.OnlineSource => {
  const isEnabled = (id: LX.OnlineSource) => qualityList.value[id] != null
  return SOURCE_PRIORITY.find(isEnabled) ??
    SOURCE_PRIORITY.find(id => (musicSdk as any)[id]?.musicSearch?.search) ??
    fallback
}

let isStyleDataLoading: Promise<void> | null = null

const doLoadStyleData = async(): Promise<void> => {
  const ids = [LIST_IDS.LOVE, LIST_IDS.RECENT, ...userLists.slice(0, 10).map(l => l.id)]
  await Promise.all(ids.map(id => getListMusics(id).catch(() => [] as LX.Music.MusicInfo[])))
}

/** 载入用户自己的歌单数据（喜欢/试听/自建），用于统计听歌风格（同一时间只加载一次） */
export async function loadStyleData(): Promise<void> {
  if (!isStyleDataLoading) isStyleDataLoading = doLoadStyleData().catch(() => undefined)
  await isStyleDataLoading
}

/** 统计用户的听歌风格（歌手权重 + 曲库歌曲） */
export const getListenStyle = (): ListenStyle => {
  const artistScore = new Map<string, number>()
  const ownedKeys = new Set<string>()

  const add = (raw: LX.Music.MusicInfo | LX.Download.ListItem | null | undefined, weight: number) => {
    const info = unwrap(raw)
    if (!info?.name) return
    ownedKeys.add(normalizeKey(info.name, info.singer))
    for (const singer of splitSingers(info.singer)) {
      artistScore.set(singer, (artistScore.get(singer) ?? 0) + weight)
    }
  }

  // 收藏 > 最近播放 / 自建歌单 > 播放历史（越近权重越高）
  for (const m of allMusicList.get(LIST_IDS.LOVE) ?? []) add(m, 6)
  // 注意：列表库里的 recentList 没有任何写入方、恒为空（「最近播放」页与侧栏计数都改读
  // playHistoryList 了），所以这行目前不贡献权重；保留是为了将来 recentList 真被填充时可用。
  for (const m of allMusicList.get(LIST_IDS.RECENT) ?? []) add(m, 2)
  for (const list of userLists) {
    for (const m of allMusicList.get(list.id) ?? []) add(m, 2)
  }
  // 播放历史取持久化历史（playHistoryList，最新在前），而不是内存里的 playedList ——
  // 后者只在随机播放模式下写入、且重启即丢，会让推荐长期「吃不饱」。
  const history = playHistoryList.slice(0, 200)
  const historyLength = Math.max(history.length, 1)
  history.forEach((info, index) => {
    // 索引越小越新 → 权重越高
    add(info, 1 + ((historyLength - 1 - index) / historyLength) * 2)
  })

  const artists = [...artistScore.entries()]
    .filter(([name]) => name.length > 0)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score)

  return {
    artists,
    ownedKeys,
    hasData: artists.length > 0,
  }
}

/** 判断搜索结果是否可用（有音质、未被加入不喜欢） */
const isUsableSong = (info: LX.Music.MusicInfoOnline): boolean => {
  if (!info?.name || !info?.singer || !info.id) return false
  const qualitys = (info.meta as any)?._qualitys
  if (!qualitys || !Object.keys(qualitys).length) return false
  return !hasDislike(info)
}

const searchSongs = async(source: LX.OnlineSource, keyword: string, limit = 30): Promise<LX.Music.MusicInfoOnline[]> => {
  const sdk = (musicSdk as any)[source]
  if (!sdk?.musicSearch?.search) return []
  const result = await sdk.musicSearch.search(keyword, 1, limit)
  return ((result?.list ?? []) as any[])
    .map(item => toNewMusicInfo(item) as LX.Music.MusicInfoOnline)
    .filter(isUsableSong)
}

export interface BuildStyleSongsOptions {
  /** 需要生成的数量 */
  count?: number
  /** 指定歌手（默认取全部常听歌手） */
  artists?: StyleArtist[]
  /** 需要额外排除的歌曲 */
  excludeKeys?: Set<string>
  /** 是否排除用户曲库里已有的歌（默认 true） */
  excludeOwned?: boolean
}

/**
 * 根据听歌风格生成推荐歌曲
 * 同一位歌手不连续出现，尽量覆盖更多常听歌手
 */
export const buildStyleSongs = async(source: LX.OnlineSource, options: BuildStyleSongsOptions = {}): Promise<LX.Music.MusicInfoOnline[]> => {
  const { count = 30, artists, excludeKeys, excludeOwned = true } = options
  await loadStyleData()
  const style = getListenStyle()
  const seeds = (artists ?? style.artists).slice(0, 8)
  if (!seeds.length) return []

  const excluded = new Set<string>(excludeKeys ?? [])
  if (excludeOwned) {
    for (const key of style.ownedKeys) excluded.add(key)
  }

  // 串行搜索 + 间隔：酷我等平台的搜索接口有频率限制（瞬时并发会 403 Forbidden），
  // 逐个错开请求虽然总耗时长几秒，但成功率远高于并发
  const buckets: LX.Music.MusicInfoOnline[][] = []
  for (const seed of seeds) {
    const list = await searchSongs(source, seed.name, 30).catch(() => [] as LX.Music.MusicInfoOnline[])
    if (list.length) buckets.push(shuffle(list))
    await new Promise(resolve => setTimeout(resolve, 350))
  }
  if (!buckets.length) return []

  const result: LX.Music.MusicInfoOnline[] = []
  const usedKeys = new Set<string>()
  let round = 0
  const maxRound = 80
  while (result.length < count && round < maxRound) {
    let picked = false
    for (const bucket of buckets) {
      if (result.length >= count) break
      const song = bucket.shift()
      if (!song) continue
      picked = true
      const key = normalizeKey(song.name, song.singer)
      if (usedKeys.has(key) || excluded.has(key)) continue
      usedKeys.add(key)
      result.push(song)
    }
    if (!picked) break
    round++
  }
  return markRawList(result)
}

/** 刷歌模式：把风格歌曲随机打乱，作为沉浸式随机连播队列 */
export const buildBrushSongs = async(source: LX.OnlineSource, count = 60): Promise<LX.Music.MusicInfoOnline[]> => {
  const list = await buildStyleSongs(source, { count })
  return shuffle(list)
}

export interface RadioResult {
  /** 电台的主歌手（风格来源） */
  seedName: string
  list: LX.Music.MusicInfoOnline[]
}

/** 私人电台：从常听歌手中挑一位作为主播歌手，围绕他生成连续播放队列 */
export const buildRadioSongs = async(source: LX.OnlineSource, count = 40): Promise<RadioResult> => {
  await loadStyleData()
  const style = getListenStyle()
  const pool = style.artists.slice(0, 6)
  if (!pool.length) return { seedName: '', list: [] }
  const seed = pool[Math.floor(Math.random() * pool.length)]
  const list = await buildStyleSongs(source, {
    count,
    artists: [seed, ...pool.filter(a => a.name !== seed.name)],
  })
  return { seedName: seed.name, list }
}

/** 百万收藏：聚合平台各榜单的真实歌曲，上榜越多、名次越靠前分越高 */
export const buildChartSongs = async(source: LX.OnlineSource, count = 50): Promise<LX.Music.MusicInfoOnline[]> => {
  const sdk = (musicSdk as any)[source]
  if (!sdk?.leaderboard?.getBoards || !sdk.leaderboard.getList) return []
  const boards = await sdk.leaderboard.getBoards().catch(() => null)
  const targets = ((boards?.list ?? []) as any[]).slice(0, 4)
  if (!targets.length) return []

  const pages = await Promise.all(targets.map(board =>
    sdk.leaderboard.getList(board.bangid ?? board.id, 1).catch(() => null),
  ))

  const scoreMap = new Map<string, { info: LX.Music.MusicInfoOnline, score: number }>()
  for (const page of pages) {
    const list = ((page?.list ?? []) as any[])
    const length = Math.max(list.length, 1)
    list.forEach((raw, index) => {
      const info = toNewMusicInfo(raw) as LX.Music.MusicInfoOnline
      if (!isUsableSong(info)) return
      const prev = scoreMap.get(info.id)
      scoreMap.set(info.id, {
        info,
        score: (prev?.score ?? 0) + (1 - index / length),
      })
    })
  }

  return markRawList(
    [...scoreMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.info),
  )
}

const DAILY_CACHE_KEY = 'lx_home_daily30_v2'

const todayKey = () => {
  const date = new Date()
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

type DailyCache = Record<string, { date: string, nonce: string, list: LX.Music.MusicInfoOnline[] }>

const readDailyCache = (source: LX.OnlineSource): LX.Music.MusicInfoOnline[] | null => {
  try {
    const raw = window.localStorage.getItem(DAILY_CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw) as DailyCache
    const item = cache?.[source]
    // 跨天或跨会话（刷新/重启）都重新生成
    if (!item || item.date !== todayKey() || item.nonce !== SESSION_NONCE || !item.list?.length) return null
    return item.list
  } catch {
    return null
  }
}

const writeDailyCache = (source: LX.OnlineSource, list: LX.Music.MusicInfoOnline[]) => {
  try {
    const raw = window.localStorage.getItem(DAILY_CACHE_KEY)
    const cache: DailyCache = raw ? JSON.parse(raw) ?? {} : {}
    cache[source] = { date: todayKey(), nonce: SESSION_NONCE, list }
    window.localStorage.setItem(DAILY_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // 忽略写入失败（隐私模式/超配额）
  }
}

/**
 * 每日 30 首：当天首次生成后缓存，同一天内保持不变（按音源分别缓存）
 * @param force 是否强制重新生成（换一批）
 */
export const getDaily30 = async(source: LX.OnlineSource, force = false): Promise<LX.Music.MusicInfoOnline[]> => {
  const cached = readDailyCache(source)
  if (!force && cached) return markRawList(cached)

  let list = await buildStyleSongs(source, { count: 30 }).catch(() => [] as LX.Music.MusicInfoOnline[])
  if (list.length < 30) {
    // 听歌数据不足时用平台热歌补足
    const fill = await buildChartSongs(source, 30).catch(() => [] as LX.Music.MusicInfoOnline[])
    const ids = new Set(list.map(item => item.id))
    for (const song of fill) {
      if (list.length >= 30) break
      if (ids.has(song.id)) continue
      ids.add(song.id)
      list.push(song)
    }
  }
  list = markRawList(deduplicationList(list))

  if (list.length) writeDailyCache(source, list)
  return list
}

/** 兜底推荐：没有任何听歌数据时使用平台热歌 */
export const getFallbackSongs = async(source: LX.OnlineSource, count = 60): Promise<LX.Music.MusicInfoOnline[]> => {
  const list = await buildChartSongs(source, count).catch(() => [] as LX.Music.MusicInfoOnline[])
  return shuffle(list)
}

// ============================================================
//  多平台切换
// ============================================================

/** 支持推荐的音源（与 musicSdk.sources 保持一致的顺序） */
const SUPPORTED_SOURCE_IDS: LX.OnlineSource[] = ['kw', 'kg', 'tx', 'wy', 'mg']

const SOURCE_STORE_KEY = 'lx_home_source_v1'

/** 当前可用（已在设置里启用接口）的音源列表 */
export const getAvailableSources = (): LX.OnlineSource[] => {
  const list = SUPPORTED_SOURCE_IDS.filter(id => qualityList.value[id] != null)
  return list.length ? list : [getRecommendSource()]
}

/** 音源中文名（取 musicSdk.sources 里的名字） */
export const getSourceName = (source: LX.OnlineSource): string => {
  const info = ((musicSdk as any).sources ?? []).find((item: any) => item.id === source)
  return info?.name ?? source
}

/** 读取用户上次选择的音源 */
export const getSavedSource = (): LX.OnlineSource | null => {
  try {
    const saved = window.localStorage.getItem(SOURCE_STORE_KEY) as LX.OnlineSource | null
    if (saved && SUPPORTED_SOURCE_IDS.includes(saved)) return saved
  } catch {
    // 忽略读取失败
  }
  return null
}

export const saveSource = (source: LX.OnlineSource) => {
  try {
    window.localStorage.setItem(SOURCE_STORE_KEY, source)
  } catch {
    // 忽略写入失败
  }
}

/** 页面初始音源：上次选择 → 已启用音源优先序 → 默认 */
export const getInitialSource = (): LX.OnlineSource => getSavedSource() ?? getRecommendSource()

/** 平台歌单广场里的歌单（「每日随机推荐歌单」用） */
export interface PlatformPlaylist {
  id: string
  name: string
  author: string
  img: string
  play_count: string
  total?: string
  desc?: string | null
  source: LX.OnlineSource
}

// 每次页面加载生成一次随机指纹：用于「刷新后重新推荐」，同时保证同一次会话内结果稳定
const SESSION_NONCE = Math.random().toString(36).slice(2)

export const getSessionNonce = () => SESSION_NONCE

// 以字符串为种子的伪随机（保证「同一次会话 + 同一音源」结果稳定）
const hashSeed = (text: string) => {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 233280
  return hash || 1
}

const seededShuffle = <T>(list: T[], seedText: string): T[] => {
  const arr = [...list]
  let seed = hashSeed(seedText)
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

/**
 * 每日随机推荐歌单：取所选平台的推荐歌单，按「日期 + 音源」随机抽取
 * 同一天内结果稳定，切换平台或第二天自动变化
 */
/** 解析「541.8万 / 1.3亿」这类播放量文本 */
const parsePlayCount = (text?: string | null): number => {
  if (!text) return 0
  const match = /([\d.]+)\s*(亿|万)?/.exec(text)
  if (!match) return 0
  const value = parseFloat(match[1])
  if (Number.isNaN(value)) return 0
  if (match[2] === '亿') return value * 100000000
  if (match[2] === '万') return value * 10000
  return value
}

/**
 * 随机推荐宝藏歌单
 * - 取平台推荐歌单 3 页作为池子，剔除播放量最高的头部歌单，优先「宝藏」（小众但优质）
 * - 每次调用都重新随机（页面刷新 / 换一批 / 切换平台都会变）
 */
export const getPlatformPlaylists = async(source: LX.OnlineSource, count = 6, seedText?: string): Promise<PlatformPlaylist[]> => {
  const sdk = (musicSdk as any)[source]
  if (!sdk?.songList?.getList) return []
  const sortId = sdk.songList.sortList?.[0]?.id ?? ''
  // 必须串行：songList.getList 内部只维护一个共享请求对象（_requestObj_list），
  // 并发调用会互相 cancelHttp，只有最后一个能拿到数据（且前两个的 Promise 会被拒绝）
  const pages: any[] = []
  for (const page of [1, 2, 3]) {
    pages.push(await sdk.songList.getList(sortId, '', page).catch(() => null))
  }
  const pool = pages
    .flatMap(result => (result?.list ?? []) as PlatformPlaylist[])
    .filter(item => item?.id && item.name)
  if (!pool.length) return []

  // 去掉播放量前 20% 的头部歌单，剩下的当「宝藏池」
  const sorted = [...pool].sort((a, b) => parsePlayCount(b.play_count) - parsePlayCount(a.play_count))
  const treasure = sorted.slice(Math.floor(sorted.length * 0.2))
  const pickPool = treasure.length >= count ? treasure : pool
  const seed = seedText ?? `${SESSION_NONCE}__${Date.now()}__${Math.random()}`
  return seededShuffle(pickPool, seed)
    .slice(0, count)
    .map(item => ({ ...item, source }))
}

// ============================================================
//  百万收藏（平台真实的「百万收藏」歌单）
// ============================================================

export interface MillionCollection {
  /** playlist = 平台真实百万收藏歌单；chart = 平台没有该歌单时的榜单聚合兜底 */
  kind: 'playlist' | 'chart'
  name: string
  author?: string
  img?: string
  play_count?: string
  id?: string
  total?: string
  list: LX.Music.MusicInfoOnline[]
}

const MILLION_KEYWORDS = ['百万收藏', '百万收藏歌曲', '收藏百万']

/**
 * 百万收藏：优先使用所选平台里真实存在的「百万收藏」歌单（歌单内即百万收藏歌曲）
 * 平台没有这类歌单时返回 null，由调用方回退到榜单聚合
 */
export const getMillionCollection = async(source: LX.OnlineSource, count = 50): Promise<MillionCollection | null> => {
  const sdk = (musicSdk as any)[source]
  if (!sdk?.songList?.search || !sdk.songList.getListDetail) return null

  for (const keyword of MILLION_KEYWORDS) {
    const result = await sdk.songList.search(keyword, 1, 20).catch(() => null)
    const candidates = ((result?.list ?? []) as PlatformPlaylist[])
      .filter(item => item?.id && (item.name ?? '').includes('百万收藏'))
    if (!candidates.length) continue

    // 名字越贴切、播放量越高越优先
    const target = [...candidates].sort((a, b) => {
      const scoreA = (/^百万收藏/.test(a.name) ? 1e12 : 0) + parsePlayCount(a.play_count)
      const scoreB = (/^百万收藏/.test(b.name) ? 1e12 : 0) + parsePlayCount(b.play_count)
      return scoreB - scoreA
    })[0]

    const detail = await sdk.songList.getListDetail(target.id, 1).catch(() => null)
    const songs = ((detail?.list ?? []) as any[])
      .map(item => toNewMusicInfo(item) as LX.Music.MusicInfoOnline)
      .filter(isUsableSong)
      .slice(0, count)
    if (!songs.length) continue

    return {
      kind: 'playlist',
      id: target.id,
      name: target.name,
      author: target.author,
      img: target.img,
      play_count: target.play_count,
      total: target.total,
      list: markRawList(songs),
    }
  }
  return null
}

/** 百万收藏兜底：聚合平台榜单热歌 */
export const buildMillionFallback = async(source: LX.OnlineSource, count = 50): Promise<MillionCollection> => {
  const list = await buildChartSongs(source, count).catch(() => [] as LX.Music.MusicInfoOnline[])
  return {
    kind: 'chart',
    name: window.i18n.t('home__board_hits_mix'),
    list,
  }
}

// ============================================================
//  刷歌模式 / 电台 的队列（从已生成的推荐池派生，刷新即变、点击秒播）
// ============================================================

/** 刷歌模式队列：随机打乱推荐池 */
export const buildBrushQueue = (pool: LX.Music.MusicInfoOnline[], count = 60): LX.Music.MusicInfoOnline[] => {
  const map = new Map<string, LX.Music.MusicInfoOnline>()
  for (const song of shuffle(pool)) {
    if (!song?.id || map.has(song.id)) continue
    map.set(song.id, song)
  }
  return markRawList([...map.values()].slice(0, count))
}

export interface RadioQueue {
  seedName: string
  list: LX.Music.MusicInfoOnline[]
}

/** 电台队列：以推荐池里出现最多的歌手为主播歌手，其余作品顺序补齐 */
export const buildRadioQueue = (pool: LX.Music.MusicInfoOnline[]): RadioQueue => {
  const singerCount = new Map<string, number>()
  for (const song of pool) {
    for (const singer of splitSingers(song.singer)) {
      singerCount.set(singer, (singerCount.get(singer) ?? 0) + 1)
    }
  }
  const seedName = [...singerCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  if (!seedName) return { seedName: '', list: [] }

  const main: LX.Music.MusicInfoOnline[] = []
  const rest: LX.Music.MusicInfoOnline[] = []
  for (const song of pool) {
    (splitSingers(song.singer).includes(seedName) ? main : rest).push(song)
  }
  const list = [...main, ...shuffle(rest)]
  return { seedName, list: markRawList(list) }
}

// ============================================================
//  听「X」也会喜欢（相似歌曲）
// ============================================================

export interface SimilarSeedSong {
  name: string
  singer: string
  /** 种子歌自身（用于收藏判断） */
  music?: LX.Music.MusicInfo
}

/** 选一首「种子歌」：从最近的播放记录 / 我喜欢里随机挑一首（每次刷新内容会变化） */
export const getSimilarSeed = (): SimilarSeedSong | null => {
  // playHistoryList 已是「最新在前」，无需再 reverse
  const history = playHistoryList.slice(0, 50).filter(Boolean) as LX.Music.MusicInfo[]
  const seen = new Set<string>()
  const pool: LX.Music.MusicInfo[] = []
  for (const info of history) {
    const key = normalizeKey(info.name, info.singer)
    if (seen.has(key)) continue
    seen.add(key)
    pool.push(info)
  }
  if (!pool.length) pool.push(...(allMusicList.get(LIST_IDS.LOVE) ?? []))
  if (!pool.length) return null
  const info = pool[Math.floor(Math.random() * pool.length)]
  if (!info?.name) return null
  return { name: info.name, singer: info.singer ?? '', music: info }
}

const SAME_ARTIST_WEIGHT = 2

/**
 * 相似歌曲（仿 QQ「听 X 也会喜欢」）：
 * 1. 以种子歌为关键词搜平台上的相关歌单（真实数据），随机挑 1~2 个，取里面的歌曲；
 *    ——这样推荐的是「和这首气口相近的其他歌手作品」，而不是把该歌手的整张碟搬过来
 * 2. 数量不足时再用「同歌手 + 其他常听歌手」补齐，且同一歌手最多 2 首
 */
export const buildSimilarSongs = async(source: LX.OnlineSource, seed: SimilarSeedSong, count = 9): Promise<LX.Music.MusicInfoOnline[]> => {
  if (!seed?.name) return []
  await loadStyleData()
  const style = getListenStyle()
  const seedSinger = (seed.singer ?? '').split(SINGER_SPLIT_REG)[0]?.trim() ?? ''
  const excluded = new Set<string>()
  for (const key of style.ownedKeys) excluded.add(key)
  excluded.add(normalizeKey(seed.name, seed.singer))

  const result: LX.Music.MusicInfoOnline[] = []
  const usedKeys = new Set<string>()
  const singerCount = new Map<string, number>()

  const take = (song: LX.Music.MusicInfoOnline): boolean => {
    const key = normalizeKey(song.name, song.singer)
    if (usedKeys.has(key) || excluded.has(key)) return false
    // 同一位歌手最多出现 2 首，保证推荐内容的多样性
    const singers = splitSingers(song.singer)
    for (const singer of singers) {
      if ((singerCount.get(singer) ?? 0) >= SAME_ARTIST_WEIGHT) return false
    }
    usedKeys.add(key)
    result.push(song)
    for (const singer of singers) singerCount.set(singer, (singerCount.get(singer) ?? 0) + 1)
    return true
  }
  const collect = (list: LX.Music.MusicInfoOnline[], limit = count) => {
    let added = 0
    for (const song of shuffle(list)) {
      if (result.length >= count || added >= limit) break
      if (take(song)) added++
    }
  }

  // 1) 平台相关歌单（真实数据）：随机挑 1~2 个，每次刷新内容不同
  const sdk = (musicSdk as any)[source]
  if (sdk?.songList?.search && sdk.songList.getListDetail) {
    const result2 = await sdk.songList.search(seed.name, 1, 10).catch(() => null)
    const playlists = shuffle(((result2?.list ?? []) as PlatformPlaylist[]).filter(item => item?.id))
    for (const playlist of playlists.slice(0, 2)) {
      if (result.length >= count) break
      const detail = await sdk.songList.getListDetail(playlist.id, 1).catch(() => null)
      const songs = ((detail?.list ?? []) as any[])
        .map(item => toNewMusicInfo(item) as LX.Music.MusicInfoOnline)
        .filter(isUsableSong)
      collect(songs)
    }
  }

  // 2) 兜底：同歌手 + 其他常听歌手
  if (result.length < count) {
    if (seedSinger) {
      const list = await searchSongs(source, seedSinger, 40).catch(() => [] as LX.Music.MusicInfoOnline[])
      collect(list, count)
    }
    if (result.length < count) {
      const artists = style.artists
        .filter(item => !seedSinger || !item.name.includes(seedSinger))
        .slice(0, 5)
      const buckets = await Promise.all(artists.map(async(artist) => {
        const list = await searchSongs(source, artist.name, 20).catch(() => [] as LX.Music.MusicInfoOnline[])
        return shuffle(list)
      }))
      for (const bucket of buckets) collect(bucket, count)
    }
  }

  return markRawList(result)
}
