import { eapiRequest } from './utils/index'
import { httpFetch } from '../../request'
import { formatPlayTime, sizeFormate } from '../../index'
import { formatSingerName } from '../utils'

// 乐馆「歌手」筛选值 → 接口参数
const SINGER_AREA_MAP = {
  all: -1,
  mainland: 7,
  hktw: 7,
  western: 96,
  japan: 8,
  korea: 16,
}
const SINGER_SEX_MAP = {
  all: -1,
  male: 1,
  female: 2,
  group: 3,
}
const SINGER_PAGE_SIZE = 30

// 头像走 https + 300x300 缩放，避免混合内容与小图
const fixSingerPic = pic => {
  if (!pic) return ''
  return `${pic.replace(/^http:/, 'https:')}?param=300y300`
}

export default {
  /**
   * 获取歌手列表（乐馆 - 歌手页）
   * @param {object} [options]
   * @param {string} [options.area] 地区：all/mainland/hktw/western/japan/korea
   * @param {string} [options.sex] 性别：all/male/female/group
   * @param {string} [options.index] 首字母：all / A-Z / #
   * @param {number} [options.page] 页码
   */
  getSingerList({ area = 'all', sex = 'all', index = 'all', page = 1 } = {}) {
    const initial = !index || index === 'all' ? '' : index.toLowerCase()
    const url = `https://music.163.com/api/artist/list?type=${SINGER_SEX_MAP[sex] ?? -1}&area=${SINGER_AREA_MAP[area] ?? -1}&initial=${encodeURIComponent(initial)}&limit=${SINGER_PAGE_SIZE}&offset=${(page - 1) * SINGER_PAGE_SIZE}`
    return httpFetch(url, {
      headers: {
        Referer: 'https://music.163.com/',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
      },
    }).promise.then(({ body }) => {
      if (body.code !== 200) throw new Error('get singer list faild.')

      const list = (body.artists ?? []).map(item => ({
        id: item.id,
        name: item.name,
        img: fixSingerPic(item.picUrl),
      })).filter(item => item.id && item.name)
      return {
        source: 'wy',
        list,
        page,
        hasMore: !!body.more && list.length > 0,
      }
    })
  },
  /**
   * 获取歌手信息
   * @param {*} id
   */
  getInfo(id) {
    // 注意：eapiRequest 返回的是 request 对象本身，Promise 在它的 .promise 上
    // （同项目的 mediaSearch / hotSearch 都是 requestObj.promise.then 的写法）。
    // 这里原先直接 .then()，取不到数据 —— 表现为歌手页永远是「暂无歌曲/无专辑」。
    return eapiRequest('/api/artist/head/info/get', { id }).promise.then(({ body }) => {
      if (!body || body.code != 200) throw new Error('get singer info faild.')
      return {
        source: 'wy',
        id: body.artist.id,
        info: {
          name: body.artist.name,
          desc: body.artist.briefDesc,
          avatar: body.user.avatarUrl,
          gender: body.user.gender === 1 ? 'man' : 'woman',
        },
        count: {
          music: body.artist.musicSize,
          album: body.artist.albumSize,
        },
      }
    })
  },
  /**
   * 获取歌手歌曲列表
   * @param {*} id
   * @param {*} page
   * @param {*} limit
   */
  getSongList(id, page = 1, limit = 100) {
    if (page === 1) page = 0
    return eapiRequest('/api/v2/artist/songs', {
      id,
      limit,
      offset: limit * page,
    }).promise.then(({ body }) => {
      if (!body.songs || body.code != 200) throw new Error('get singer song list faild.')

      const list = this.filterSongList(body.songs)
      return {
        list,
        limit,
        page,
        total: body.total,
        source: 'wy',
      }
    })
  },
  /**
   * 获取歌手专辑列表
   * @param {*} id
   * @param {*} page
   * @param {*} limit
   */
  getAlbumList(id, page = 1, limit = 10) {
    if (page === 1) page = 0
    return eapiRequest(`/api/artist/albums/${id}`, {
      limit,
      offset: limit * page,
    }).promise.then(({ body }) => {
      if (!body.hotAlbums || body.code != 200) throw new Error('get singer album list faild.')

      const list = this.filterAlbumList(body.hotAlbums)
      return {
        source: 'wy',
        list,
        limit,
        page,
        total: body.artist.albumSize,
      }
    })
  },
  filterAlbumList(raw) {
    const list = []
    raw.forEach(item => {
      if (!item.id) return
      list.push({
        id: item.id,
        count: item.size,
        info: {
          name: item.name,
          author: formatSingerName(item.artists),
          img: item.picUrl,
          desc: null,
        },
      })
    })
    return list
  },
  filterSongList(raw) {
    const list = []
    raw.forEach(item => {
      if (!item.id) return

      const types = []
      const _types = {}
      let size
      item.privilege.chargeInfoList.forEach(i => {
        switch (i.rate) {
          case 128000:
            size = item.lMusic ? sizeFormate(item.lMusic.size) : null
            types.push({ type: '128k', size })
            _types['128k'] = {
              size,
            }
          case 320000:
            size = item.hMusic ? sizeFormate(item.hMusic.size) : null
            types.push({ type: '320k', size })
            _types['320k'] = {
              size,
            }
          case 999000:
            size = item.sqMusic ? sizeFormate(item.sqMusic.size) : null
            types.push({ type: 'flac', size })
            _types.flac = {
              size,
            }
          case 1999000:
            size = item.hrMusic ? sizeFormate(item.hrMusic.size) : null
            types.push({ type: 'flac24bit', size })
            _types.flac24bit = {
              size,
            }
        }
      })

      list.push({
        singer: formatSingerName(item.artists),
        name: item.name,
        albumName: item.album.name,
        albumId: item.album.id,
        songmid: item.id,
        source: 'wy',
        interval: formatPlayTime(item.duration),
        img: null,
        lrc: null,
        otherSource: null,
        types,
        _types,
        typeUrl: {},
      })
    })
    return list
  },
}
