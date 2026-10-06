import { addTempPlayList } from '@renderer/store/player/action'
import { playList } from '@renderer/core/player'
import { setTempList } from '@renderer/store/list/action'
import { recentList, tempList } from '@renderer/store/list/state'

export default ({ props, selectedList, list, removeAllSelect }) => {
  let clickTime = 0
  let clickIndex = -1

  /**
   * 「最近播放」页展示的是播放历史，不在列表库里，所以不能用 listId 直接播
   * （playList(listId, index) 会去 getList(recent) 取歌，恒为空）。
   * 做法与在线歌单详情一致：先把当前列表灌进「临时列表」，再以 TEMP 播放。
   * tempListMeta.id 记成 recentList.id，供列表页认回「这一份播的就是我」。
   */
  const playFromHistory = async(index) => {
    const target = list.value[index]
    if (!target) return
    const snapshot = [...list.value]
    // 灌库是异步的，期间列表可能变化，因此按 id 重新定位而不是直接用 index
    const idx = snapshot.findIndex(m => m.id == target.id)
    await setTempList(recentList.id, snapshot)
    playList(tempList.id, idx < 0 ? index : idx)
  }

  const handlePlayMusic = (index) => {
    if (props.listId === recentList.id) {
      playFromHistory(index)
      return
    }
    playList(props.listId, index)
  }

  const handlePlayMusicLater = (index, single) => {
    if (selectedList.value.length && !single) {
      addTempPlayList(selectedList.value.map(s => ({ listId: props.listId, musicInfo: s })))
      removeAllSelect()
    } else {
      addTempPlayList([{ listId: props.listId, musicInfo: list.value[index] }])
    }
  }

  const doubleClickPlay = index => {
    if (
      window.performance.now() - clickTime > 400 ||
      clickIndex !== index
    ) {
      clickTime = window.performance.now()
      clickIndex = index
      return
    }
    handlePlayMusic(index, true)
    clickTime = 0
    clickIndex = -1
  }

  return {
    handlePlayMusic,
    handlePlayMusicLater,
    doubleClickPlay,
  }
}
