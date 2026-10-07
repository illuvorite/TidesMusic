<template>
  <span>
    <!-- 点击歌手名 → 歌手主页。数据结构里只有歌手名字符串、没有歌手 id，
         所以点击时先按名反查再跳转，逻辑见 utils/singerNav.ts。
         注意：根节点必须是唯一的元素，模板最外层不能写注释 ——
         否则 Vue 会把根判定为 fragment，父级传入的 class（select / name-sub-text）透传失效。 -->
    <template v-for="(name, index) in names" :key="index">
      <span v-if="index" class="no-select" :class="$style.sep">{{ separator }}</span>
      <span
        :class="[$style.name, { [$style.linked]: clickable }]"
        :title="clickable ? `${$t('singer__view_homepage')}：${name}` : name"
        @click.stop="handleClick(name)"
      >{{ name }}</span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from '@common/utils/vueTools'
import { useRoute } from '@common/utils/vueRouter'
import { splitSingerNames, useSingerNav } from '@renderer/utils/singerNav'

interface Props {
  /** 歌手名，支持多位歌手（按 、/ , 等分隔，见 splitSingerNames） */
  singer?: string
  /** 反查失败时兜底搜索所用的音源；不传则用解析所用的音源 */
  source?: string
  /** 多位歌手之间的显示分隔符 */
  separator?: string
}

// 注意：可选 prop 一律用「不传」表达空值，类型里不要写 `| null`，
// withDefaults 会把它摊成 `type: [String, null]`，而 null 不是合法 PropConstructor（TS2769）
const props = withDefaults(defineProps<Props>(), {
  singer: '',
  source: '',
  separator: '、',
})

const names = computed(() => splitSingerNames(props.singer))
const route = useRoute()
const { navigateToSinger } = useSingerNav()

// 歌手详情页自身不再跳来跳去：那里本来就围绕着同一个歌手，跳过去是原地不动或换人。
const clickable = computed(() => route.name !== 'SingerDetail')

// 反查是网络请求，连点防御
const pending = ref(false)
const handleClick = (name: string) => {
  if (!clickable.value || !name || pending.value) return
  pending.value = true
  navigateToSinger(name, props.source || undefined).catch(() => {}).finally(() => { pending.value = false })
}
</script>

<style lang="less" module>
.sep {
  opacity: 0.75;
}

.name {
  white-space: pre-wrap;
}

.linked {
  cursor: pointer;

  &:hover {
    color: var(--color-primary);
    text-decoration: underline;
  }
}
</style>
