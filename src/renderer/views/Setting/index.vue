<template>
  <div class="view-fullcover" data-fullcover :class="$style.main">
      <!-- 无边框窗口：顶部拖拽区（覆盖工具栏后自备） -->
    <div :class="$style.dragBar" />
    <div class="scroll" :class="$style.toc">
      <div :class="$style.tocHead">
        <button type="button" :class="$style.backBtn" :aria-label="$t('back')" :title="$t('back')" @click="handleBack">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          返回
        </button>
        <h1 :class="$style.pageTitle">设置</h1>
      </div>
      <ul :class="$style.tocList" role="toolbar">
        <li v-for="h2 in tocList" :key="h2.id" :class="$style.tocListItem" role="presentation">
          <h2
            :class="[$style.tocH2, {[$style.active]: avtiveComponentName == h2.id }]"
            role="tab" :aria-selected="avtiveComponentName == h2.id" tabindex="0"
            :aria-label="h2.title" ignore-tip
            @click="toggleTab(h2.id)"
            @keydown.enter.prevent="toggleTab(h2.id)"
            @keydown.space.prevent="toggleTab(h2.id)"
          >
            <svg-icon :name="h2.icon" :class="$style.tocIcon" />
            <span :class="$style.tocLabel">{{ h2.title }}</span>
          </h2>
          <!-- <ul v-if="h2.children.length" :class="$style.tocList">
            <li v-for="h3 in h2.children" :key="h3.id" :class="$style.tocSubListItem">
              <h3 :class="[$style.tocH3, toc.activeId == h3.id ? $style.active : null]" :aria-label="h3.title">
                <a :href="'#' + h3.id" @click.stop="toc.activeId = h3.id">{{ h3.title }}</a>
              </h3>
            </li>
          </ul> -->
        </li>
      </ul>
    </div>
    <!-- 窗口控制按钮（最小化 / 最大化 / 关闭），全屏设置页时工具栏被隐藏，这里补上 -->
    <div :class="$style.winControls">
      <win-control-btns />
    </div>
    <div ref="dom_content_ref" class="scroll" :class="$style.setting">
      <!-- :key 让切换分类时重新挂载，配合 groupIn 动画给出「换页」反馈 -->
      <dl :key="avtiveComponentName" :class="$style.group">
        <component :is="avtiveComponentName" />
        <!-- <SettingBasic />
        <SettingPlay />
        <SettingPlayDetail />
        <SettingDesktopLyric />
        <SettingSearch />
        <SettingList />
        <SettingDownload />
        <SettingSync />
        <SettingHotKey />
        <SettingNetwork />
        <SettingOdc />
        <SettingBackup />
        <SettingOther />
        <SettingUpdate />
        <SettingAbout /> -->
      </dl>
      </div>
  </div>
</template>

<script>
import { ref, computed, nextTick } from '@common/utils/vueTools'
// import { currentStting } from './setting'
import { useI18n } from '@renderer/plugins/i18n'
import { useRoute, useRouter } from '@common/utils/vueRouter'

import SettingBasic from './components/SettingBasic.vue'
import SettingPlay from './components/SettingPlay.vue'
import SettingPlayDetail from './components/SettingPlayDetail.vue'
import SettingDesktopLyric from './components/SettingDesktopLyric.vue'
import SettingSearch from './components/SettingSearch.vue'
import SettingList from './components/SettingList.vue'
import SettingDownload from './components/SettingDownload.vue'
import SettingSync from './components/SettingSync/index.vue'
import SettingOpenAPI from './components/SettingOpenAPI.vue'
import SettingHotKey from './components/SettingHotKey.vue'
import SettingNetwork from './components/SettingNetwork.vue'
import SettingOdc from './components/SettingOdc.vue'
import SettingBackup from './components/SettingBackup.vue'
import SettingOther from './components/SettingOther.vue'
import SettingUpdate from './components/SettingUpdate.vue'
import SettingAbout from './components/SettingAbout.vue'
import WinControlBtns from '@renderer/components/layout/Toolbar/ControlBtns.vue'

