import { eapiRequest } from './utils/index'
import { sizeFormate } from '../../index'

/**
 * 专辑搜索 / 歌手搜索
 * 网易云搜索接口 type 映射：1 单曲 / 10 专辑 / 100 歌手 / 1000 歌单 / 1004 MV / 1006 歌词
 * 歌手结果复用 singer 列表页已有的圆形头像风格，专辑结果走方形封面网格。
 */
const SEARCH_TYPE = {
  album: 10,
  singer: 100,
}

/**
 * @typedef {object} AlbumSearchItem
 * @property {string} id
 * @property {string} name
 * @property {string} artist
 * @property {string} artistId
 * @property {string} img
 * @property {number} size
 * @property {number} publishDate
 * @property {'wy'} source
 */

/**
 * @typedef {object} SingerSearchItem
 * @property {string} id
 * @property {string} name
 * @property {string} img
 * @property {number} albumSize
 * @property {number} musicSize
 * @property {'wy'} source
 */

/**
 * @param {string} str
 * @param {number} page
 * @param {number} limit
 * @param {number} type
 * @param {number} retryNum
 */
const doSearch = (str, page, limit, type, retryNum = 0) => {
  if (retryNum > 3) return Promise.reject(new Error('search failed'))
  const requestObj = eapiRequest('/api/search/get/web', {
    s: str,
    type,
    limit,
    offset: limit * (page - 1),
    total: page == 1,
  })
  return requestObj.promise.then(({ body }) => {
    if (!body || body.code !== 200 || !body.result) {
      return doSearch(str, page, limit, type, retryNum + 1)
    }
    return body.result
  })
}

const formatDate = (time) => {
  if (!time) return 0
  return time < 1e11 ? time * 1000 : time
}

/** @param {any[]} rawList @returns {AlbumSearchItem[]} */
const handleAlbumResult = (rawList) => {
  if (!rawList || !Array.isArray(rawList)) return []
  return rawList.map(item => ({
    id: String(item.id ?? ''),
    name: item.name ?? '',
    artist: item.artist?.name ?? item.artists?.map(a => a.name).join('、') ?? '',
    artistId: String(item.artist?.id ?? item.artists?.[0]?.id ?? ''),
    // 统一升级为大图，避免列表页缩略图发糊
    img: item.blurPicUrl ? item.blurPicUrl.replace(/^\/\//, 'https://').replace(/{[\dsz]+}/, '400y400') : '',
    size: item.size ?? 0,
    publishDate: formatDate(item.publishTime),
    source: 'wy',
  })).filter(item => item.id && item.name)
}

/** @param {any[]} rawList @returns {SingerSearchItem[]} */
const handleSingerResult = (rawList) => {
  if (!rawList || !Array.isArray(rawList)) return []
  return rawList.map(item => ({
    id: String(item.id ?? ''),
    name: item.name ?? '',
    img: (item.picUrl ?? item.img1v1Url ?? '').replace(/^\/\//, 'https://').replace(/{[\dsz]+}/, '400y400'),
    albumSize: item.albumSize ?? 0,
    musicSize: item.musicSize ?? 0,
    source: 'wy',
  })).filter(item => item.id && item.name)
}

export default {
  limit: 30,
  total: 0,
  allPage: 1,
  /**
   * 搜索专辑
   * @param {string} str 关键词
   * @param {number} page 页码（1 起）
   * @param {number} [limit] 每页数量
   */
  async searchAlbum(str, page = 1, limit) {
    if (limit == null) limit = this.limit
    const result = await doSearch(str, page, limit, SEARCH_TYPE.album)
    const list = handleAlbumResult(result.albums)
    const total = result.albumCount ?? list.length
    return {
      list,
      total,
      limit,
      page,
      allPage: Math.ceil(total / limit),
      source: 'wy',
    }
  },
  /**
   * 搜索歌手
   * @param {string} str 关键词
   * @param {number} page 页码（1 起）
   * @param {number} [limit] 每页数量
   */
  async searchSinger(str, page = 1, limit) {
    if (limit == null) limit = this.limit
    const result = await doSearch(str, page, limit, SEARCH_TYPE.singer)
    const list = handleSingerResult(result.artists)
    const total = result.artistCount ?? list.length
    return {
      list,
      total,
      limit,
      page,
      allPage: Math.ceil(total / limit),
      source: 'wy',
    }
  },
  /** 保留一个格式化入口，便于未来按需拼「XX MB」等展示信息 */
  formatSize(size) {
    return sizeFormate(size)
  },
}
