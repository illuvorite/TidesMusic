<template>
  <material-modal :show="modelValue" bg-close="bg-close" teleport="#root" @close="$emit('update:modelValue', false)">
    <main :class="$style.main">
      <h2>{{ $t('theme_selector_modal__title') }}</h2>
      <div class="scroll" :class="$style.content">
        <div>
          <h3>{{ $t('theme_selector_modal__light_title') }}</h3>
          <ul :class="$style.theme">
            <li
              v-for="theme in themeInfo.themeLights" :key="theme.id"
              :style="theme.styles" :aria-label="theme.name"
              :class="[{[$style.active]: appSetting['theme.lightId'] == theme.id}]" @click="setLightId(theme.id)"
            >
              <span :class="$style.bg" />
              <label>{{ theme.name }}</label>
            </li>
          </ul>
        </div>
        <div>
          <h3>{{ $t('theme_selector_modal__dark_title') }}</h3>
          <ul :class="$style.theme">
            <li
              v-for="theme in themeInfo.themeDarks" :key="theme.id"
              :style="theme.styles" :aria-label="theme.name"
              :class="[{[$style.active]: appSetting['theme.darkId'] == theme.id}]" @click="setDarkId(theme.id)"
            >
              <span :class="$style.bg" />
              <label>{{ theme.name }}</label>
            </li>
          </ul>
        </div>
      </div>
      <div :class="$style.note">
        <p>{{ $t('theme_selector_modal__title_tip') }}</p>
      </div>
    </main>
  </material-modal>
</template>

<script>
import { markRaw, reactive, watch } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { applyTheme, getThemes, buildBgUrl } from '@renderer/store/utils'

export default {
  name: 'ThemeSelectorModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props) {
    const themeInfo = reactive({
      themeLights: [],
      themeDarks: [],
    })
    let dataPath = ''

    watch(() => props.modelValue, (val) => {
      if (!val) return
      getThemes((info) => {
      // console.log(info)
        const themes = [...info.themes, ...info.userThemes]
        const lights = []
        const darks = themes.filter(t => {
          if (t.isDark) return true
          lights.push(t)
          return false
        })
        dataPath = info.dataPath
        themeInfo.themeLights = lights.map(t => {
          return {
            id: t.id,
            // @ts-expect-error
            name: t.isCustom ? t.name : window.i18n.t('theme_' + t.id),
            styles: {
              '--color-primary-theme': t.config.themeColors['--color-theme'],
              '--background-image-theme': t.isCustom
                ? t.config.extInfo['--background-image'] == 'none'
                  ? 'none'
                  : buildBgUrl(t.config.extInfo['--background-image'], info.dataPath)
                : t.config.extInfo['--background-image'],
            },
          }
        })
        themeInfo.themeDarks = markRaw(darks.map(t => {
          return {
            id: t.id,
            // @ts-expect-error
            name: t.isCustom ? t.name : window.i18n.t('theme_' + t.id),
            styles: {
              '--color-primary-theme': t.config.themeColors['--color-theme'],
              '--background-image-theme': t.isCustom
                ? t.config.extInfo['--background-image'] == 'none'
                  ? 'none'
                  : buildBgUrl(t.config.extInfo['--background-image'], info.dataPath)
                : t.config.extInfo['--background-image'],
            },
          }
        }))
      })
    })

    const setLightId = (id) => {
      if (appSetting['theme.lightId'] == id) return
      updateSetting({ 'theme.lightId': id })
      if (appSetting['theme.id'] == 'auto') applyTheme('auto', id, appSetting['theme.darkId'], dataPath)
    }
    const setDarkId = (id) => {
      if (appSetting['theme.darkId'] == id) return
      updateSetting({ 'theme.darkId': id })
      if (appSetting['theme.id'] == 'auto') applyTheme('auto', appSetting['theme.lightId'], id, dataPath)
    }
    return {
      appSetting,
      themeInfo,
      setLightId,
      setDarkId,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.main {
  // padding: 15px;
  // max-width: 400px;
  min-width: 300px;
  min-height: 0;
  // max-height: 100%;
  // overflow: hidden;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  min-height: 0;
  h2 {
    flex: none;
    font-size: var(--qm-fs-xl, 16px);
    color: var(--qm-text-2);
    line-height: 1.3;
    text-align: center;
    padding: var(--qm-sp-6, 15px);
  }
  h3 {
    font-size: var(--qm-fs-xl, 16px);
    color: var(--qm-text-2);
    line-height: 1.3;
    padding-bottom: var(--qm-sp-6, 15px);
    font-size: var(--qm-fs-lg, 15px);
  }
}
.content {
  flex: auto;
  padding: var(--qm-sp-6, 15px);
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-6, 15px);
}
.theme {
  display: flex;
  flex-flow: row wrap;
  // padding: 0 15px;

  li {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    cursor: pointer;
    // color: var(--color-primary);
    margin-right: var(--qm-sp-1, 4px);
    transition: color .3s ease;
    margin-bottom: var(--qm-sp-6, 15px);
    width: 86px;

    &:last-child {
      margin-right: 0;
    }

    &.active {
      color: var(--color-primary-theme);
      .bg {
        border-color: var(--color-primary-theme);
      }
    }

    .bg {
      display: block;
      width: 36px;
      height: 36px;
      margin-bottom: 5px;
      border: 2px solid transparent;
      padding: var(--qm-sp-0, 2px);
      transition: border-color .3s ease;
      border-radius: var(--qm-radius-xs, 6px);
      &:after {
        display: block;
        content: ' ';
        width: 100%;
        height: 100%;
        border-radius: @radius-border;
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        background-color: var(--color-primary-theme);
        background-image: var(--background-image-theme);
      }
    }

    label {
      width: 100%;
      text-align: center;
      height: 1.2em;
      font-size: var(--qm-fs-md, 14px);
    }
  }
}

.note {
  padding: 8px 15px;
  font-size: var(--qm-fs-sm, 13px);
  line-height: 1.25;
  color: var(--qm-text-2);
  // p {
  //   + p {
  //     margin-top: 5px;
  //   }
  // }
}

</style>
