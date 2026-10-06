import { markRaw, markRawList, toRaw } from '@common/utils/vueTools'
import {
  allMusicList,
  recentList,
  loveList,
  tempList,
  userLists,
} from './state'
import { overwriteListPosition, overwriteListUpdateInfo, removeListPosition, removeListUpdateInfo } from '@renderer/utils/data'
import { addListTrash } from '@renderer/store/listTrash'
import { LIST_IDS } from '@common/constants'
import { arrPush, arrUnshift } from '@common/utils/common'

export const setUserLists = (lists: LX.List.UserListInfo[]) => {
  userLists.splice(0, userLists.length, ...lists)
  return userLists
}

export const setMusicList = (listId: string, musicList: LX.Music.MusicInfo[]) => {
  const list = markRawList(musicList)
  allMusicList.set(listId, list)
  return list
}

const overwriteMusicList = (id: string, list: LX.Music.MusicInfo[]) => {
  // console.log(id, list)
  markRawList(list)
  let targetList = allMusicList.get(id)
  if (targetList) {
    targetList.splice(0, targetList.length)
    arrPush(targetList, list)
  } else {
    allMusicList.set(id, list)
  }
}
const removeMusicList = (id: string) => {
  allMusicList.delete(id)
}

const createUserList = ({
  name,
  id,
  source,
  sourceListId,
  locationUpdateTime,
}: LX.List.UserListInfo, position: number) => {
  if (position < 0 || position >= userLists.length) {
    userLists.push({
      name,
      id,
      source,
      sourceListId,
      locationUpdateTime,
    })
  } else {
    userLists.splice(position, 0, {
      name,
      id,
      source,
      sourceListId,
      locationUpdateTime,
    })
  }
}

const updateList = ({
  name,
  id,
  source,
  sourceListId,
  meta,
  locationUpdateTime,
}: LX.List.UserListInfo & { meta?: { id?: string } }) => {
  let targetList
  switch (id) {
    case recentList.id:
    case loveList.id:
      break
    case tempList.id:
      tempList.meta = meta ?? {}
      break
    default:
      targetList = userLists.find(l => l.id == id)
      if (!targetList) return
      targetList.name = name
      targetList.source = source
      targetList.sourceListId = sourceListId
      targetList.locationUpdateTime = locationUpdateTime
      break
  }
}

const removeUserList = (id: string) => {
  const index = userLists.findIndex(l => l.id == id)
  if (index < 0) return
  userLists.splice(index, 1)
  // removeMusicList(id)
}

const overwriteUserList = (lists: LX.List.UserListInfo[]) => {
  userLists.splice(0, userLists.length, ...lists)
}


// const sendMyListUpdateEvent = (ids: string[]) => {
//   window.app_event.myListUpdate(ids)
// }


export const listDataOverwrite = ({ defaultList, loveList, recentList, userList, tempList }: MakeOptional<LX.List.ListDataFull, 'tempList' | 'recentList' | 'defaultList'>): string[] => {
  const updatedListIds: string[] = []
  const newUserIds: string[] = []
  const newUserListInfos = userList.map(({ list, ...listInfo }) => {
    newUserIds.push(listInfo.id)
    if (allMusicList.has(listInfo.id)) {
      overwriteMusicList(listInfo.id, list)
      updatedListIds.push(listInfo.id)
    }
    return listInfo
  })
  for (const list of userLists) {
    if (!allMusicList.has(list.id) || newUserIds.includes(list.id)) continue
    removeMusicList(list.id)
    updatedListIds.push(list.id)
  }
  overwriteUserList(newUserListInfos)

  overwriteMusicList(LIST_IDS.LOVE, loveList)
  updatedListIds.push(LIST_IDS.LOVE)

  if (recentList) {
    overwriteMusicList(LIST_IDS.RECENT, recentList)
    updatedListIds.push(LIST_IDS.RECENT)
  }

  if (tempList && allMusicList.has(LIST_IDS.TEMP)) {
    overwriteMusicList(LIST_IDS.TEMP, tempList)
    updatedListIds.push(LIST_IDS.TEMP)
  }
  const newIds = [LIST_IDS.LOVE, ...userList.map(l => l.id)]
  if (recentList) newIds.push(LIST_IDS.RECENT)
  if (tempList) newIds.push(LIST_IDS.TEMP)
  void overwriteListPosition(newIds)
  void overwriteListUpdateInfo(newIds)
  return updatedListIds
}

export const userListCreate = ({ name, id, source, sourceListId, position, locationUpdateTime }: {
  name: string
  id: string
  source?: LX.OnlineSource
  sourceListId?: string
  position: number
  locationUpdateTime: number | null
}) => {
  if (userLists.some(item => item.id == id)) return
  const newList: LX.List.UserListInfo = {
    name,
    id,
    source,
    sourceListId,
    locationUpdateTime,
  }
  createUserList(newList, position)
}

