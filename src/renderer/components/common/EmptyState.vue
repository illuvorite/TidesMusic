<template>
  <!-- 公共空态 / 加载态 / 失败重试：三种状态收敛到一个组件，
       取代此前散落在各页的 .qm-empty / .emptyBox / .tip / .noitem / .blank / .empty 等 8 套实现 -->
  <div :class="[$style.empty, { [$style.compact]: compact }]" role="status">
    <span v-if="loading" :class="$style.spinner" aria-hidden="true" />

    <template v-else>
      <span :class="$style.iconWrap">
        <svg-icon :name="iconName" :class="$style.icon" />
      </span>
      <p :class="$style.title">{{ title }}</p>
      <p v-if="description" :class="$style.desc">{{ description }}</p>
      <button
        v-if="actionText"
        type="button"
        :class="$style.action"
        @click="$emit('action')"
      >{{ actionText }}</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'

interface Props {
  /** 承载的状态：空数据 / 加载中 / 失败 */
  variant?: 'empty' | 'loading' | 'error'
  /** svg sprite 图标名（空态/失败态使用） */
  icon?: string
  /** 主文案；不传时按 variant 取默认值 */
  title?: string
  /** 次要说明文案 */
  description?: string
  /** 有操作按钮时显示（如「重试」「回到精选」） */
  actionText?: string
  /** 紧凑模式：用于列表内部，纵向留白更小 */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'empty',
  icon: '',
  title: '',
  description: '',
  actionText: '',
  compact: false,
})

const loading = computed(() => props.variant === 'loading')

const iconName = computed(() => props.icon || (props.variant === 'error' ? 'lucide-circle-help' : 'music'))

const title = computed(() => {
  if (props.title) return props.title
  if (props.variant === 'loading') return window.i18n.t('list__loading') || '加载中…'
  if (props.variant === 'error') return '加载失败'
  return window.i18n.t('no_item') || '暂无内容'
})

defineEmits<(e: 'action') => void>()
</script>

<style lang="less" module>
.empty {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: var(--qm-sp-3, 8px);
  padding: 64px var(--qm-sp-7, 16px);
  text-align: center;
  box-sizing: border-box;
}

.compact {
  padding: 32px var(--qm-sp-7, 16px);
}

.iconWrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: var(--qm-sp-1, 4px);
  border-radius: 50%;
  // 中性填充：跟随主题（浅色主题浅灰、深色主题浅色叠加），不用 --qm-card（恒为浅色）
  background-color: var(--qm-hover);
  color: var(--qm-text-5);

  :global(.svg-icon) {
    width: 28px;
    height: 28px;
  }
}

.icon {
  width: 28px;
  height: 28px;
  fill: currentColor;
}

.title {
  margin: 0;
  font-size: var(--qm-fs-sm, 13px);
  font-weight: var(--qm-fw-medium, 500);
  color: var(--qm-text-3);
  line-height: 1.6;
}

.desc {
  margin: 0;
  max-width: 460px;
  font-size: var(--qm-fs-xs, 12px);
  line-height: 1.7;
  color: var(--qm-text-5);
}

.action {
  margin-top: var(--qm-sp-2, 6px);
  padding: 6px 18px;
  border: 1px solid var(--qm-primary-border);
  border-radius: var(--qm-radius-btn);
  background-color: var(--qm-primary-soft);
  color: var(--qm-primary);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast);
  &:hover { background-color: var(--qm-primary-soft-hover); }
}

// 加载指示：1px 描边圆环旋转，避免引入额外图标资源
.spinner {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid var(--qm-line-2);
  border-top-color: var(--qm-primary);
  animation: qmSpin 720ms linear infinite;
}

@keyframes qmSpin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spinner { animation-duration: 2000ms; }
}
</style>
