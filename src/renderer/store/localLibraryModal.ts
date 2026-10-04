import { reactive, markRaw } from '@common/utils/vueTools'

/**
 * 全局「本地歌曲信息编辑」弹层状态。
 *
 * 本地音乐列表既出现在「本地音乐」页的四个视图里，也可能出现在最近播放、试听列表等
 * 任意列表中（本地歌曲可以被加进这些列表）。所以编辑入口不能只挂在某一个页面上 ——
 * 与「歌曲评论」弹层同样处理：全局状态 + 根级弹层，任意列表右键「编辑歌曲信息」都能唤起。
 */
export const localMusicEditInfo = reactive({
  visible: false,
  musicInfo: null as LX.Music.MusicInfoLocal | null,
})

export const showLocalMusicEdit = (musicInfo: LX.Music.MusicInfoLocal) => {
  localMusicEditInfo.musicInfo = markRaw(musicInfo)
  localMusicEditInfo.visible = true
}

export const hideLocalMusicEdit = () => {
  localMusicEditInfo.visible = false
  localMusicEditInfo.musicInfo = null
}
