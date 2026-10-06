<template>
  <div :class="$style.container">
    <!--
      与「我喜欢」页（Love.vue）完全一致：直接复用 MusicList，
      一次性获得播放 / 下载 / 批量 / 右键菜单 / 搜索 / 音质角标等全套功能。

      数据源是独立的 recentList（LIST_IDS.RECENT = 'recent'），
      不再复用已下线的「试听列表」defaultList。
    -->
    <MusicList
      ref="musicList"
      :list-id="listId"
      @show-menu="() => {}"
    />
  </div>
</template>

<script>
import { ref, watch } from '@common/utils/vueTools'
import MusicList from './MusicList/index.vue'
import { allMusicList, recentList } from '@renderer/store/list/state'

export default {
  name: 'Recent',
  components: { MusicList },
  setup() {
    const list = ref([])
    watch(
      () => allMusicList.get(recentList.id),
      (v) => { list.value = v ? [...v] : [] },
      { immediate: true, deep: true },
    )
    return { listId: recentList.id, list }
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
