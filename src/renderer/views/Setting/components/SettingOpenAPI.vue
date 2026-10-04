<template lang="pug">
dt#sync {{ $t('setting__open_api') }}
dd.gap-top
  div
    .p
      base-checkbox(id="setting_open_api_enable" :model-value="appSetting['openAPI.enable']" :label="$t('setting__open_api_enable')" @update:model-value="updateSetting({ 'openAPI.enable': $event })")
    .p.gap-top
      base-checkbox(id="setting_open_api_bind_lan" :model-value="appSetting['openAPI.bindLan']" :label="$t('setting__open_api_bind_lan')" @update:model-value="updateSetting({ 'openAPI.bindLan': $event })")
    .p.gap-top
      | {{ $t('setting__open_api_address') }}
      span.select {{ openAPI.address }}
    .p.small(v-if="openAPI.message") {{ openAPI.message }}
    .p
      .p.small {{ $t('setting__open_api_port') }}
      div
        base-input.gap-left(:class="$style.portInput" :model-value="appSetting['openAPI.port']" type="number" :placeholder="$t('setting__open_api_port_tip')" @update:model-value="setPort")
    .p
      .p.small
        | {{ $t('setting__open_api_token') }}
        span.select.token {{ openAPI.token }}
      base-btn.gap-left(min :disabled="!openAPI.token" @click="regenerateToken") {{ $t('setting__open_api_token_regenerate') }}
    .p.small {{ $t('setting__open_api_token_tip') }}

dd.gap-top
  div
    .p
      | {{ $t('setting__open_api_tip') }}
      strong.hover.underline(aria-label="https://lyswhut.github.io/lx-music-doc/desktop/faq/open-api" @click="openUrl('https://lyswhut.github.io/lx-music-doc/desktop/open-api')") {{ $t('setting__open_api_tip_link') }}
</template>

<script>
// import { computed } from '@common/utils/vueTools'
import { openAPI } from '@renderer/store'
import { openUrl } from '@common/utils/electron'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { sendOpenAPIAction } from '@renderer/utils/ipc'
import { debounce } from '@common/utils'

export default {
  name: 'SettingOpenAPI',
  setup() {
    const setPort = debounce(port => {
      updateSetting({ 'openAPI.port': port.trim() })
    }, 500)

    const loadToken = async() => {
      try {
        const { token } = await sendOpenAPIAction({ action: 'token' })
        openAPI.token = token
      } catch {
        openAPI.token = ''
      }
    }
    void loadToken()

    const regenerateToken = async() => {
      const { token } = await sendOpenAPIAction({ action: 'regenerate_token' })
      openAPI.token = token
    }

    return {
      appSetting,
      updateSetting,
      openAPI,
      openUrl,
      setPort,
      regenerateToken,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.portInput[disabled], .hostInput[disabled] {
  opacity: .8 !important;
}
.select.token {
  user-select: all;
  margin-left: 8px;
  font-family: monospace;
}
</style>
