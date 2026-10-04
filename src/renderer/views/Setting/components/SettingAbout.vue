<template lang="pug">
dt#about {{ $t('setting__about') }}
dd
  .p.small
    | 本项目为潮汐音乐（TidesMusic），基于落雪音乐助手（LX Music Desktop）二次开发，遵循 Apache License 2.0 协议。
  .p.small
    | 原项目地址：
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/lyswhut/lx-music-desktop')") https://github.com/lyswhut/lx-music-desktop
  .p.small
    | 本仓库地址：
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/illuvorite/tides-music-desktop')") https://github.com/illuvorite/tides-music-desktop
  .p.small
    | 最新版下载地址：
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/illuvorite/tides-music-desktop/releases')") GitHub Releases
  br
  .p.small
    strong 本软件没有客服
    | ，使用过程中遇到问题请先阅读
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/illuvorite/tides-music-desktop/issues?q=is%3Aissue+')") 仓库 Issue
    | 列表，确认是否已有同类反馈。
  .p.small
    | 仍有问题可到&nbsp;GitHub&nbsp;
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/illuvorite/tides-music-desktop/issues/new')") 提交&nbsp;Issue
    | 。
  br
  .p.small
    | 由于本软件基于开源项目二次开发，因此软件直至停止维护都将会一直保持纯净。
  .p.small
    strong 本项目没有微信公众号之类的所谓「官方账号」，谨防被骗！
  br

  .p.small
    | 你已签署本软件的
    base-btn(min @click="handleShowPact") 许可协议
    | 。
</template>

<script>
// import { ref, onBeforeUnmount } from '@common/utils/vueTools'
import { isShowPact } from '@renderer/store'
import { openUrl, clipboardWriteText } from '@common/utils/electron'

export default {
  name: 'SettingAbout',
  setup() {
    const handleShowPact = () => {
      isShowPact.value = true
    }
    return {
      openUrl,
      clipboardWriteText,
      handleShowPact,
    }
  },
}
</script>