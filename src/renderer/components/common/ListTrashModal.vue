<template>
  <div v-if="listTrashModalVisible" :class="$style.mask" @click="handleClose">
    <div :class="$style.panel" @click.stop>
      <div :class="$style.header">
        <h3 :class="$style.title">{{ $t('list_trash__title') }}</h3>
        <button type="button" :class="$style.close" :aria-label="$t('close')" @click="handleClose">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <common-empty-state
        v-if="!listTrashItems.length"
        icon="trash"
        :title="$t('list_trash__empty')"
        :description="$t('list_trash__empty_desc')"
      />

      <ul v-else :class="$style.list">
        <li v-for="item in listTrashItems" :key="item.id" :class="$style.item">
          <div :class="$style.info">
            <span :class="$style.name" :title="item.name">{{ item.name }}</span>
            <span :class="$style.meta">
              {{ $t('list_trash__count', { num: item.count }) }} · {{ $t('list_trash__deleted_at', { time: formatTime(item.deletedAt) }) }}
            </span>
          </div>
          <div :class="$style.actions">
            <button type="button" :class="$style.btnGhost" @click="handleRestore(item)">
              {{ $t('list_trash__restore') }}
            </button>
            <button type="button" :class="$style.btnDanger" @click="handleRemove(item)">
              {{ $t('list_trash__delete') }}
            </button>
          </div>
        </li>
      </ul>

      <div v-if="listTrashItems.length" :class="$style.footer">
        <span :class="$style.hint">{{ $t('list_trash__hint', { num: LIST_TRASH_MAX }) }}</span>
        <span :class="$style.spacer" />
        <button type="button" :class="$style.btnDanger" @click="handleClear">
          {{ $t('list_trash__clear') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from '@common/utils/vueTools'
import {
  listTrashModalVisible,
  listTrashItems,
  LIST_TRASH_MAX,
  hideListTrashModal,
  removeListTrash,
  clearListTrash,
} from '@renderer/store/listTrash'
import { createUserList } from '@renderer/store/list/action'
import { registerModalCloser } from '@renderer/utils/modalStack'
import { dialog } from '@renderer/plugins/Dialog'
import { useI18n } from '@renderer/plugins/i18n'

const t = useI18n()

const handleClose = () => {
  hideListTrashModal()
}

const formatTime = (ts: number) => {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 还原：用原名字重建歌单并灌回歌曲。
 * 刻意用全新的歌单 id —— 如果沿用原 id，而用户后来又新建了同 id 的歌单，会互相覆盖。
 */
const handleRestore = async(item: typeof listTrashItems[number]) => {
  await createUserList({
    name: item.name,
    list: [...item.list],
    source: item.source,
    sourceListId: item.sourceListId,
  })
  removeListTrash(item.id)
  void dialog({
    message: t('list_trash__restored_tip', { name: item.name }),
    confirmButtonText: t('alert_button_text'),
  })
}

const handleRemove = async(item: typeof listTrashItems[number]) => {
  const confirm = await dialog.confirm({
    message: t('list_trash__delete_confirm', { name: item.name }),
    cancelButtonText: t('cancel_button_text'),
    confirmButtonText: t('common__delete'),
  })
  if (!confirm) return
  removeListTrash(item.id)
}

const handleClear = async() => {
  const confirm = await dialog.confirm({
    message: t('list_trash__clear_confirm'),
    cancelButtonText: t('cancel_button_text'),
    confirmButtonText: t('common__delete'),
  })
  if (!confirm) return
  clearListTrash()
}

const off = registerModalCloser(() => {
  if (!listTrashModalVisible.value) return false
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
  width: 520px;
  max-width: calc(100vw - 80px);
  height: 60vh;
  min-height: 320px;
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

.list {
  flex: auto;
  min-height: 0;
  overflow-y: auto;
  margin: 0;
  padding: 8px 14px;
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  padding: 8px 6px;
  border-radius: var(--qm-radius-xs, 6px);

  &:hover { background-color: var(--qm-hover); }
}

.info {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 2px;
}

.name {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-5);
  font-variant-numeric: tabular-nums;
}

.actions {
  flex: none;
  display: flex;
  gap: var(--qm-sp-2, 6px);
}

.btnGhost,
.btnDanger {
  padding: 4px 12px;
  border-radius: var(--qm-radius-chip, 999px);
  font-size: var(--qm-fs-xs, 12px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast);
}

.btnGhost {
  border: 1px solid var(--qm-line-2);
  background: transparent;
  color: var(--qm-text-2);

  &:hover { background-color: var(--qm-hover); color: var(--qm-text-1); }
}

.btnDanger {
  border: 1px solid var(--color-danger);
  background: transparent;
  color: var(--color-danger);

  &:hover { background-color: var(--color-danger); color: var(--qm-text-invert); }
}

.footer {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  padding: 12px 18px 14px;
  border-top: 1px solid var(--qm-line-1);
}

.hint {
  flex: auto;
  min-width: 0;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-5);
}

.spacer {
  flex: none;
}
</style>
