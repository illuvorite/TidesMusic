<template>
  <div :class="[$style.toolbar, { [$style.fullscreen]: isFullscreen }]">
    <!-- 左：后退/前进/刷新 -->
    <div :class="$style.navGroup">
      <button
        type="button" :class="$style.navBtn" :disabled="!canBack"
        :aria-label="$t('back')" ignore-tip
        @click="goBack"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M15 4.8 8.2 12 15 19.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button
        type="button" :class="$style.navBtn" :disabled="!canForward"
        :aria-label="$t('forward')" ignore-tip
        @click="goForward"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M9 4.8 15.8 12 9 19.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button
        type="button" :class="$style.navBtn"
        :aria-label="$t('refresh')" ignore-tip
        @click="reload"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M23 4v6h-6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <!-- 中：搜索 + 两个绿色入口 -->
    <div :class="$style.center">
      <div :class="$style.searchWrap">
        <SearchInput />
      </div>
      <button type="button" :class="$style.greenBtn" aria-label="正在播放" title="正在播放" ignore-tip @click="goPlaying">
        <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
          <circle cx="11" cy="12.5" r="8.4" fill="none" stroke="#C9C9C9" stroke-width="1.2" />
          <circle cx="10.4" cy="13" r="4.4" fill="var(--home-green)" />
          <circle cx="10.4" cy="13" r="1.05" fill="#fff" />
          <path d="M15.6 9.4V4.2h4.6v4.2z" fill="var(--home-green)" />
        </svg>
      </button>
      <button type="button" :class="$style.greenBtn" aria-label="免费音源" title="免费音源" ignore-tip @click="goFreeSource">
        <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
          <circle cx="12" cy="12" r="8.8" fill="none" stroke="#C9C9C9" stroke-width="1.2" />
          <text x="12" y="16.2" text-anchor="middle" font-size="11" font-weight="600" fill="var(--home-green)">免</text>
        </svg>
      </button>
    </div>

    <!-- 右：窗口按钮 -->
    <div :class="$style.right">
      <ControlBtns v-if="appSetting['common.controlBtnPosition'] != 'left'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { isFullscreen } from '@renderer/store'
import { appSetting } from '@renderer/store/setting'
import { triggerRouteReload } from '@renderer/store/navigation'
import { setShowPlayerDetail } from '@renderer/store/player/action'
import SearchInput from './SearchInput.vue'
import ControlBtns from './ControlBtns.vue'

const router = useRouter()

// 应用层导航历史栈：用于回退/前进按钮
// 栈中每个元素是路由 fullPath；historyIndex 指向当前位置
const historyStack = ref<string[]>([])
const historyIndex = ref(-1)
let unregisterAfterEach: (() => void) | null = null

// 由「后退/前进」按钮发起的导航：只在栈内移动指针，不新增记录
let isHistoryNav = false
const HISTORY_LIMIT = 100

const recordRoute = (fullPath: string) => {
  const stack = historyStack.value
  if (isHistoryNav) {
    const idx = stack.indexOf(fullPath)
    if (idx !== -1) historyIndex.value = idx
    return
  }
  // 用户主动导航：与当前记录相同则忽略（如刷新），否则截断前进记录后追加
  if (stack[historyIndex.value] === fullPath) return
  stack.splice(historyIndex.value + 1)
  stack.push(fullPath)
  if (stack.length > HISTORY_LIMIT) stack.shift()
  historyIndex.value = stack.length - 1
}

onMounted(() => {
  // 初始化：当前路由作为起点
  recordRoute(router.currentRoute.value.fullPath)
  unregisterAfterEach = router.afterEach((to) => {
    recordRoute(to.fullPath)
  })
})
onBeforeUnmount(() => {
  unregisterAfterEach?.()
  unregisterAfterEach = null
})

const canBack = computed(() => historyIndex.value > 0)
const canForward = computed(() => historyIndex.value >= 0 && historyIndex.value < historyStack.value.length - 1)

const goBack = () => {
  if (!canBack.value) return
  const target = historyStack.value[historyIndex.value - 1]
  isHistoryNav = true
  void router.push(target).catch(() => {}).finally(() => { isHistoryNav = false })
}
const goForward = () => {
  if (!canForward.value) return
  const target = historyStack.value[historyIndex.value + 1]
  isHistoryNav = true
  void router.push(target).catch(() => {}).finally(() => { isHistoryNav = false })
}
const reload = () => {
  triggerRouteReload()
}
// 绿色入口：正在播放（打开播放详情页）
const goPlaying = () => {
  setShowPlayerDetail(true)
}
// 绿色入口：免费音源说明
const goFreeSource = () => {
  void router.push('/songList/list').catch(() => {})
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/home-tokens.less';

.toolbar {
  flex: none;
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 7px 0 28px;
  -webkit-app-region: drag;
  background-color: transparent;
  user-select: none;
  // 让搜索下拉浮层盖在页面内容之上
  position: relative;
  z-index: 40;

  &.fullscreen {
    -webkit-app-region: no-drag;
  }

  * {
    -webkit-app-region: no-drag;
  }
}

// ---------- 导航按钮组 ----------
.navGroup {
  flex: none;
  display: flex;
  align-items: center;
  gap: 3px;
}

.navBtn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--qm-radius-sm, 8px);
  background: transparent;
  color: rgb(110, 110, 110);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);

  &:hover:not(:disabled) {
    background-color: var(--home-hover-bg);
    color: var(--home-text-strong);
  }
  &:active:not(:disabled) { transform: scale(0.94); }
  &:disabled {
    color: rgb(180, 180, 180);
    cursor: default;
  }
  svg { display: block; }
}

// ---------- 搜索 + 绿色入口 ----------
.center {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-8, 20px);
  margin-left: var(--qm-sp-8, 20px);
}

.searchWrap {
  flex: none;
  width: 227px;
}

.greenBtn {
  flex: none;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: transform var(--transition-fast), opacity var(--transition-fast);

  svg { display: block; }
  &:hover { opacity: 0.82; }
  &:active { transform: scale(0.92); }
}

// ---------- 窗口按钮组 ----------
.right {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
}
</style>
