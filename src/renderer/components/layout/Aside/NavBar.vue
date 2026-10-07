<template>
  <div ref="dom_menu" :class="$style.menu">
    <ul :class="$style.list" role="toolbar">
      <li v-for="item in menus" :key="item.to" :class="$style.navItem" role="presentation">
        <router-link :class="[$style.link, {[$style.active]: $route.meta.name == item.name}]" role="tab" :aria-selected="$route.meta.name == item.name" :to="item.to" :aria-label="item.tips">
          <svg-icon :name="item.iconName" :class="$style.icon" />
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { appSetting } from '@renderer/store/setting'
import { useI18n } from '@root/lang'
import { computed, ref } from '@common/utils/vueTools'
import { useIconSize } from '@renderer/utils/compositions/useIconSize'

export default {
  name: 'NavBar',
  setup() {
    const _i18n: any = useI18n()
    const t = _i18n.bind(_i18n)
    const dom_menu = ref<HTMLElement>()
    const iconSize = useIconSize(dom_menu, 0.32)

    const menus = computed(() => {
      const size = iconSize.value
      return [
        {
          to: '/home',
          tips: t('home') ?? '首页',
          iconName: 'home',
          size,
          name: 'Home',
          enable: true,
        },
        {
          to: '/songList/list',
          tips: t('song_list'),
          iconName: 'music',
          size,
          name: 'SongList',
          enable: true,
        },
        {
          to: '/leaderboard',
          tips: t('leaderboard'),
          iconName: 'lucide-trophy',
          size,
          name: 'Leaderboard',
          enable: true,
        },
        {
          to: '/list',
          tips: t('my_list'),
          iconName: 'tabler-phone',
          size,
          name: 'List',
          enable: true,
        },
        {
          to: '/search',
          tips: t('search'),
          iconName: 'lucide-circle-help',
          size,
          name: 'Search',
          enable: true,
        },
        {
          to: '/download',
          tips: t('download'),
          iconName: 'share',
          size,
          enable: appSetting['download.enable'],
          name: 'Download',
        },
      ].filter(m => m.enable)
    })
    return {
      appSetting,
      menus,
      dom_menu,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.menu {
  flex: auto;
}
.list {
  -webkit-app-region: no-drag;
  &:last-child {
    margin-bottom: 0;
  }
}
.navItem {
  position: relative;
  &:before {
    content: '';
    display: block;
    width: 100%;
    padding-bottom: 84%;
  }
}
.link {
  position: absolute;
  left: 0%;
  top: 0%;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  transition: @transition-fast;
  transition-property: background-color, opacity;
  color: var(--color-nav-font);
  cursor: pointer;
  text-align: center;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  .mixin-ellipsis-1();
  border-radius: 0;

  &:before {
    .mixin-after();
    left: 0;
    top: 0;
    width: 3px;
    height: 100%;
    background-color: var(--color-primary);
    border-radius: var(--qm-radius-2xs, 4px);
    transform: translateX(-100%);
    transition: transform @transition-fast;
  }

  &.active {
    background-color: var(--color-primary-light-300-alpha-700);
    color: var(--color-primary);
    &:before {
      transform: translateX(0);
    }
    &:hover {
      background-color: var(--color-primary-light-300-alpha-800);
    }
  }

  &:hover {
    color: var(--color-nav-font);
    &:not(.active) {
      opacity: .85;
      background-color: var(--color-primary-light-400-alpha-700);
    }
  }
  &:active:not(.active) {
    opacity: .6;
    background-color: var(--color-primary-light-300-alpha-600);
  }
}

.icon {
  width: 32%;
  height: 32%;
  display: block;
  fill: currentColor;
}
</style>
