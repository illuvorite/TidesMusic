import { useRouter } from '@common/utils/vueRouter'
import musicSdk from '@renderer/utils/musicSdk'
import type { SingerSearchItem } from '@renderer/store/search/media'

/**
 * 「点击歌手名 → 歌手主页」的定位逻辑。
 *
 * 为什么需要这一步：`MusicInfo.singer` 只有一个拼接好的歌手名字符串，
 * 数据结构里**没有任何歌手 id**（`meta` 里只有 songId / albumId）。
 * 而 `/singer/detail` 必须拿到 id 才能取歌曲/专辑，所以只能在网络侧反查。
 *
 * 全项目中唯一能提供「按名字搜歌手」的是网易云（`musicSdk.wy.mediaSearch.searchSinger`），
 * 其余音源要么没有对应接口、要么只有冷门的歌手列表接口（不能按名检索）。
 * 因此这里统一用网易云解析：**解析结果与歌曲自身的音源无关**，
 * 点 tx/kg 的歌也会跳到网易云的歌手主页（跨音源，但这是当前唯一可行的做法）。
 */

const SINGER_SEARCH_SOURCE = 'wy'

/** 结果项：与 store/search/media.ts 的 SingerSearchItem 对齐 */
const resolveCache = new Map<string, SingerSearchItem>()

/**
 * 拆分多歌手名。各源的拼接分隔符并不统一：
 * wy 的 `getSinger` 用「、」，kg/kw/mg 常见「/」「,」，这里一并兼容。
 */
const SPLIT_RXP = /\s*[、/,;，；]\s*/

export const splitSingerNames = (singer?: string | null): string[] => {
  if (!singer) return []
  const names = singer.split(SPLIT_RXP).map(s => s.trim()).filter(Boolean)
  return [...new Set(names)]
}

/**
 * 按歌手名反查歌手信息（含 id 与头像）。
 * 同名重复点击不会重复发请求；失败结果不进缓存，下次点击会重试。
 */
export const resolveSingerByName = async(name: string): Promise<SingerSearchItem | null> => {
  const cached = resolveCache.get(name)
  if (cached) return cached

  const sdk = musicSdk[SINGER_SEARCH_SOURCE]?.mediaSearch
  if (!sdk) return null

  try {
    const result = await sdk.searchSinger(name, 1, 10)
    const list = (result?.list ?? []) as SingerSearchItem[]
    // 精确同名优先，否则取第一项（网易返回按相关度排序）
    const target = list.find(item => item.name.trim() === name) ?? list[0] ?? null
    if (target) resolveCache.set(name, target)
    return target
  } catch (err) {
    console.log('resolve singer failed:', err)
    return null
  }
}

/**
 * 歌手名跳转。
 * @param name 歌手名
 * @param fallbackSource 反查失败时兜底跳搜索页所用的音源
 */
export const useSingerNav = () => {
  const router = useRouter()

  const navigateToSinger = async(name: string, fallbackSource?: string) => {
    const singer = await resolveSingerByName(name)
    if (singer) {
      void router.push({
        path: '/singer/detail',
        query: {
          id: singer.id,
          name: singer.name,
          img: singer.img ?? '',
          source: SINGER_SEARCH_SOURCE,
        },
      }).catch(() => {})
      return true
    }
    // 反查不到主页时退化为搜索结果页，至少让用户看到相关内容（而不是点了没反应）
    void router.push({
      path: '/search',
      query: { text: name, source: fallbackSource ?? SINGER_SEARCH_SOURCE },
    }).catch(() => {})
    return false
  }

  return { navigateToSinger }
}
