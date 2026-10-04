import { useI18n } from '@renderer/plugins/i18n'
import { allMusicList, defaultList, loveList, userLists } from '@renderer/store/list/state'
import { addListMusics, createUserList, moveListMusics } from '@renderer/store/list/action'

/**
 * 「添加到 / 移动到」二级菜单（QQ 版式，见 docs/qq-music-todo ㊸）：
 *   试听列表 / 我的收藏 → 分隔线 → 添加到新歌单（方框加号图标）→ 分隔线 → 用户歌单
 * 歌曲已在的目标列表置灰禁用（对应参考图中第一行的灰色「播放队列」）。
 *
 * 子项 action 形如 `addTo:<listId>` / `moveTo:<listId>` / `addTo:new`，
 * 由各列表的 menuClick 统一转交 handleTargetAction 处理。
 */
export default () => {
  const t = useI18n()

  const isInList = (musicInfo, listId) => {
    if (!musicInfo?.id) return false
    return (allMusicList.get(listId) || []).some(m => m.id === musicInfo.id)
  }

  /**
   * @param {'add'|'move'} type
   * @param {LX.Music.MusicInfo|null} musicInfo 当前右键的歌曲
   * @param {string|null} excludeListId 移动时排除的来源列表
   */
  const buildSubmenu = (type, musicInfo, excludeListId = null) => {
    if (!musicInfo) return null
    const isMove = type === 'move'
    const prefix = isMove ? 'moveTo' : 'addTo'
    const items = []
    const pushList = (id, name) => {
      items.push({
        name,
        action: `${prefix}:${id}`,
        disabled: isMove ? id === excludeListId : isInList(musicInfo, id),
      })
    }

    pushList(defaultList.id, t(defaultList.name))
    pushList(loveList.id, t(loveList.name))

    if (!isMove) {
      items.push({ divider: true, key: `${prefix}-d-new` })
      items.push({ name: t('list_add__new_list'), action: `${prefix}:new`, icon: 'square-plus' })
    }

    const lists = userLists.filter(l => l.id !== excludeListId)
    if (lists.length) items.push({ divider: true, key: `${prefix}-d-user` })
    for (const l of lists) pushList(l.id, l.name)

    return items
  }

  /**
   * 处理二级菜单点击。返回 true 表示已消费（调用方无需再走原 switch）。
   * @param {string} action `addTo:<id>` / `moveTo:<id>` / `addTo:new`
   * @param {LX.Music.MusicInfo|null} musicInfo
   * @param {string|null} fromListId 移动时的来源列表
   */
  const handleTargetAction = (action, musicInfo, fromListId = null) => {
    if (!action || !musicInfo) return false
    const colon = action.indexOf(':')
    if (colon < 0) return false
    const prefix = action.slice(0, colon)
    const target = action.slice(colon + 1)
    if (prefix !== 'addTo' && prefix !== 'moveTo') return false

    if (target === 'new') {
      const base = t('lists__new_list_name')
      let name = base
      for (let i = 2; userLists.some(l => l.name == name); i++) name = `${base} ${i}`
      createUserList({ name, list: [musicInfo] })
      return true
    }

    if (prefix === 'moveTo') {
      if (!fromListId || target === fromListId) return true
      moveListMusics(fromListId, target, [musicInfo])
    } else {
      addListMusics(target, [musicInfo])
    }
    return true
  }

  return {
    buildSubmenu,
    handleTargetAction,
    isInList,
  }
}
