<template lang="pug">
div(:class="$style.container")
  ul
    li(v-for="item in comments" :key="item.id" :class="$style.listItem")
      div(:class="$style.content")
        div(:class="$style.left")
          img( :class="$style.avatar" :src="item.avatar || commentDefImg" @error="handleUserImg")
        div(:class="$style.right")
          div(:class="$style.info")
            div(:class="$style.baseInfo")
              div.select(:class="$style.name") {{ item.userName }}
              div(:class="$style.metaInfo")
                time(v-if="item.timeStr" :class="$style.label") {{ timeFormat(item.timeStr) }}
                div(v-if="item.location" :class="$style.label") {{ $t('comment__location', { location: item.location }) }}
            div(v-if="item.likedCount != null" :class="$style.likes")
              svg-icon(name="thumbs-up" :class="$style.likesIcon")
              | {{ item.likedCount }}
          p.select(:class="$style.comment_text") {{ item.text }}
          div(v-if="item.images?.length" :class="$style.comment_images")
            img(v-for="(url, index) in item.images" :key="index" :src="url" loading="lazy" decoding="async")
      comment-floor(v-if="item.reply && item.reply.length" :class="$style.reply_floor" :comments="item.reply")
</template>

<script>
import commentDefImg from '@renderer/assets/images/defaultUser.jpg'

export default {
  name: 'CommentFloor',
  props: {
    comments: {
      type: Array,
      default() {
        return []
      },
    },
  },
  data() {
    return {
      commentDefImg,
    }
  },
  methods: {
    timeFormat(time) {
      return time
      // return formatTime(new Date(time), true)
    },
    handleUserImg(event) {
      event.target.src = this.commentDefImg
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@padding: 15px;

// .container {

// }

.listItem {
  // 面板已是不透明深色，分隔线用中性白 alpha，避免依赖主题色令牌在详情页内失真
  border-bottom: 1px dashed rgba(255, 255, 255, .08);
}

.content {
  padding: 12px 0;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-2);
  display: flex;
}
.left {
  flex: none;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 2px rgba(0, 0, 0, .15);
}
.right {
  flex: auto;
  min-width: 0;
  margin-left: var(--qm-sp-4, 10px);
}

.info {
  display: flex;
  flex-flow: row nowrap;
  gap: var(--qm-sp-6, 15px);
  width: 100%;
  height: 40px;
  line-height: 1.3;
  color: rgba(255, 255, 255, .5);
}
.baseInfo {
  height: 100%;
  flex: auto;
  display: flex;
  min-width: 0;
  flex-flow: column nowrap;
  justify-content: space-evenly;
}
.metaInfo {
  display: flex;
  flex-flow: row nowrap;
  min-width: 0;
  gap: var(--qm-sp-4, 10px);
  overflow: hidden;
}
.name {
  flex: 0 1 auto;
  min-width: 0;
  .mixin-ellipsis-1();
  color: var(--qm-primary);
}
.label {
  flex: none;
  font-size: var(--qm-fs-xs, 12px);
  // margin-left: 5px;
}
.likes {
  flex: none;
  font-size: var(--qm-fs-2xs, 11px);
  text-align: right;
  padding-top: 3px;
  align-self: flex-start;
  color: rgba(255, 255, 255, .55);
}
.likesIcon {
  width: 12px;
  height: 12px;
  margin-right: 3px;
  color: var(--qm-primary);
}
.comment_text {
  text-align: justify;
  font-size: var(--qm-fs-md, 14px);
  line-height: 1.5;
  word-break: break-all;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}
.comment_images {
  display: flex;
  flex-flow: row wrap;
  gap: 5px;
  margin-top: 5px;

  img {
    max-width: 240px;
  }
}

.reply_floor {
  padding: 0 0 0 @padding;
  margin-left: @padding * 2;
  border-radius: .5rem;
  &:last-child {
    margin-bottom: var(--qm-sp-5, 12px);
  }
  .listItem:last-child {
    border-bottom: none;
  }
  .right {
    margin-right: var(--qm-sp-4, 10px);
  }

  background-color: rgba(255, 255, 255, .07);
}


</style>
