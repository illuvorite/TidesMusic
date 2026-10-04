<template>
  <div v-if="localMusicEditInfo.visible && current" :class="$style.mask" @click="handleClose">
    <div :class="$style.panel" @click.stop>
      <div :class="$style.header">
        <h3 :class="$style.title">{{ $t('local_library__edit_info') }}</h3>
        <button type="button" :class="$style.close" :aria-label="$t('close')" @click="handleClose">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div :class="$style.body">
        <label :class="$style.field">
          <span :class="$style.label">{{ $t('player__music_name') }}</span>
          <base-input
            v-model="form.name"
            :placeholder="origin.name || $t('local_library__edit_placeholder')"
            :class="$style.fieldInput"
            @submit="handleSave"
          />
        </label>

        <label :class="$style.field">
          <span :class="$style.label">{{ $t('player__music_singer') }}</span>
          <base-input
            v-model="form.singer"
            :placeholder="origin.singer || $t('local_library__edit_placeholder')"
            :class="$style.fieldInput"
            @submit="handleSave"
          />
        </label>

        <label :class="$style.field">
          <span :class="$style.label">{{ $t('player__music_album') }}</span>
          <base-input
            v-model="form.albumName"
            :placeholder="origin.albumName || $t('local_library__edit_placeholder')"
            :class="$style.fieldInput"
            @submit="handleSave"
          />
        </label>

        <!-- 说清边界：改的是应用内显示值，不动音频文件本身 -->
        <p :class="$style.tip">{{ $t('local_library__edit_tip') }}</p>
        <p v-if="filePath" :class="$style.path" :title="filePath">{{ filePath }}</p>
      </div>

      <div :class="$style.footer">
        <button
          v-if="hasOverride"
          type="button" :class="$style.btnGhost"
          @click="handleReset"
        >
          {{ $t('local_library__edit_reset') }}
        </button>
        <span :class="$style.spacer" />
        <button type="button" :class="$style.btnGhost" @click="handleClose">
          {{ $t('btn_cancel') }}
        </button>
        <button type="button" :class="$style.btnPrimary" @click="handleSave">
          {{ $t('btn_save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from '@common/utils/vueTools'
import { localMusicEditInfo, hideLocalMusicEdit } from '@renderer/store/localLibraryModal'
import { localMusicOverrides, setLocalMusicOverride, resetLocalMusicOverride } from '@renderer/store/localLibrary'
import { registerModalCloser } from '@renderer/utils/modalStack'

const current = computed(() => localMusicEditInfo.musicInfo)

const form = reactive({
  name: '',
  singer: '',
  albumName: '',
})

/**
 * 文件里读出来的原始值（占位提示用）。
 * 输入框留空就等于「沿用文件里的值」，所以要把原值展示成 placeholder，
 * 否则用户删掉内容后完全看不到原来是什么。
 */
const origin = ref({ name: '', singer: '', albumName: '' })
const filePath = ref('')
const hasOverride = ref(false)

const syncFromSong = () => {
  const info = current.value
  if (!info) return
  const override = localMusicOverrides[info.id] ?? {}
  origin.value = {
    name: info.name ?? '',
    singer: info.singer ?? '',
    albumName: info.meta?.albumName ?? '',
  }
  // 表单初值取「当前生效值」= 覆盖优先，没有覆盖就是文件原值
  form.name = override.name ?? info.name ?? ''
  form.singer = override.singer ?? info.singer ?? ''
  form.albumName = override.albumName ?? info.meta?.albumName ?? ''
  filePath.value = info.meta?.filePath ?? ''
  hasOverride.value = info.id in localMusicOverrides
}

watch(() => localMusicEditInfo.visible, (visible) => {
  if (visible) syncFromSong()
}, { immediate: true })

const handleClose = () => {
  hideLocalMusicEdit()
}

const handleSave = () => {
  const info = current.value
  if (!info) return
  // 全空等价于「全部恢复默认」，交给 store 统一处理
  setLocalMusicOverride(info.id, {
    name: form.name,
    singer: form.singer,
    albumName: form.albumName,
  })
  hideLocalMusicEdit()
}

const handleReset = () => {
  const info = current.value
  if (!info) return
  resetLocalMusicOverride(info.id)
  hideLocalMusicEdit()
}

// Esc 关弹层：交给统一的弹层栈，避免又是「漏绑一个就关不掉」
const off = registerModalCloser(() => {
  if (!localMusicEditInfo.visible) return false
  handleClose()
  return true
})
onBeforeUnmount(off)
</script>

<style lang="less" module>
.mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, .45);
}

.panel {
  width: 440px;
  max-width: calc(100vw - 80px);
  display: flex;
  flex-direction: column;
  background-color: var(--qm-surface, #fff);
  border-radius: var(--qm-radius-card, 12px);
  box-shadow: var(--qm-shadow-3, 0 12px 32px rgba(0, 0, 0, .18));
  overflow: hidden;
}

.header {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  padding: 14px 12px 12px 18px;
  border-bottom: 1px solid var(--qm-line-1);
}

.title {
  flex: auto;
  min-width: 0;
  margin: 0;
  font-size: var(--qm-fs-lg, 16px);
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
}

.close {
  flex: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: none;
  color: var(--qm-text-3);

  &:hover {
    background-color: var(--qm-hover);
    color: var(--qm-text-1);
  }
}

.body {
  flex: auto;
  min-height: 0;
  padding: 16px 18px 4px;
}

.field {
  display: block;
  margin-bottom: 14px;
}

.label {
  display: block;
  margin-bottom: 6px;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
}

// base-input 自身是 inline-block，这里让它撑满整行
.fieldInput {
  display: block;
  width: 100%;
  box-sizing: border-box;
}

.tip {
  margin: 2px 0 0;
  font-size: var(--qm-fs-xs, 12px);
  line-height: 1.6;
  color: var(--qm-text-5);
}

.path {
  margin: 6px 0 0;
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  direction: rtl; // 长路径优先保留文件名所在的后半段
  text-align: left;
}

.footer {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  padding: 14px 18px 16px;
}

.spacer {
  flex: auto;
}

.btnPrimary,
.btnGhost {
  padding: 6px 18px;
  border-radius: var(--qm-radius-chip, 999px);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast), border-color var(--qm-t-fast);
}

.btnPrimary {
  border: 1px solid var(--qm-primary);
  background-color: var(--qm-primary);
  color: var(--qm-text-invert);

  &:hover { background-color: var(--qm-primary-hover); border-color: var(--qm-primary-hover); }
}

.btnGhost {
  border: 1px solid var(--qm-line-2);
  background-color: transparent;
  color: var(--qm-text-3);

  &:hover { background-color: var(--qm-hover); color: var(--qm-text-1); }
}
</style>
