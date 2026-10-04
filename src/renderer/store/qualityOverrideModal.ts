import { reactive, markRaw } from '@common/utils/vueTools'

/**
 * 全局「单曲指定音质」弹层状态。
 * 从任意列表的右键菜单唤起，与「歌曲评论」「编辑歌曲信息」同一模式。
 */
export const musicQualityModalInfo = reactive({
  visible: false,
  musicInfo: null as LX.Music.MusicInfo | null,
})

export const showMusicQualityModal = (musicInfo: LX.Music.MusicInfo) => {
  musicQualityModalInfo.musicInfo = markRaw(musicInfo)
  musicQualityModalInfo.visible = true
}

export const hideMusicQualityModal = () => {
  musicQualityModalInfo.visible = false
  musicQualityModalInfo.musicInfo = null
}