export default {
  name: 'Setting',
  components: {
    SettingBasic,
    SettingPlay,
    SettingPlayDetail,
    SettingDesktopLyric,
    SettingSearch,
    SettingList,
    SettingDownload,
    SettingSync,
    SettingOpenAPI,
    SettingHotKey,
    SettingNetwork,
    SettingOdc,
    SettingBackup,
    SettingOther,
    SettingUpdate,
    SettingAbout,
    WinControlBtns,
  },
  setup() {
    const t = useI18n()
    const route = useRoute()
    const router = useRouter()

    const dom_content_ref = ref(null)

    const handleBack = () => {
      router.push('/home').catch(() => {})
    }

    // icon 为纯展示字段：给每个分类一个视觉锚点，便于快速扫视定位
    const tocList = computed(() => {
      return [
        { id: 'SettingBasic', title: t('setting__basic'), icon: 'setting' },
        { id: 'SettingPlay', title: t('setting__play'), icon: 'play-circle-outline' },
        { id: 'SettingPlayDetail', title: t('setting__play_detail'), icon: 'album' },
        { id: 'SettingDesktopLyric', title: t('setting__desktop_lyric'), icon: 'lyrics' },
        { id: 'SettingSearch', title: t('setting__search'), icon: 'search' },
        { id: 'SettingList', title: t('setting__list'), icon: 'list-lines' },
        { id: 'SettingDownload', title: t('setting__download'), icon: 'download' },
        { id: 'SettingHotKey', title: t('setting__hot_key'), icon: 'lightning-bolt' },
        { id: 'SettingSync', title: t('setting__sync'), icon: 'loop' },
        { id: 'SettingOpenAPI', title: t('setting__open_api'), icon: 'share' },
        { id: 'SettingNetwork', title: t('setting__network'), icon: 'plex' },
        { id: 'SettingOdc', title: t('setting__odc'), icon: 'tune-variant' },
        { id: 'SettingBackup', title: t('setting__backup'), icon: 'window-restore' },
        { id: 'SettingOther', title: t('setting__other'), icon: 'more-h' },
        { id: 'SettingUpdate', title: t('setting__update'), icon: 'refresh' },
        { id: 'SettingAbout', title: t('setting__about'), icon: 'information-slab-circle-outline' },
      ]
    })

    const avtiveComponentName = ref(route.query.name && tocList.value.some(t => t.id == route.query.name)
      ? route.query.name
      : tocList.value[0].id)

    const toggleTab = id => {
      avtiveComponentName.value = id
      void nextTick(() => {
        dom_content_ref.value?.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
      })
    }

    return {
      tocList,
      avtiveComponentName,
      dom_content_ref,
      toggleTab,
      handleBack,
    }
  },
  // mounted() {
  //   this.initTOC()
  // },
  // methods: {
  //   initTOC() {
  //     const list = this.$refs.dom_setting_list.children
  //     const toc = []
  //     let prevTitle
  //     for (const item of list) {
  //       if (item.tagName == 'DT') {
  //         prevTitle = {
  //           title: item.innerText.replace(/[（(].+?[)）]/, ''),
  //           id: item.getAttribute('id'),
  //           dom: item,
  //           children: [],
  //         }
  //         toc.push(prevTitle)
  //         continue
  //       }
  //       const h3 = item.querySelector('h3')
  //       if (h3) {
  //         prevTitle.children.push({
  //           title: h3.innerText.replace(/[（(].+?[)）]/, ''),
  //           id: h3.getAttribute('id'),
  //           dom: h3,
  //         })
  //       }
  //     }
  //     console.log(toc)
  //     this.toc.list = toc
  //   },
  //   handleListScroll(event) {
  //     // console.log(event.target.scrollTop)
  //   },
  // },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  // 全屏覆盖整个应用视口（底部留出播放栏），不改变外层布局 → 进入/离开无跳动、无残留
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  // 播放栏已紧贴窗口底部（壳缝隙已去掉），这里只需让出播放栏本身的高度
  bottom: @height-player;
  // 层级契约：高于工具栏(40)；低于播放详情页(65)、teleport 弹层(70)、全局弹窗(99)
  // （在设置页打开播放详情时由详情页整页接管，关闭后回到设置页）
  z-index: 60;
  display: flex;
  flex-flow: row nowrap;
  overflow: hidden;
  // 设置页为功能性全屏页：使用「不透明」的浅灰底，白卡分组才浮得起来。
  // 原先 --color-main-background(90%) 之上再叠 --qm-surface(82%)，两层半透明
  // 会让底下的工具栏/首页文字透出形成「幽灵叠影」（截图中的左侧重影即由此而来）。
  // 深色主题下 --color-1000 为深色，混色后自然变深，无需额外适配。
  background-color: color-mix(in srgb, var(--color-primary-light-1000) 97%, var(--color-1000) 3%);
  animation: lxSettingIn 170ms ease-out both;
}

