import { useRouter } from '@common/utils/vueRouter'
import musicSdk from '@renderer/utils/musicSdk'
import { openUrl } from '@common/utils/electron'
import { toOldMusicInfo } from '@renderer/utils'
import { addDislikeInfo, hasDislike } from '@renderer/core/dislikeList'
import { playNext } from '@renderer/core/player'
import { playMusicInfo } from '@renderer/store/player/state'
import { showMusicComment } from '@renderer/store/player/commentModal'
import { showLocalMusicEdit } from '@renderer/store/localLibraryModal'
import { showMusicQualityModal } from '@renderer/store/qualityOverrideModal'
import { dialog } from '@renderer/plugins/Dialog'
import { useI18n } from '@renderer/plugins/i18n'


export default ({ props }) => {
  const router = useRouter()
  const t = useI18n()

  const handleSearch = index => {
    const info = props.list[index]
    router.push({
      path: '/search',
      query: {
        text: `${info.name} ${info.singer}`,
      },
    })
  }

  const handleOpenMusicDetail = index => {
    const minfo = props.list[index]
    const url = musicSdk[minfo.source]?.getMusicDetailPageUrl?.(toOldMusicInfo(minfo))
    if (!url) return
    openUrl(url)
  }

  const handleShowMusicComment = index => {
    const minfo = props.list[index]
    showMusicComment(minfo)
  }

  /**
   * 编辑本地歌曲信息。
   * 只有本地歌曲能改：在线歌曲的名称/歌手来自音源接口，改了也无处保存。
   */
  const handleEditLocalMusicInfo = index => {
    const minfo = props.list[index]
    if (minfo?.source !== 'local') return
    showLocalMusicEdit(minfo)
  }

  /**
   * 为单曲指定音质（覆盖全局默认音质）。
   * 只对在线歌曲开放：本地歌曲直接读文件，没有音质档位概念。
   */
  const handleSetMusicQuality = index => {
    const minfo = props.list[index]
    if (!minfo || minfo.source === 'local') return
    if (!minfo.meta?._qualitys) return
    showMusicQualityModal(minfo)
  }

  const handleDislikeMusic = async(index) => {
    const minfo = props.list[index]
    const confirm = await dialog.confirm({
      message: minfo.singer ? t('lists__dislike_music_singer_tip', { name: minfo.name, singer: minfo.singer }) : t('lists__dislike_music_tip', { name: minfo.name }),
      cancelButtonText: t('cancel_button_text_2'),
      confirmButtonText: t('confirm_button_text'),
    })
    if (!confirm) return
    await addDislikeInfo([{ name: minfo.name, singer: minfo.singer }])
    if (hasDislike(playMusicInfo.musicInfo)) {
      playNext(true)
    }
  }


  return {
    handleSearch,
    handleOpenMusicDetail,
    handleShowMusicComment,
    handleEditLocalMusicInfo,
    handleSetMusicQuality,
    handleDislikeMusic,
  }
}
