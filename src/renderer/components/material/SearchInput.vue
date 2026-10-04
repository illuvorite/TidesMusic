<template>
  <div :class="$style.container">
    <div :class="[$style.search, { [$style.active]: focus }, { [$style.big]: big }, { [$style.small]: small }]">
      <div :class="$style.form">
        <!-- 搜索源切换：左侧圆形徽标 + 弹出菜单（对齐官网搜索框） -->
        <button
          type="button" :class="$style.sourceBtn"
          :aria-label="$t('music_source')" ignore-tip
          @click.stop="toggleSourceMenu"
        >
          <span :class="$style.sourceBadge" :style="currentSource.icon ? null : { backgroundColor: currentSource.color }">
            <img v-if="currentSource.icon" :class="$style.sourceIcon" :src="currentSource.icon" alt="" @error="markIconBroken(currentSource.id)">
            <template v-else>{{ currentSource.badge }}</template>
          </span>
        </button>
        <input
          ref="dom_input"
          v-model.trim="text"
          :placeholder="placeholder"
          @focus="handleFocus"
          @blur="handleBlur"
          @input="$emit('update:modelValue', text)"
          @change="sendEvent('change')"
          @keyup.enter="handleSearch"
          @keydown.arrow-down.arrow-up.prevent
          @keyup.arrow-down.prevent="handleKeyDown"
          @keyup.arrow-up.prevent="handleKeyUp"
          @contextmenu="handleContextMenu"
        >
        <transition enter-active-class="animated zoomIn" leave-active-class="animated zoomOut">
          <button v-show="text" type="button" :class="$style.clearBtn" :aria-label="$t('close')" ignore-tip @click="handleClearList">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="currentColor" />
              <path d="M8.8 8.8 15.2 15.2M15.2 8.8 8.8 15.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </transition>
      </div>
      <!-- 两列下拉面板：热门搜索 + 搜索历史（输入为空时展示） -->
      <div v-if="showPanel" :class="$style.panel">
        <div :class="[$style.panelCol, $style.panelColHot]">
          <header :class="$style.panelHead">
            <span>{{ $t('search__hot_search') }}</span>
          </header>
          <ul :class="$style.panelList" @mouseleave="selectIndex = -1">
            <li v-for="(item, index) in hotList" :key="`hot-${index}`" @click="handlePanelSearch(item.name)">
              <span :class="$style.panelName" :title="item.name">{{ item.name }}</span>
              <span v-if="item.hot" :class="$style.panelHot">{{ formatHot(item.hot) }}</span>
            </li>
          </ul>
        </div>
        <div :class="$style.panelCol">
          <header :class="$style.panelHead">
            <span>{{ $t('search__history_title') }}</span>
            <button
              v-if="historyList.length" type="button" :class="$style.panelClear"
              :aria-label="$t('history_clear')" @click="handleClearHistory"
            >{{ $t('search__clear') }}</button>
          </header>
          <ul :class="$style.panelList">
            <li v-for="(item, index) in historyList" :key="`his-${index}`" @click="handlePanelSearch(item)">
              <span :class="$style.panelName" :title="item">{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- 搜索源菜单 -->
      <div v-if="sourceMenuVisible" :class="$style.sourceMenu">
        <button
          v-for="item in sourceOptions" :key="item.id" type="button"
          :class="[$style.sourceItem, { [$style.sourceItemActive]: item.id === source }]"
          @click="handleSelectSource(item.id)"
        >
          <span :class="$style.sourceBadgeSm" :style="item.icon ? null : { backgroundColor: item.color }">
            <img v-if="item.icon" :class="$style.sourceIcon" :src="item.icon" alt="" @error="markIconBroken(item.id)">
            <template v-else>{{ item.badge }}</template>
          </span>
          <span :class="$style.sourceItemName">{{ item.name }}</span>
        </button>
      </div>

      <div v-if="list && !showPanel" :class="$style.list" :style="listStyle">
        <ul ref="dom_list" @mouseleave="selectIndex = -1">
          <li
            v-for="(item, index) in list"
            :key="item"
            :class="{[$style.select]: selectIndex === index }"
            @mouseenter="selectIndex = index"
            @click="handleTemplistClick(index)"
          >
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { clipboardReadText } from '@common/utils/electron'
import { HOTKEY_COMMON } from '@common/hotKey'
import { appSetting } from '@renderer/store/setting'
// 各平台官方图标（取自各平台官网 / 移动端的官方资源）
import kgIcon from '@renderer/assets/images/music-source/kg.png'
import kwIcon from '@renderer/assets/images/music-source/kw.png'
import mgIcon from '@renderer/assets/images/music-source/mg.png'
import txIcon from '@renderer/assets/images/music-source/tx.svg'
import wyIcon from '@renderer/assets/images/music-source/wy.png'

// 搜索源徽标：优先显示各平台官方图标；「聚合搜索」不是具体平台，仍用色块 + 字符表达；
// 图标缺失或加载失败时回退为色块 + 字符（badge / color 即回退样式）
const SOURCE_BADGE = {
  all: { badge: '聚', color: '#31C27C', icon: '' },
  kw: { badge: 'K', color: '#FFA800', icon: kwIcon },
  kg: { badge: 'K', color: '#3E9BFF', icon: kgIcon },
  tx: { badge: 'Q', color: '#12B7F5', icon: txIcon },
  wy: { badge: 'W', color: '#E8453C', icon: wyIcon },
  mg: { badge: 'M', color: '#FF6B4A', icon: mgIcon },
}

export default {
  props: {
    placeholder: {
      type: String,
      default: '搜索音乐',
    },
    list: {
      type: Array,
      default() {
        return []
      },
    },
    visibleList: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: String,
      default: '',
    },
    big: {
      type: Boolean,
      default: false,
    },
    small: {
      type: Boolean,
      default: false,
    },
    // 启用两列下拉面板（热门搜索 + 搜索历史）：输入为空且聚焦时展示，替代默认的联想列表
    panel: {
      type: Boolean,
      default: false,
    },
    // 热门搜索：[{ name, hot }]
    hotList: {
      type: Array,
      default() {
        return []
      },
    },
    // 搜索历史：字符串数组
    historyList: {
      type: Array,
      default() {
        return []
      },
    },
    // 搜索源列表：[{ id, name }]（含 'all' 聚合搜索）
    sourceList: {
      type: Array,
      default() {
        return []
      },
    },
    // 当前搜索源 id
    source: {
      type: String,
      default: 'all',
    },
  },
  emits: ['update:modelValue', 'event', 'change-source'],
  data() {
    return {
      isShow: false,
      text: '',
      selectIndex: -1,
      focus: false,
      sourceMenuVisible: false,
      // 记录图标加载失败的源 id：回退为色块 + 字符
      brokenIcons: {},
      listStyle: {
        height: 0,
      },
    }
  },
  computed: {
    showPanel() {
      return this.panel && this.focus && !this.text && (this.hotList.length > 0 || this.historyList.length > 0)
    },
    sourceOptions() {
      return this.sourceList.map(item => {
        const meta = SOURCE_BADGE[item.id] ?? { badge: String(item.name ?? '?').slice(0, 1), color: '#8A8A8A', icon: '' }
        return {
          ...item,
          badge: meta.badge,
          color: meta.color,
          // 图标加载失败的源按「无图标」处理，避免显示破图
          icon: this.brokenIcons[item.id] ? '' : meta.icon,
        }
      })
    },
    currentSource() {
      return this.sourceOptions.find(item => item.id === this.source) ?? { badge: '聚', color: '#31C27C', icon: '' }
    },
  },
  watch: {
    list(n) {
      if (!this.visibleList) return
      if (this.selectIndex > -1) this.selectIndex = -1
      this.$nextTick(() => {
        this.listStyle.height = this.$refs.dom_list.scrollHeight + 'px'
      })
    },
    modelValue(n) {
      this.text = n
    },
    visibleList(n) {
      n ? this.showList() : this.hideList()
    },
  },
  mounted() {
    if (appSetting['search.isFocusSearchBox']) this.handleFocusInput()
    this.handleRegisterEvent('on')
    document.addEventListener('click', this.handleDocClick)
  },
  beforeUnmount() {
    this.handleRegisterEvent('off')
    document.removeEventListener('click', this.handleDocClick)
  },
  methods: {
    // 图标加载失败（资源缺失等）：记录后回退为色块 + 字符
    markIconBroken(id) {
      if (id) this.brokenIcons = { ...this.brokenIcons, [id]: true }
    },
    handleRegisterEvent(action) {
      let eventHub = window.key_event
      let name = action == 'on' ? 'on' : 'off'
      // eslint-disable-next-line @typescript-eslint/unbound-method
      eventHub[name](HOTKEY_COMMON.focusSearchInput.action, this.handleFocusInput)
    },
    handleFocusInput() {
      this.$refs.dom_input.focus()
    },
    handleTemplistClick(index) {
      console.log(index)
      this.sendEvent('listClick', index)
    },
    handleFocus() {
      this.focus = true
      this.sendEvent('focus')
    },
    handleBlur() {
      setTimeout(() => {
        this.focus = false
        this.sendEvent('blur')
      }, 80)
    },
    handleSearch() {
      this.hideList()
      if (this.selectIndex < 0) {
        this.sendEvent('submit')
        return
      }
      this.sendEvent('listClick', this.selectIndex)
    },
    showList() {
      this.isShow = true
      this.listStyle.height = this.$refs.dom_list.scrollHeight + 'px'
    },
    hideList() {
      this.isShow = false
      this.listStyle.height = 0
      this.$nextTick(() => {
        this.selectIndex = -1
      })
    },
    sendEvent(action, data) {
      this.$emit('event', {
        action,
        data,
      })
    },
    handleKeyDown() {
      if (this.list.length) {
        this.selectIndex = this.selectIndex + 1 < this.list.length ? this.selectIndex + 1 : 0
      } else if (this.selectIndex > -1) {
        this.selectIndex = -1
      }
    },
    handleKeyUp() {
      if (this.list.length) {
        this.selectIndex = this.selectIndex - 1 < -1 ? this.list.length - 1 : this.selectIndex - 1
      } else if (this.selectIndex > -1) {
        this.selectIndex = -1
      }
    },
    handleContextMenu() {
      let str = clipboardReadText()
      str = str.trim()
      str = str.replace(/\t|\r\n|\n|\r/g, ' ')
      str = str.replace(/\s+/g, ' ')
      let dom_input = this.$refs.dom_input
      this.text = this.text.substring(0, dom_input.selectionStart) + str + this.text.substring(dom_input.selectionEnd, this.text.length)
      this.$emit('update:modelValue', this.text)
    },
    handleClearList() {
      this.text = ''
      this.$emit('update:modelValue', this.text)
      this.sendEvent('submit')
    },
    handlePanelSearch(text) {
      if (!text) return
      this.text = text
      this.$emit('update:modelValue', text)
      this.sendEvent('submit')
    },
    handleClearHistory() {
      this.sendEvent('clearHistory')
    },
    toggleSourceMenu() {
      this.sourceMenuVisible = !this.sourceMenuVisible
    },
    handleSelectSource(id) {
      this.sourceMenuVisible = false
      if (id === this.source) return
      this.$emit('change-source', id)
    },
    // 点击页面其它地方收起源菜单（按钮自身已 stop 冒泡）
    handleDocClick() {
      if (this.sourceMenuVisible) this.sourceMenuVisible = false
    },
    // 热搜热度：≥1 亿 → x.x亿；≥1 万 → 取整万；否则原样
    formatHot(num) {
      if (num >= 100000000) return `${(num / 100000000).toFixed(1)}亿`
      if (num >= 10000) return `${Math.round(num / 10000)}万`
      return String(num)
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

// 胶囊搜索框（按设计稿：227 × 31，底 #E0E0E0，放大镜在左）
.container {
  position: relative;
  width: 227px;
  height: 31px;
  -webkit-app-region: no-drag;
}

// 注意：聚焦光圈只能画在 31px 的胶囊上（.form），
// 否则下拉展开后容器变高，光圈会跟着变成一整圈巨大的绿色圆弧
.search {
  position: absolute;
  width: 100%;
  z-index: 30;

  .form {
    display: flex;
    align-items: center;
    height: 31px;
    padding: 0 9px 0 11px;
    border-radius: var(--qm-radius-chip, 999px);
    background-color: var(--qm-field, rgba(0, 0, 0, .08));
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .04);
    transition: background-color var(--transition-base), box-shadow var(--transition-base);

    &:hover {
      background-color: rgba(0, 0, 0, .1);
    }

    input {
      flex: auto;
      min-width: 0;
      height: 100%;
      padding: 0 6px 0 8px;
      border: none;
      outline: none;
      background-color: transparent;
      color: var(--qm-text-2, rgb(74, 74, 74));
      font-size: var(--qm-fs-md, 14px);
      overflow: hidden;

      &::placeholder {
        color: rgb(166, 166, 166);
        font-size: var(--qm-fs-md, 14px);
      }
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: none;
      outline: none;
      background-color: transparent;
      cursor: pointer;
      transition: color var(--transition-fast), opacity var(--transition-fast);
    }

    .sourceBtn {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      transition: transform var(--transition-fast);

      &:hover { transform: scale(1.08); }
    }

    .sourceBadge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      overflow: hidden;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
    }

    .clearBtn {
      flex: none;
      width: 16px;
      height: 16px;
      margin-left: var(--qm-sp-2, 6px);
      border-radius: 50%;
      color: rgb(198, 198, 198);
      transition: color var(--transition-fast), background-color var(--transition-fast), transform var(--transition-fast);

      &:hover {
        color: var(--qm-primary);
        background-color: var(--qm-primary-soft);
        transform: scale(1.06);
      }
    }
  }

  // 聚焦态：胶囊白底 + 主色光圈
  &.active .form {
    background-color: var(--qm-card, #fff);
    box-shadow: 0 0 0 2px var(--qm-primary), 0 6px 18px rgba(0, 0, 0, .08);
  }

  // 搜索源菜单（点击搜索框左侧徽标弹出）
  .sourceMenu {
    position: absolute;
    top: 35px;
    left: 0;
    z-index: 32;
    min-width: 158px;
    padding: var(--qm-sp-2, 6px);
    border-radius: var(--qm-radius-card);
    background-color: var(--qm-card);
    box-shadow: 0 12px 32px rgba(0, 0, 0, .16), 0 0 0 1px rgba(0, 0, 0, .04);
  }

  .sourceItem {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    gap: var(--qm-sp-4, 10px);
    width: 100%;
    height: 38px;
    padding: 0 var(--qm-sp-4, 10px);
    border: 0;
    border-radius: var(--qm-radius-sm, 8px);
    background-color: transparent;
    font-size: var(--qm-fs-md, 14px);
    color: var(--qm-text-1);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--qm-t-fast), color var(--qm-t-fast);

    &:hover { background-color: var(--qm-hover); }
  }

  .sourceItemActive {
    background-color: var(--qm-primary-soft);
    color: var(--qm-primary);
    font-weight: var(--qm-fw-semibold, 600);

    &:hover { background-color: var(--qm-primary-soft-hover); }
  }

  .sourceBadgeSm {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    overflow: hidden;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
  }

  // 平台官方图标：铺满圆形徽标
  .sourceIcon {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .sourceItemName {
    flex: auto;
    min-width: 0;
    .mixin-ellipsis-1();
  }

  // 两列下拉面板（热门搜索 / 搜索历史）：与搜索框左对齐、顶部贴合，宽度按设计稿约为搜索框的 2.3 倍
  .panel {
    position: absolute;
    top: 35px;
    left: 0;
    z-index: 31;
    display: flex;
    flex-flow: row nowrap;
    width: 520px;
    max-height: min(420px, calc(100vh - 140px));
    border-radius: var(--qm-radius-panel);
    background-color: var(--qm-card);
    box-shadow: 0 12px 32px rgba(0, 0, 0, .16), 0 0 0 1px rgba(0, 0, 0, .04);
    overflow: hidden;
  }

  .panelCol {
    display: flex;
    flex-flow: column nowrap;
    min-height: 0;

    &:last-child {
      flex: auto;
      min-width: 0;
    }
  }

  .panelColHot {
    flex: none;
    width: 296px;
    border-right: 1px solid var(--qm-line-1);
  }

  .panelHead {
    flex: none;
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--qm-sp-3, 8px);
    height: 38px;
    padding: 0 var(--qm-sp-5, 12px);
    font-size: var(--qm-fs-sm, 13px);
    color: var(--qm-text-4);
  }

  .panelClear {
    padding: 0;
    border: 0;
    background: none;
    font-size: var(--qm-fs-xs, 12px);
    color: var(--qm-text-4);
    cursor: pointer;
    transition: color var(--qm-t-fast);

    &:hover { color: var(--qm-primary); }
  }

  .panelList {
    flex: auto;
    min-height: 0;
    overflow-y: auto;
    padding: 0 var(--qm-sp-2, 6px) var(--qm-sp-2, 6px);
    margin: 0;
    list-style: none;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, .12);
      border-radius: var(--qm-radius-chip, 999px);
    }

    li {
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      gap: var(--qm-sp-3, 8px);
      height: 32px;
      padding: 0 var(--qm-sp-4, 10px);
      border-radius: var(--qm-radius-sm, 8px);
      font-size: var(--qm-fs-sm, 13px);
      color: var(--qm-text-2);
      cursor: pointer;
      transition: background-color var(--qm-t-fast), color var(--qm-t-fast);

      &:hover {
        background-color: var(--qm-hover);
        color: var(--qm-text-1);
      }
    }
  }

  .panelName {
    flex: auto;
    min-width: 0;
    .mixin-ellipsis-1();
  }

  .panelHot {
    flex: none;
    font-size: var(--qm-fs-xs, 12px);
    color: var(--qm-text-4);
    font-variant-numeric: tabular-nums;
  }

  .list {
    position: absolute;
    top: 39px;
    left: 0;
    width: 280px;
    font-size: var(--qm-fs-sm, 13px);
    height: 0;
    padding: 0;
    transition: height 200ms var(--ease-out);
    transition-property: height;
    overflow: hidden;
    border-radius: var(--qm-radius-panel);
    background-color: var(--qm-card);
    box-shadow: 0 12px 32px rgba(0, 0, 0, .16), 0 0 0 1px rgba(0, 0, 0, .04);

    ul {
      max-height: 320px;
      overflow-y: auto;
      padding: var(--qm-sp-2, 6px);
      box-sizing: border-box;

      &::-webkit-scrollbar { width: 6px; }
      &::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, .12);
        border-radius: var(--qm-radius-chip, 999px);
      }
    }

    li {
      position: relative;
      display: flex;
      align-items: center;
      height: 32px;
      padding: 0 10px 0 28px;
      border-radius: var(--qm-radius-sm, 8px);
      cursor: pointer;
      color: var(--qm-text-2, rgb(51, 51, 51));
      transition: background-color var(--transition-fast), color var(--transition-fast);

      // 左侧放大镜图标
      &::before {
        content: '';
        position: absolute;
        left: 9px;
        top: 50%;
        width: 12px;
        height: 12px;
        margin-top: -6px;
        background-color: currentColor;
        opacity: .45;
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10.6 4.9a5.7 5.7 0 1 0 3.2 10.4l3.9 3.9 1.4-1.4-3.9-3.9A5.7 5.7 0 0 0 10.6 4.9zm0 2a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4z'/%3E%3C/svg%3E") center/contain no-repeat;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10.6 4.9a5.7 5.7 0 1 0 3.2 10.4l3.9 3.9 1.4-1.4-3.9-3.9A5.7 5.7 0 0 0 10.6 4.9zm0 2a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4z'/%3E%3C/svg%3E") center/contain no-repeat;
      }

      span {
        min-width: 0;
        line-height: 1.3;
        .mixin-ellipsis-1();
      }

      &:hover {
        background-color: var(--qm-hover, rgba(0, 0, 0, .05));
      }

      &.select {
        background-color: var(--qm-primary-soft, rgba(49, 194, 124, .12));
        color: var(--qm-primary, rgb(49, 194, 124));
        font-weight: var(--qm-fw-semibold, 600);

        &::before { opacity: .9; }
      }
    }
  }
}

.big {
  width: 100%;
}
</style>