@keyframes lxSettingIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

// 顶部拖拽条（无边框窗口）
.dragBar {
  position: absolute;
  top: 0;
  left: 220px; // 避开左侧「返回」按钮
  right: 168px; // 避开右上角窗口控制按钮
  height: 48px;
  z-index: 1;
  -webkit-app-region: drag;
}

// 右上角窗口控制按钮（悬浮于内容之上）
.winControls {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 5;
  -webkit-app-region: no-drag;
}

.toc {
  flex: 0 0 224px;
  min-width: 200px;
  padding: 18px 14px 24px;
  border-right: 1px solid var(--qm-line-1);
  // 不再叠加第二层半透明面板：避免与整页底色叠加后出现内容穿透
  background-color: transparent;
  // 列表滚动到底部时渐隐，暗示还有分类
  mask-image: linear-gradient(to bottom, #000 calc(100% - 24px), transparent 100%);
}

// 分类列表：统一 36px 行高与 10px 圆角，形成规整的纵向节奏
.tocList {
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-0, 2px);
  padding: 0;
  margin: 0;
}

.tocHead {
  position: relative;
  z-index: 6; // 高于顶部拖拽条，保证「返回」可点击
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-4, 10px);
  padding: 2px 6px 14px;
  margin-bottom: var(--qm-sp-1, 4px);
}

.backBtn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--qm-sp-1, 4px);
  height: 28px;
  padding: 0 10px 0 6px;
  border: 0;
  border-radius: var(--qm-radius-btn, 8px);
  background: transparent;
  color: var(--qm-text-3);
  font-size: var(--qm-font-title-md, 13px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast);

  svg {
    display: block;
    transition: transform var(--qm-t-fast);
  }

  &:hover {
    background-color: var(--qm-hover);
    color: var(--qm-primary);

    // 返回箭头轻微左移，强化「回到上一级」的指向性
    svg { transform: translateX(-2px); }
  }
  &:focus-visible {
    box-shadow: var(--focus-ring, 0 0 0 3px rgba(0, 0, 0, .12));
  }
}

.pageTitle {
  margin: 0;
  padding-left: var(--qm-sp-2, 6px);
  font-size: var(--qm-fs-3xl, 20px);
  font-weight: var(--qm-fw-bold, 700);
  line-height: 26px;
  letter-spacing: var(--qm-tracking-tight, -0.01em);
  color: var(--qm-text-1);
}
.tocH2 {
  position: relative;
  font-size: var(--qm-font-title-md, 13px);
  font-weight: var(--qm-fw-medium, 500);
  line-height: 1;
  color: var(--qm-text-2);
  margin: 0;
  padding: 0 12px;
  // 36px 行高：满足可点击区域下限，同时保持列表紧凑
  height: 36px;
  border-radius: var(--qm-radius-card);
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  cursor: pointer;
  outline: none;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast);

  // 激活态左侧强调条：与全局「当前播放行」的标识语言保持一致
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 3px;
    height: 0;
    border-radius: 0 3px 3px 0;
    background-color: var(--qm-primary);
    transform: translateY(-50%);
    transition: height var(--qm-t-base);
  }

  &:not(.active) {
    &:hover {
      background-color: var(--qm-hover);
      color: var(--qm-text-1);
    }
  }
  &.active {
    color: var(--qm-primary);
    background-color: var(--qm-primary-soft);
    font-weight: var(--qm-fw-semibold, 600);

    &::before {
      height: 18px;
    }
  }
  &:focus-visible {
    box-shadow: var(--focus-ring, 0 0 0 3px rgba(0, 0, 0, .12));
  }
}
// 分类图标：作为扫视锚点，常态保持中性（不抢标题），hover/激活时才着主色
.tocIcon {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--qm-text-4);
  fill: currentColor;
  transition: color var(--qm-t-fast), transform var(--qm-t-fast);

  :global(.svg-icon) {
    width: var(--qm-icon-xs);
    height: var(--qm-icon-xs);
    fill: currentColor;
  }
}

