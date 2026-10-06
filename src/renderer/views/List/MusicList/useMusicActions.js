import { useRouter } from '@common/utils/vueRouter'
import musicSdk from '@renderer/utils/musicSdk'
import { openUrl, clipboardWriteText } from '@common/utils/electron'
import { dialog } from '@renderer/plugins/Dialog'
import { useI18n } from '@renderer/plugins/i18n'
import { removeListMusics } from '@renderer/store/list/action'
import { recentList } from '@renderer/store/list/state'
import { removePlayHistoryAction } from '@renderer/store/playHistory'
import { appSetting } from '@renderer/store/setting'
import { formatMusicName, toOldMusicInfo } from '@renderer/utils/index'
import { addDislikeInfo, hasDislike } from '@renderer/core/dislikeList'
import { playNext } from '@renderer/core/player'
import { playMusicInfo } from '@renderer/store/player/state'


export default ({ props, list, selectedList, removeAllSelect }) => {
  const router = useRouter()
  const t = useI18n()

  const handleSearch = index => {
    const info = list.value[index]
    router.push({
      path: '/search',
      query: {
        text: `${info.name} ${info.singer}`,
      },
    })
  }

  const handleOpenMusicDetail = index => {
    const minfo = list.value[index]
    const url = musicSdk[minfo.source]?.getMusicDetailPageUrl(toOldMusicInfo(minfo))
    if (!url) return
    openUrl(url)
  }

  const handleCopyName = index => {
    const minfo = list.value[index]
    clipboardWriteText(formatMusicName(appSetting['download.fileName'], minfo.name, minfo.singer))
  }

  const handleDislikeMusic = async(index) => {
    const minfo = list.value[index]
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

  /**
   * 从列表移除歌曲。
   * 「最近播放」的数据源是播放历史，不是列表库：写 removeListMusics 只会去动那个恒为空的
   * 列表（界面无变化，且下次启动 loadPlayHistory 会把歌原样拉回来），
   * 所以这里必须改走历史删除，才能同时清掉界面与库里那条记录。
   */
  const removeMusics = (ids) => {
    if (props.listId === recentList.id) {
      removePlayHistoryAction(ids)
      return
    }
    removeListMusics({ listId: props.listId, ids })
  }

  const handleRemoveMusic = async(index, single) => {
    if (selectedList.value.length && !single) {
      const confirm = await (selectedList.value.length > 1
        ? dialog.confirm({
          message: t('lists__remove_music_tip', { len: selectedList.value.length }),
          confirmButtonText: t('lists__remove_tip_button'),
        })
        : Promise.resolve(true)
      )
      if (!confirm) return
      removeMusics(selectedList.value.map(m => m.id))
      removeAllSelect()
    } else {
      removeMusics([list.value[index].id])
    }
  }

  return {
    handleSearch,
    handleOpenMusicDetail,
    handleCopyName,
    handleDislikeMusic,
    handleRemoveMusic,
  }
}
