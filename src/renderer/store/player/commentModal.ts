import { reactive, markRaw } from '@common/utils/vueTools'
import type { ListInfoItem } from '@renderer/store/songList/state'

/**
 * 全局「歌曲评论」弹层状态。
 *
 * 原先评论面板只挂在播放全屏页（`layout/PlayDetail`），只有正在播放的那首歌能看评论；
 * 而 QQ 音乐 / 网易云在歌单、搜索结果、排行榜等任意列表里都能对单曲看评论。
 * 这里用一个全局状态 + 根级弹层承载，让任意列表的右键菜单都能唤起同一套评论 UI。
 */
export const commentModalInfo = reactive({
  visible: false,
  musicInfo: null as ListInfoItem | null,
})

export const showMusicComment = (musicInfo: ListInfoItem) => {
  commentModalInfo.musicInfo = markRaw(musicInfo)
  commentModalInfo.visible = true
}

export const hideMusicComment = () => {
  commentModalInfo.visible = false
  commentModalInfo.musicInfo = null
}
