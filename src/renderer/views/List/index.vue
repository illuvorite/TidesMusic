<template>
  <div id="my-list" :class="$style.container">
    <!--
      无UI 的操作宿主：承接侧栏右键菜单通过 ?sort=1 / ?dedupe=1 / ?addLocal=1 /
      ?update=1 / ?detail=1 / ?import=1 / ?export=1 / ?new=1 派发的操作与弹窗。
      原先这些逻辑寄生在左侧「我的列表」栏（MyList）里，该栏与全局侧栏
      （自建歌单 | 收藏歌单）功能重复，已移除；逻辑搬到ListQueryHost。
    -->
    <ListQueryHost :list-id="listId" />
    <MusicList ref="musicList" :list-id="listId" show-header @show-menu="() => {}" />
  </div>
</template>

<script>
import { getListPrevSelectId } from '@renderer/utils/data'

import ListQueryHost from './ListQueryHost.vue'
import MusicList from './MusicList/index.vue'

export default {
  name: 'List',
  components: {
    ListQueryHost,
    MusicList,
  },
  async beforeRouteEnter(to, from, next) {
    let id = to.query.id
    if (!id) {
      id = await getListPrevSelectId()
      next({
        path: to.path,
        query: { id },
      })
    } else next()
  },
  beforeRouteUpdate(to, from) {
    // console.log(to, from)
    if (to.query.updated) return
    let id = to.query.id
    if (id == null) return
    // if (!getList(id)) {
    //   id = defaultList.id
    // }
    this.listId = id
    const scrollIndex = to.query.scrollIndex
    const isAnimation = from.query.id == to.query.id
    this.$refs.musicList?.handleRestoreScroll(scrollIndex, isAnimation)

    const query = { ...to.query, updated: true }
    return {
      path: '/list',
      query,
    }
  },
  beforeRouteLeave(to, from) {
    this.$refs.musicList?.saveListPosition()
  },
  data() {
    return {
      listId: null,
    }
  },
  created() {
    this.listId = this.$route.query.id
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  overflow: hidden;
  height: 100%;
  display: flex;
  position: relative;
}

</style>
