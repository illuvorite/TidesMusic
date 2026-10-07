<template>
  <section :class="$style.pane">
    <div v-if="!supported" :class="$style.tip">
      <p>{{ tipText }}</p>
      <button type="button" :class="$style.btnGhost" @click="handleBack">回到精选</button>
    </div>

    <template v-else>
      <div v-if="loading" :class="$style.tip">正在加载…</div>
      <div v-else-if="failed" :class="$style.tip">
        <p>加载失败</p>
        <button type="button" :class="$style.btnGhost" @click="load">重试</button>
      </div>
      <div v-else :class="$style.boardGrid">
        <div v-for="board in boards" :key="board.bangid" :class="$style.board" @click="openBoard(board)">
          <div :class="$style.boardCover">
            <img v-if="board.img" :src="board.img" alt="" loading="lazy">
            <span v-else :class="$style.coverEmpty">
              <svg-icon name="music" />
            </span>
          </div>
          <div :class="$style.boardInfo">
            <p :class="$style.boardName">{{ board.name }}</p>
            <p v-for="(song, index) in board.songs" :key="index" :class="$style.boardSong">
              <i>{{ index + 1 }}</i>
              <span :title="`${song.name} - ${song.singer}`">
                {{ song.name }}<template v-if="song.singer"> - <common-singer-link :singer="song.singer" :source="song.source" /></template>
              </span>
            </p>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
// 与 MusicHall / BoardDetail 保持一致用非 TS 的 <script setup>：
// musicSdk 是按 LX.OnlineSource 建的受限索引类型，用 string 索引会报 TS7053。
import { ref, watch } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import musicSdk from '@renderer/utils/musicSdk'
import { getSourceName } from '@renderer/utils/personalRecommend'

const props = defineProps({
  /** 当前音源 */
  source: { type: String, required: true },
  /** 该页签对应的榜单（QQ 音乐 bangid） */
  topicBoards: { type: Array, required: true },
})

const boards = ref([])
const loading = ref(false)
const failed = ref(false)

const router = useRouter()
const supported = ref(true)
const tipText = ref('')

const load = async() => {
  const sdk = musicSdk[props.source]
  // 专题榜依赖各源的 leaderboard.getList(bangid)，目前只有 QQ 音乐（tx）实现了
  if (!sdk?.leaderboard?.getList) {
    supported.value = false
    tipText.value = `「${getSourceName(props.source)}」暂未提供该内容，请切换到 QQ 音乐`
    return
  }
  loading.value = true
  failed.value = false
  try {
    const list = []
    for (const item of props.topicBoards) {
      // 注意：榜单接口内部对 bangid 找不到 period 的情况会直接 reject（重试 3 次后放弃），
      // 因此逐个 await + 各自 catch，单个榜失败不影响其余榜渲染。
      const res = await sdk.leaderboard.getList(item.bangid, 1).catch(() => null)
      const songs = (res?.list ?? []).slice(0, 3).map(song => ({
        name: song.name ?? song.songName ?? '',
        singer: song.singer ?? '',
        img: song.img ?? '',
      }))
      list.push({
        bangid: item.bangid,
        name: item.name,
        img: res?.list?.[0]?.img ?? songs[0]?.img ?? '',
        songs,
      })
    }
    boards.value = list.filter(board => board.songs.length)
    if (!boards.value.length) failed.value = true
  } finally {
    loading.value = false
  }
}

const openBoard = (board) => {
  void router.push({
    path: '/home/board',
    query: {
      source: props.source,
      boardId: board.bangid,
      name: board.name,
      img: board.img || '',
    },
  }).catch(() => {})
}

const handleBack = () => {
  void router.push({ path: '/home/music-hall', query: { tab: 'featured' } }).catch(() => {})
}

watch(() => [props.source, props.topicBoards], () => {
  void load()
}, { immediate: true })
</script>

<style lang="less" module>
.pane {
  height: 100%;
  overflow-y: auto;
}
.boardGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 4px var(--qm-content-pad-right) 30px var(--qm-content-pad-left);
}
.board {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  padding: var(--qm-sp-4, 10px);
  border-radius: var(--qm-radius-panel);
  background-color: var(--qm-hover);
  color: var(--qm-text-1);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), transform var(--qm-t-fast);
  &:hover {
    background-color: var(--qm-hover-strong);
    transform: translateY(-1px);
  }
}
.boardCover {
  flex: none;
  width: 104px;
  aspect-ratio: 1 / 1;
  border-radius: var(--qm-radius-sm, 8px);
  overflow: hidden;
  background-color: rgba(0, 0, 0, .06);
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.coverEmpty {
  color: var(--qm-text-4);
  font-size: 20px;
}
.boardInfo {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 5px;
  padding-right: var(--qm-sp-1, 4px);
}
.boardName {
  margin: 0 0 2px;
  font-size: var(--qm-fs-md, 14px);
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
}
.boardSong {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-3);
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  i {
    flex: none;
    width: 14px;
    font-style: normal;
    text-align: center;
    color: var(--qm-text-4);
  }
}
.tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--qm-sp-5, 12px);
  padding: 80px 0;
  color: var(--qm-text-4);
  font-size: var(--qm-fs-md, 14px);
}
.btnGhost {
  cursor: pointer;
  padding: 5px 16px;
  border: 1px solid var(--qm-primary);
  border-radius: 999px;
  background: none;
  color: var(--qm-primary);
  font-size: var(--qm-fs-sm, 13px);
  &:hover {
    background-color: var(--qm-primary-soft);
  }
}
</style>