.tocH2:not(.active):hover .tocIcon { color: var(--qm-text-3); }

.tocH2.active .tocIcon {
  color: var(--qm-primary);
  transform: scale(1.04);
}

.tocLabel {
  flex: auto;
  min-width: 0;
  .mixin-ellipsis-1();
}
// .tocH3 {
//   font-size: 13px;
//   opacity: .8;
// }

// .tocList {
//   .tocList {
//     // padding-left: 15px;
//   }
// }
// .tocSubListItem {
//   padding-top: 10px;
// }

.setting {
  padding: 26px 40px 56px;
  font-size: var(--qm-fs-md, 14px);
  box-sizing: border-box;
  overflow-y: auto;
  height: 100%;
  position: relative;
  width: 100%;

  // 内容居中限宽：大屏下不显得空散，普通窗口内充分利用空间
  > :global(dl) {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
  }

  // 切换分类时的内容淡入
  > .group {
    animation: groupIn 200ms var(--qm-ease, ease-out) both;
  }

  @keyframes groupIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  :global {
    // ===== 一级分组标题：左侧主色竖条 + 与内容拉开的留白 =====
    dt {
      position: relative;
      display: flex;
      align-items: center;
      padding: 0 0 0 14px;
      margin: 34px 0 12px;
      font-size: var(--qm-fs-lg, 15px);
      font-weight: var(--qm-fw-semibold, 600);
      line-height: var(--qm-leading-tight, 1.3);
      letter-spacing: var(--qm-tracking-tight, 0);
      color: var(--qm-text-1);

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        width: 3px;
        height: 15px;
        border-radius: var(--qm-radius-2xs, 4px);
        background-color: var(--qm-primary);
        transform: translateY(-50%);
      }

      &:first-child {
        margin-top: 0;
      }

      + dd h3 {
        margin-top: 0;
      }
    }

    // ===== 分组内容：白卡承载（描边为主、极淡阴影为辅，深浅主题都清晰） =====
    dd {
      margin: 0 0 10px;
      padding: 4px 18px 14px;
      border: 1px solid var(--qm-line-1);
      border-radius: var(--qm-radius-panel);
      background-color: var(--qm-card);
      box-shadow: var(--qm-shadow-1, 0 1px 2px rgba(0, 0, 0, .04));
      overflow: hidden;

      > div {
        padding: 0 4px;
      }
    }

    // ===== 二级标题：与上一组之间用发丝线分隔 =====
    h3 {
      font-size: var(--qm-font-title-md, 13px);
      font-weight: var(--qm-fw-semibold, 600);
      line-height: var(--qm-leading-tight, 1.3);
      margin: 20px 0 6px;
      color: var(--qm-text-1);

      &:not(:first-child) {
        border-top: 1px solid var(--qm-line-1);
        padding-top: 18px;
      }
    }

    // ===== 设置行：统一行高与悬停反馈 =====
    // .gap-top / .gap-left 是全局工具类（定义于 assets/styles/index.less），
    // 因此可在设置页内直接定制每一行的观感，无需改动各个 SettingXxx 组件
    dd > div > .gap-top {
      margin-top: var(--qm-sp-0, 2px);
      padding: 8px 10px;
      border-radius: var(--qm-radius-card);
      transition: background-color var(--qm-t-fast, 150ms ease);

      &:hover {
        background-color: var(--qm-hover, rgba(0, 0, 0, .04));
      }
    }

    // 行内多选项（窗口尺寸/字号/语言等）：压缩间距并允许换行
    dd > div > .gap-left {
      margin-top: var(--qm-sp-0, 2px);
      padding: 8px 10px;
      border-radius: var(--qm-radius-card);
      transition: background-color var(--qm-t-fast, 150ms ease);

      & + .gap-left {
        margin-left: var(--qm-sp-1, 4px);
      }

      &:hover {
        background-color: var(--qm-hover, rgba(0, 0, 0, .04));
      }
    }

    .p {
      display: flex;
      flex-flow: row wrap;
      align-items: center;
      gap: var(--qm-sp-4, 10px);
      padding: 10px 2px 2px;
      line-height: 1.45;
    }

    .help-btn {
      padding: 0;
      margin: 0 0.4em;
      border: none;
      background: none;
      color: var(--qm-primary);
      cursor: pointer;
      transition: color var(--qm-t-fast);
      &:hover {
        color: var(--qm-primary-hover);
      }
      &:focus-visible {
        outline: 2px solid var(--qm-primary);
        outline-offset: 2px;
        border-radius: var(--qm-radius-2xs, 4px);
      }
    }
    .help-icon {
      margin: 0 0.4em;
    }
  }
}

