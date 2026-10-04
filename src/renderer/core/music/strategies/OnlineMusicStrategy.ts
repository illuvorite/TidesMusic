import { updateListMusics } from '@renderer/store/list/action'
import { qualityList } from '@renderer/store'
import { assertApiSupport } from '@renderer/store/utils'
import musicSdk from '@renderer/utils/musicSdk'
import { getMusicUrl as getStoreMusicUrl, getPlayerLyric as getStoreLyric, saveMusicUrl, saveLyric } from '@renderer/utils/ipc'
import { appSetting } from '@renderer/store/setting'
import { langS2T, toNewMusicInfo, toOldMusicInfo } from '@renderer/utils'
import { requestMsg } from '@renderer/utils/message'
import { apis } from '@renderer/utils/musicSdk/api-source'
import { getOtherSource, buildLyricInfo, getCachedLyricInfo, getPlayQuality, TRY_QUALITYS_LIST, handleGetOnlineMusicUrl, handleGetOnlinePicUrl, handleGetOnlineLyricInfo } from '../utils'
import { musicQualityOverrides } from '@renderer/store/qualityOverride'
import { MusicSourceStrategy, GetMusicUrlParams, GetPicUrlParams, GetLyricInfoParams } from './MusicSourceStrategy'

const existTimeExp = /\[\d{1,2}:.*\d{1,4}\]/

export class OnlineMusicStrategy extends MusicSourceStrategy {
  async getMusicUrl(params: GetMusicUrlParams): Promise<string> {
    const { musicInfo, quality, isRefresh = false, allowToggleSource = true, onToggleSource = () => {} } = params
    const onlineMusicInfo = musicInfo as LX.Music.MusicInfoOnline
    // 优先级：显式传入 > 单曲指定（右键菜单设置）> 全局默认音质
    const overrideQuality = musicQualityOverrides[onlineMusicInfo.id]
    const targetQuality = quality ?? overrideQuality ?? getPlayQuality(appSetting['player.playQuality'], onlineMusicInfo)

    const cachedUrl = await getStoreMusicUrl(onlineMusicInfo, targetQuality)
    if (cachedUrl && !isRefresh) return cachedUrl

    return handleGetOnlineMusicUrl({ musicInfo: onlineMusicInfo, quality, isRefresh, onToggleSource, allowToggleSource })
      .then(({ url, quality: targetQuality, musicInfo: targetMusicInfo, isFromCache }) => {
        if (targetMusicInfo.id != onlineMusicInfo.id && !isFromCache) void saveMusicUrl(targetMusicInfo, targetQuality, url)
        void saveMusicUrl(onlineMusicInfo, targetQuality, url)
        return url
      })
  }

  async getPicUrl(params: GetPicUrlParams): Promise<string> {
    const { musicInfo, listId, isRefresh = false, allowToggleSource = true, onToggleSource = () => {} } = params
    const onlineMusicInfo = musicInfo as LX.Music.MusicInfoOnline

    if (onlineMusicInfo.meta.picUrl && !isRefresh) return onlineMusicInfo.meta.picUrl

    return handleGetOnlinePicUrl({ musicInfo: onlineMusicInfo, isRefresh, onToggleSource, allowToggleSource })
      .then(({ url, musicInfo: targetMusicInfo, isFromCache }) => {
        if (listId) {
          onlineMusicInfo.meta.picUrl = url
          void updateListMusics([{ id: listId, musicInfo: onlineMusicInfo }])
        }
        return url
      })
  }

  async getLyricInfo(params: GetLyricInfoParams): Promise<LX.Player.LyricInfo> {
    const { musicInfo, isRefresh = false, allowToggleSource = true, onToggleSource = () => {} } = params
    const onlineMusicInfo = musicInfo as LX.Music.MusicInfoOnline

    if (!isRefresh) {
      const lyricInfo = await getCachedLyricInfo(onlineMusicInfo)
      if (lyricInfo) return buildLyricInfo(lyricInfo)
    }

    return handleGetOnlineLyricInfo({ musicInfo: onlineMusicInfo, isRefresh, onToggleSource, allowToggleSource })
      .then(async ({ lyricInfo, musicInfo: targetMusicInfo, isFromCache }) => {
        if (isFromCache) return buildLyricInfo(lyricInfo)
        if (targetMusicInfo.id == onlineMusicInfo.id) void saveLyric(onlineMusicInfo, lyricInfo)
        else void saveLyric(targetMusicInfo, lyricInfo)
        return buildLyricInfo(lyricInfo)
      })
  }
}