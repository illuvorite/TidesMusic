/* eslint-disable @typescript-eslint/no-var-requires */
// import Vue from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'


const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: require('./views/Home/index.vue').default,
      meta: {
        name: 'Home',
      },
    },
    {
      path: '/home',
      name: 'HomeAlias',
      component: require('./views/Home/index.vue').default,
      meta: {
        name: 'Home',
      },
    },
    {
      path: '/home/music-hall',
      name: 'MusicHall',
      // 乐馆（仿 QQ 音乐乐馆：精选/排行榜/分类歌单）
      component: require('./views/Home/MusicHall.vue').default,
      meta: {
        name: 'Home',
      },
    },
    {
      path: '/home/recent',
      // 曾经的「最近播放」占位页（只有一句「即将上线」）已删除。
      // 统一重定向到唯一实现 /list/recent，避免同一功能存在两个入口、两套实现。
      redirect: '/list/recent',
    },
    {
      path: '/home/recommend',
      name: 'HomeRecommend',
      // 每日30首 / 百万收藏（按听歌风格真实生成）
      component: require('./views/Home/CustomList.vue').default,
      meta: {
        name: 'Home',
      },
    },
    {
      path: '/home/board',
      name: 'HomeBoard',
      // 乐馆排行榜榜单详情（仿 QQ：大封面 + 序号列表）
      component: require('./views/Home/BoardDetail.vue').default,
      meta: {
        name: 'Home',
      },
    },
    {
      path: '/singer/detail',
      name: 'SingerDetail',
      // 歌手主页（仿 QQ 音乐：歌手信息 + 精选/歌曲/专辑/详情）
      component: require('./views/Singer/Detail/index.vue').default,
      meta: {
        name: 'Home',
      },
    },
    {
      path: '/search',
      name: 'Search',
      component: require('./views/Search/index.vue').default,
      meta: {
        name: 'Search',
      },
    },
    {
      path: '/songList/list',
      name: 'SongList',
      component: require('./views/songList/List/index.vue').default,
      meta: {
        name: 'SongList',
      },
    },
    {
      path: '/songList/detail',
      name: 'SongListDetail',
      component: require('./views/songList/Detail/index.vue').default,
      meta: {
        name: 'SongList',
      },
    },
    {
      path: '/leaderboard',
      name: 'Leaderboard',
      component: require('./views/Leaderboard/index.vue').default,
      meta: {
        name: 'Leaderboard',
      },
    },
    {
      path: '/list',
      name: 'List',
      component: require('./views/List/index.vue').default,
      meta: {
        name: 'List',
      },
    },
    {
      path: '/list/love',
      name: 'ListLove',
      component: require('./views/List/Love.vue').default,
      meta: {
        name: 'List',
      },
    },
    {
      path: '/list/recent',
      name: 'ListRecent',
      component: require('./views/List/Recent.vue').default,
      meta: {
        name: 'List',
      },
    },
    {
      path: '/download',
      name: 'Download',
      component: require('./views/Download/index.vue').default,
      meta: {
        name: 'Download',
      },
    },
    {
      path: '/local',
      name: 'LocalMusic',
      // 本地音乐（扫描本机文件夹形成的曲库）
      component: require('./views/LocalMusic/index.vue').default,
      meta: {
        name: 'LocalMusic',
      },
    },
    {
      path: '/theme',
      name: 'ThemeCenter',
      // 个性主题中心（仿 QQ 音乐：推荐/其它/纯色 + 桌面装扮）
      component: require('./views/Theme/index.vue').default,
      meta: {
        name: 'ThemeCenter',
      },
    },
    {
      path: '/batch-download',
      name: 'BatchDownload',
      // 批量下载页：在列表页点「下载」后进入的独立页面（对齐 QQ 音乐）
      component: require('./views/BatchDownload/index.vue').default,
      meta: {
        name: 'BatchDownload',
      },
    },
    {
      path: '/setting',
      name: 'Setting',
      // 设置界面由 App.vue 顶层的全屏覆盖层渲染（layout-setting），此处留空避免重复挂载
      component: { render: () => null },
      meta: {
        name: 'Setting',
      },
    },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
  linkActiveClass: 'active-link',
  linkExactActiveClass: 'exact-active-link',
})


export default router