// .btn-content {
//   display: inline-block;
//   transition: @transition-theme;
//   transition-property: opacity, transform;
//   opacity: 1;
//   transform: scale(1);

//   &.hide {
//     opacity: 0;
//     transform: scale(0);
//   }
// }


// ============================================================
//  响应式
//  中等宽度：收窄导航、压缩内容留白
//  窄屏（移动端/小窗）：导航改为顶部横向分类条，内容全宽
// ============================================================
@media (max-width: 1100px) {
  .toc {
    flex: 0 0 200px;
    min-width: 176px;
  }

  .setting {
    padding: 22px 28px 48px;
  }
}

@media (max-width: 860px) {
  .main {
    flex-flow: column nowrap;
  }

  // 顶栏改为横向分类条后不再需要额外拖拽区
  .dragBar {
    display: none;
  }

  .toc {
    flex: none;
    width: 100%;
    min-width: 0;
    padding: 14px 14px 10px;
    border-right: 0;
    border-bottom: 1px solid var(--qm-line-1);
    mask-image: none;
    overflow-y: hidden;
  }

  .tocHead {
    flex-flow: row nowrap;
    align-items: center;
    gap: var(--qm-sp-5, 12px);
    padding: 0 2px 10px;
    margin-bottom: 0;
  }

  .pageTitle {
    padding-left: 0;
    font-size: var(--qm-fs-2xl, 18px);
    line-height: 24px;
  }

  .tocList {
    flex-flow: row nowrap;
    gap: var(--qm-sp-2, 6px);
    overflow-x: auto;
    overscroll-behavior-x: contain;
    padding-bottom: var(--qm-sp-0, 2px);

    &::-webkit-scrollbar {
      height: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: var(--qm-line-2);
      border-radius: var(--qm-radius-chip, 999px);
    }
  }

  .tocListItem {
    flex: none;
  }

  .tocH2 {
    height: 30px;
    padding: 0 12px;
    border-radius: var(--qm-radius-sm, 8px);

    &::before {
      display: none;
    }
  }

  .setting {
    padding: 18px 16px 40px;
  }

  .setting :global {
    dt {
      margin: 24px 0 10px;
    }

    dd {
      padding: 2px 14px 12px;
      border-radius: var(--qm-radius-panel);
    }
  }
}

@media (max-width: 560px) {
  .setting {
    padding: 14px 12px 36px;
  }

  .setting :global {
    dt {
      font-size: var(--qm-fs-md, 14px);
      padding-left: var(--qm-sp-5, 12px);
    }

    dd > div > .gap-top {
      padding: 8px 6px;
    }
  }
}

// :global(dt):target, :global(h3):target {
//   animation: highlight 1s ease;
// }

// @keyframes highlight {
//   from { background: yellow; }
//   to { background: transparent; }
// }

</style>

