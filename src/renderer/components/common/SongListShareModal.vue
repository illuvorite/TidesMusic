<template>
  <div v-if="visible" :class="$style.mask" @click="$emit('update:visible', false)">
    <div :class="$style.panel" @click.stop>
      <div :class="$style.header">
        <h3 :class="$style.title">分享歌单</h3>
        <button type="button" :class="$style.close" aria-label="关闭" @click="$emit('update:visible', false)">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div :class="$style.body">
        <p :class="$style.desc">{{ name }}</p>

        <!-- 链接生成中/失败时的状态提示 -->
        <div :class="$style.field">
          <input :class="$style.input" type="text" readonly :value="url" :placeholder="placeholder">
        </div>

        <p v-if="error" :class="$style.error">{{ error }}</p>

        <div :class="$style.actions">
          <button type="button" :class="$style.btn" :disabled="!url" @click="handleCopy">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
              <path d="M5 15V6a2 2 0 0 1 2-2h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            复制链接
          </button>
          <button type="button" :class="$style.btn" :disabled="!url" @click="handleOpen">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path d="M14 5h5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M19 5l-7.5 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <path d="M17 14v4.5A1.5 1.5 0 0 1 15.5 20h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            打开原页面
          </button>
        </div>

        <p :class="$style.tip">链接为该平台官方歌单页面，可在浏览器或对应 App 中打开</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick } from '@common/utils/vueTools'
import { openUrl, clipboardWriteText } from '@common/utils/electron'
import { dialog } from '@renderer/plugins/Dialog'
import musicSdk from '@renderer/utils/musicSdk'

const props = defineProps({
  visible: { type: Boolean, default: false },
  name: { type: String, default: '' },
  listId: { type: String, default: '' },
  source: { type: String, default: '' },
})
const emit = defineEmits(['update:visible'])

const url = ref('')
const error = ref('')

const close = () => { emit('update:visible', false) }

/**
 * 生成官方歌单链接。各平台的 songList.getDetailPageUrl 已实现，
 * 部分源需要异步解析真实 id（tx/wy 的 digest/短链），故统一 await。
 */
const loadUrl = async() => {
  url.value = ''
  error.value = ''
  const source = props.source as LX.OnlineSource
  if (!props.listId || !source) return
  try {
    const sdk = musicSdk[source]?.songList
    if (!sdk?.getDetailPageUrl) {
      error.value = '该平台暂不支持生成歌单链接'
      return
    }
    const link = await sdk.getDetailPageUrl(props.listId)
    if (link) url.value = link
    else error.value = '生成歌单链接失败'
  } catch (err) {
    console.error('build song list share url failed:', err)
    error.value = '生成歌单链接失败'
  }
}

watch(() => props.visible, (val) => {
  if (!val) return
  void nextTick(() => { void loadUrl() })
})

const handleCopy = () => {
  if (!url.value) return
  clipboardWriteText(url.value)
  // dialog 只有 dialog() / dialog.confirm 两种，不存在 dialog.alert
  void dialog('链接已复制到剪贴板')
  close()
}

const handleOpen = () => {
  if (!url.value) return
  void openUrl(url.value)
  close()
}

onBeforeUnmount(() => { url.value = '' })
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq.less';

.mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.35);
}

.panel {
  width: 400px;
  max-width: calc(100vw - 48px);
  border-radius: var(--qm-radius-panel, 12px);
  background-color: var(--qm-surface, #fff);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qm-s4, 12px);
  padding: 16px 18px;
  border-bottom: 1px solid var(--qm-line-1, rgba(0, 0, 0, 0.06));
}

.title {
  margin: 0;
  font-size: var(--qm-font-title, 16px);
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--qm-text-1, #222);
}

.close {
  border: 0;
  background: none;
  padding: 4px;
  cursor: pointer;
  color: var(--qm-text-3, #888);
  display: inline-flex;
  border-radius: var(--qm-radius-sm, 8px);
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast);

  &:hover {
    background-color: var(--qm-hover, rgba(0, 0, 0, 0.05));
    color: var(--qm-text-1, #222);
  }
}

.body {
  padding: 18px;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-s4, 12px);
}

.desc {
  margin: 0;
  font-size: var(--qm-font-body, 14px);
  color: var(--qm-text-1, #222);
  word-break: break-all;
  .mixin-ellipsis(2);
}

.field { display: flex; }

.input {
  flex: auto;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border-radius: var(--qm-radius-sm, 8px);
  border: 1px solid var(--qm-line-1, rgba(0, 0, 0, 0.12));
  background-color: var(--qm-card, #f7f7f7);
  color: var(--qm-text-2, #555);
  font-size: var(--qm-font-meta, 12px);
}

.error {
  margin: 0;
  font-size: var(--qm-font-meta, 12px);
  color: #e04b4b;
}

.actions {
  display: flex;
  gap: var(--qm-s3, 8px);
}

.btn {
  .qm-btn-ghost();
  display: inline-flex;
  align-items: center;
  gap: var(--qm-sp-1, 4px);

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.tip {
  margin: 0;
  font-size: var(--qm-font-aux, 11px);
  color: var(--qm-text-4, #999);
  line-height: 1.5;
}
</style>
