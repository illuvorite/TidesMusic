<template>
  <div :class="$style.wrap">
    <!-- 环绕混响模式（运行时生成 IR） -->
    <h3 :class="$style.title">混响模式</h3>
    <div :class="$style.grid4">
      <effect-tile
        v-for="item in surroundTiles"
        :key="item.key"
        :label="item.label"
        :icon="item.icon"
        :colors="item.colors"
        :selected="!convolutionFileName && reverbMode === item.key"
        @click="handleSurroundMode(item.key)"
      />
    </div>

    <!-- IR 采样文件 -->
    <div :class="$style.subTitle">混响采样（脉冲响应）</div>
    <div :class="$style.list">
      <div v-for="item in convolutions" :key="item.name" :class="$style.listItem">
        <span :class="[$style.listName, { [$style.listNameActive]: convolutionFileName === item.source }]">{{ $t(`player__sound_effect_convolution_file_${item.name}`) }}</span>
        <base-btn min @click="handleConvolution(item)">使用</base-btn>
      </div>
      <div v-for="item in userConvolutionPresetList" :key="item.id" :class="$style.listItem">
        <span :class="$style.listName">{{ item.name }}</span>
        <base-btn min @click="handleSetUserConvolution(item)">使用</base-btn>
        <base-btn min @click="handleRemoveUserConvolution(item.id)">删除</base-btn>
      </div>
      <AddConvolutionPresetBtn v-if="userConvolutionPresetList.length < 31" :disabled="!convolutionFileName" />
    </div>

    <p :class="$style.tip">混响大小请在「均衡器」页的「混响强度」中调整。</p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from '@common/utils/vueTools'
import { appSetting } from '@renderer/store/setting'
import { convolutions } from '@renderer/plugins/player'
import { surroundTiles, modeReverbAmount } from './presets'
import { applyEffectSetting } from './actions'
import EffectTile from './ui/EffectTile.vue'
import AddConvolutionPresetBtn from './AddConvolutionPresetBtn.vue'
import { getUserConvolutionPresetList, removeUserConvolutionPreset } from '@renderer/store/soundEffect'

const reverbMode = computed(() => appSetting['player.soundEffect.reverbMode'])
const convolutionFileName = computed(() => appSetting['player.soundEffect.convolution.fileName'])

/** 切换混响模式：写入模式 + 该模式对应的默认混响强度（两者都由设置驱动，保证单一数据源） */
const handleSurroundMode = (mode) => {
  void applyEffectSetting({
    'player.soundEffect.reverbMode': mode,
    // 生成 IR 的模式与 IR 采样文件互斥
    'player.soundEffect.convolution.fileName': '',
    'player.soundEffect.reverb': mode === 'off' ? 0 : modeReverbAmount(mode),
  })
}

/** 选择 IR 采样文件：原始音频增益取预设值，混响强度取该采样的 sendGain */
const handleConvolution = (item) => {
  void applyEffectSetting({
    'player.soundEffect.convolution.fileName': item.source,
    'player.soundEffect.convolution.mainGain': item.mainGain * 10,
    'player.soundEffect.convolution.sendGain': item.sendGain * 10,
    'player.soundEffect.reverbMode': 'off',
    'player.soundEffect.reverb': item.sendGain * 10,
  })
}

const userConvolutionPresetList = ref([])
const handleSetUserConvolution = (item) => {
  void applyEffectSetting({
    'player.soundEffect.convolution.fileName': item.source,
    'player.soundEffect.convolution.mainGain': item.mainGain,
    'player.soundEffect.convolution.sendGain': item.sendGain,
    'player.soundEffect.reverbMode': 'off',
    'player.soundEffect.reverb': item.sendGain,
  })
}
const handleRemoveUserConvolution = (id) => {
  void removeUserConvolutionPreset(id)
}

onMounted(() => {
  void getUserConvolutionPresetList().then((list) => {
    userConvolutionPresetList.value = list
  })
})
</script>

<style lang="less" module>
.wrap {
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
}
.title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-font);
}
.subTitle {
  font-size: 12px;
  color: var(--color-font-label);
  margin-top: 4px;
}
.grid4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.listItem {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  background-color: var(--qm-field, var(--color-primary-light-100-alpha-700));
}
.listName {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &.listNameActive {
    color: #12b981;
    font-weight: 500;
  }
}
.tip {
  margin: 0;
  font-size: 12px;
  color: var(--color-font-label);
}
</style>
