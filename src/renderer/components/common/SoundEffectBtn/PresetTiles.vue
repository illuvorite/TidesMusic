<template>
  <div :class="$style.wrap">
    <h3 :class="$style.title">精选音效</h3>
    <div :class="$style.grid">
      <effect-tile
        v-for="item in soundPresets"
        :key="item.key"
        :label="item.label"
        :icon="item.icon"
        :colors="item.colors"
        :image="item.image"
        :selected="selectedKey === item.key"
        @click="handleApply(item)"
      />
    </div>

    <h3 :class="[$style.title, $style.titleGap]">达人音效</h3>
    <div :class="$style.list">
      <div :class="[$style.listItem, $style.listAdd]">
        <AddEQPresetBtn v-if="userPresetList.length < 31" />
        <span v-else :class="$style.emptyTip">已达到预设数量上限</span>
      </div>
      <div v-for="item in userPresetList" :key="item.id" :class="$style.listItem">
        <span :class="$style.listName">{{ item.name }}</span>
        <base-btn min @click="handleSetPreset(item)">使用</base-btn>
        <base-btn min @click="handleRemovePreset(item.id)">删除</base-btn>
      </div>
      <span v-if="!userPresetList.length" :class="$style.emptyTip">点击「＋」把当前均衡器保存为预设</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from '@common/utils/vueTools'
import { appSetting } from '@renderer/store/setting'
import { freqs } from '@renderer/plugins/player'
import { soundPresets, matchSoundPreset, readEffectState, effectStateToPayload } from './presets'
import { applyEffectSetting } from './actions'
import EffectTile from './ui/EffectTile.vue'
import AddEQPresetBtn from './AddEQPresetBtn.vue'
import { getUserEQPresetList, removeUserEQPreset } from '@renderer/store/soundEffect'

const selectedKey = computed(() => matchSoundPreset(readEffectState(appSetting)))

const handleApply = (item) => {
  void applyEffectSetting(effectStateToPayload(item.state))
}

const userPresetList = ref([])
const handleSetPreset = (item) => {
  const payload = {}
  for (const hz of freqs) payload[`player.soundEffect.biquadFilter.hz${hz}`] = item[`hz${hz}`] ?? 0
  void applyEffectSetting(payload)
}
const handleRemovePreset = (id) => {
  void removeUserEQPreset(id)
}

onMounted(() => {
  void getUserEQPresetList().then((list) => {
    userPresetList.value = list
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
.titleGap {
  margin-top: 6px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
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
  min-height: 34px;
  padding: 0 8px;
  border-radius: 6px;
  background-color: var(--qm-field, #f2f3f5);
  box-sizing: border-box;
}
.listAdd {
  justify-content: center;
}
.listName {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.emptyTip {
  font-size: 12px;
  color: var(--color-font-label);
}
</style>