export const userListsRemove = (ids: string[]) => {
  const changedIds = []
  // 删除前先快照进回收站：删除是破坏性的，歌单删了里面的歌就跟着没了。
  // 快照失败不应阻断删除（回收站只是兜底，不是必须成功）。
  const snapshots: Array<{ name: string, source?: LX.OnlineSource, sourceListId?: string, list: LX.Music.MusicInfo[] }> = []
  for (const id of ids) {
    const info = userLists.find(l => l.id == id)
    if (info) {
      snapshots.push({
        name: info.name,
        source: info.source,
        sourceListId: info.sourceListId,
        list: [...(allMusicList.get(id) ?? [])],
      })
    }
    removeUserList(id)
    void removeListPosition(id)
    void removeListUpdateInfo(id)
    if (!allMusicList.has(id)) continue
    removeMusicList(id)
    changedIds.push(id)
  }
  // 删除已经发生，回收站写入异步进行；失败只意味着本次没有兜底，不影响删除结果
  if (snapshots.length) void addListTrash(snapshots)

  return changedIds
}

export const userListsUpdate = (listInfos: LX.List.UserListInfo[]) => {
  for (const info of listInfos) {
    updateList(info)
  }
}

export const userListsUpdatePosition = (position: number, ids: string[]) => {
  const newUserLists = [...userLists]

  // console.log(position, ids)

  const updateLists: LX.List.UserListInfo[] = []

  // const targetItem = list[position]
  const map = new Map<string, LX.List.UserListInfo>()
  for (const item of newUserLists) map.set(item.id, item)
  for (const id of ids) {
    const listInfo = map.get(id)!
    listInfo.locationUpdateTime = Date.now()
    updateLists.push(listInfo)
    map.delete(id)
  }
  newUserLists.splice(0, newUserLists.length, ...newUserLists.filter(mInfo => map.has(mInfo.id)))
  newUserLists.splice(Math.min(position, newUserLists.length), 0, ...updateLists)

  setUserLists(newUserLists)
}

export const listMusicOverwrite = (listId: string, musicInfos: LX.Music.MusicInfo[]): string[] => {
  const isExist = allMusicList.has(listId)
  overwriteMusicList(listId, musicInfos)
  return isExist || listId == loveList.id ? [listId] : []
}

export const listMusicClear = (ids: string[]): string[] => {
  const changedIds: string[] = []
  for (const id of ids) {
    const list = allMusicList.get(id)
    if (!list?.length) continue
    overwriteMusicList(id, [])
    changedIds.push(id)
  }
  return changedIds
}

export const listMusicAdd = (id: string, musicInfos: LX.Music.MusicInfo[], addMusicLocationType: LX.AddMusicLocationType): string[] => {
  const targetList = allMusicList.get(id)
  if (!targetList) return id == loveList.id ? [id] : []

  const listSet = new Set<string>()
  for (const item of targetList) listSet.add(item.id)
  musicInfos = musicInfos.filter(item => {
    if (listSet.has(item.id)) return false
    markRaw(item)
    listSet.add(item.id)
    return true
  })
  switch (addMusicLocationType) {
    case 'top':
      arrUnshift(targetList, musicInfos)
      break
    case 'bottom':
    default:
      arrPush(targetList, musicInfos)
      break
  }

  return [id]
}

export const listMusicMove = (fromId: string, toId: string, musicInfos: LX.Music.MusicInfo[], addMusicLocationType: LX.AddMusicLocationType): string[] => {
  return [
    ...listMusicRemove(fromId, musicInfos.map(musicInfo => musicInfo.id)),
    ...listMusicAdd(toId, musicInfos, addMusicLocationType),
  ]
}

export const listMusicRemove = (listId: string, ids: string[]): string[] => {
  let targetList = allMusicList.get(listId)
  if (!targetList) return listId == loveList.id ? [listId] : []

  const idsSet = new Set<string>(ids)
  const newList = targetList.filter(mInfo => !idsSet.has(mInfo.id))
  targetList.splice(0, targetList.length)
  arrPush(targetList, newList)

  return [listId]
}

export const listMusicUpdateInfo = (musicInfos: LX.List.ListActionMusicUpdate): string[] => {
  const updateListIds = new Set<string>()
  for (const { id, musicInfo } of musicInfos) {
    const targetList = allMusicList.get(id)
    if (!targetList) continue
    const index = targetList.findIndex(l => l.id == musicInfo.id)
    if (index < 0) continue
    const info: LX.Music.MusicInfo = { ...targetList[index] }
    Object.assign(info, {
      name: musicInfo.name,
      singer: musicInfo.singer,
      source: musicInfo.source,
      interval: musicInfo.interval,
      meta: musicInfo.meta,
    })
    targetList.splice(index, 1, markRaw(info))
    updateListIds.add(id)
  }
  return Array.from(updateListIds)
}

export const listMusicUpdatePosition = async(listId: string, position: number, ids: string[]): Promise<string[]> => {
  let targetList = allMusicList.get(listId)
  if (!targetList) return listId == loveList.id ? [listId] : []


  // const infos = Array(ids.length)
  // for (let i = targetList.length; i--;) {
  //   const item = targetList[i]
  //   const index = ids.indexOf(item.id)
  //   if (index < 0) continue
  //   infos.splice(index, 1, targetList.splice(i, 1)[0])
  // }
  // targetList.splice(Math.min(position, targetList.length - 1), 0, ...infos)

  // console.time('ts')

  const list = await window.lx.worker.main.createSortedList(toRaw(targetList), position, ids)
  markRawList(list)
  targetList.splice(0, targetList.length)
  arrPush(targetList, list)

  // console.timeEnd('ts')
  return [listId]
}
