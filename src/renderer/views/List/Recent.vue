<template>
  <div :class="$style.container">
    <!--
      与「我喜欢」页（Love.vue）完全一致：直接复用 MusicList，
      一次性获得播放 / 下载 / 批量 / 右键菜单 / 搜索 / 音质角标等全套功能。

      ⚠️ 数据源是**播放历史**（store/playHistory.ts 的 playHistoryList），
      不是列表库里的 recentList：后者只是当初「下线试听列表」时留下的空壳，
      全项目没有任何地方往里写歌，读它就会永远是 0 首。
      MusicList 内部已按 listId 分流（见 MusicList/useListInfo.js），这里只负责传 id。
    -->
    <MusicList
      ref="musicList"
      :list-id="listId"
      @show-menu="() => {}"
    />
  </div>
</template>

<script>
import MusicList from './MusicList/index.vue'
import { recentList } from '@renderer/store/list/state'

export default {
  name: 'Recent',
  components: { MusicList },
  setup() {
    // 内容由 MusicList 自己按 listId 取（recent → 播放历史），此处无需再订阅列表库
    return { listId: recentList.id }
  },
}
</script>

<style lang="less" module>
.container {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
