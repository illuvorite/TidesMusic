<template>
  <div v-if="maxPage > 1" :class="$style.pagination">
    <ul>
      <li v-if="page == 1" :class="[$style.nav, $style.disabled]">
        <span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4.8 8.2 12 15 19.2" /></svg>
        </span>
      </li>
      <li v-else :class="$style.nav">
        <button type="button" :aria-label="$t('pagination__prev')" @click="handleClick(page - 1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4.8 8.2 12 15 19.2" /></svg>
        </button>
      </li>
      <li v-if="maxPage > btnLength && page > pageEvg+1" :class="$style.jump">
        <button type="button" :aria-label="$t('pagination__page', { num: 1 })" @click="handleClick(1)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11.4 4.8 4.6 12l6.8 7.2" />
            <path d="M19 4.8 12.2 12l6.8 7.2" />
          </svg>
        </button>
      </li>
      <li v-for="p in pages" :key="p" :class="[$style.num, {[$style.active] : p == page}]">
        <span v-if="p === page" aria-current="page" v-text="page" />
        <button v-else type="button" :aria-label="$t('pagination__page', { num: p })" @click="handleClick(p)" v-text="p" />
      </li>
      <li v-if="maxPage > btnLength && maxPage - page > pageEvg" :class="$style.jump">
        <button type="button" :aria-label="$t('pagination__page', { num: maxPage })" @click="handleClick(maxPage)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.6 4.8 11.4 12l-6.8 7.2" />
            <path d="M12.2 4.8 19 12l-6.8 7.2" />
          </svg>
        </button>
      </li>
      <li v-if="page == maxPage" :class="[$style.nav, $style.disabled]">
        <span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4.8 15.8 12 9 19.2" /></svg>
        </span>
      </li>
      <li v-else :class="$style.nav">
        <button type="button" :aria-label="$t('pagination__next')" @click="handleClick(page + 1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4.8 15.8 12 9 19.2" /></svg>
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
import { computed } from '@common/utils/vueTools'

export default {
  props: {
    count: {
      type: Number,
      default: 0,
    },
    limit: {
      type: Number,
      default: 10,
    },
    page: {
      type: Number,
      default: 1,
    },
    btnLength: {
      type: Number,
      default: 7,
    },
  },
  emits: ['btn-click'],
  setup(props, { emit }) {
    const maxPage = computed(() => {
      return Math.ceil(props.count / props.limit) || 1
    })
    const pageEvg = computed(() => {
      return Math.floor(props.btnLength / 2)
    })
    const pages = computed(() => {
      if (maxPage.value <= props.btnLength) return Array.from({ length: maxPage.value }, (_, i) => i + 1)
      let start = props.page - pageEvg.value > 1
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        ? maxPage.value - props.page < pageEvg.value + 1
          ? maxPage.value - (props.btnLength - 1)
          : props.page - pageEvg.value
        : 1
      return Array.from({ length: props.btnLength }, (_, i) => start + i)
    })

    const handleClick = (page) => {
      emit('btn-click', page)
    }

    return {
      maxPage,
      pageEvg,
      pages,
      handleClick,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.pagination {
  display: inline-flex;

  ul {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      border-radius: var(--qm-radius-card, 10px);

      svg {
        width: var(--qm-icon-sm);
        height: var(--qm-icon-sm);
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      span,
      button {
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        min-width: 32px;
        height: 32px;
        padding: 0 8px;
        border: none;
        border-radius: var(--qm-radius-card, 10px);
        background-color: transparent;
        color: var(--qm-text-2);
        font-size: 13px;
        font-weight: 500;
        line-height: 1;
        font-variant-numeric: tabular-nums;
        transition: background-color var(--qm-t-fast), color var(--qm-t-fast), box-shadow var(--qm-t-fast);
      }

      button {
        cursor: pointer;
        outline: none;

        &:active {
          transform: scale(0.94);
        }
      }

      // 数字页：浅底方块，hover 时转为浅主题色
      &.num {
        span,
        button {
          background-color: var(--qm-hover);
        }

        button:hover {
          background-color: var(--qm-primary-soft);
          color: var(--qm-primary);
        }
      }

      // 当前页：主题色实心 + 同色投影
      &.active span {
        background-color: var(--qm-primary);
        color: var(--qm-text-invert, #fff);
        font-weight: var(--qm-fw-semibold, 600);
        box-shadow: 0 4px 12px -2px rgba(0, 0, 0, .16);
        box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--qm-primary) 45%, transparent);
      }

      // 上一页 / 下一页：浅主题色底 + 主题色图标，作为主操作
      &.nav {
        span,
        button {
          background-color: var(--qm-primary-soft);
          color: var(--qm-primary);
        }

        button:hover {
          background-color: var(--qm-primary-soft-hover, var(--qm-primary-soft));
        }
      }

      // 首页 / 末页跳转：弱化为纯图标，避免与相邻的翻页箭头混淆
      &.jump {
        svg {
          width: var(--qm-icon-xs);
          height: var(--qm-icon-xs);
        }

        span,
        button {
          color: var(--qm-text-4);
        }

        button:hover {
          background-color: var(--qm-primary-soft);
          color: var(--qm-primary);
        }
      }

      &.disabled {
        opacity: .3;
        cursor: not-allowed;

        span {
          cursor: not-allowed;
          // 禁用时收回主题色底，避免看起来还可点
          background-color: var(--qm-hover);
          color: var(--qm-text-3);
        }
      }
    }
  }
}


</style>
