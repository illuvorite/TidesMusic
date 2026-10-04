<template lang="pug">
div.comment(ref="dom_container" :class="$style.comment")
  div(:class="$style.commentHeader")
    div(:class="$style.songInfo")
      img(v-if="songMeta.pic" :class="$style.songCover" :src="songMeta.pic" @error="handleCoverError")
      div(v-else :class="$style.songCoverEmpty")
        svg-icon(name="music" :class="$style.songCoverEmptyIcon")
      div(:class="$style.songText")
        div(:class="$style.songName") {{ songMeta.name }}
        div(:class="$style.songSinger") {{ songMeta.singer }}
    div(:class="$style.commentHeaderBtns")
      div(:class="$style.commentHeaderBtn" :aria-label="$t('comment__refresh')" @click="handleShowComment")
        svg(version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" style="transform: rotate(45deg);" viewBox="0 0 24 24" space="preserve")
          use(xlink:href="#icon-refresh")
      div(:class="$style.commentHeaderBtn" @click="$emit('close')")
        svg-icon(name="close")

  div(:class="$style.commentMain")
    template(v-if="available")
      header(:class="$style.tab_header")
        button(type="button" :class="[$style.commentType, { [$style.active]: tabActiveId == 'hot' }]" @click="handleToggleTab('hot')") {{ $t('comment__hot_title') }} ({{ hotComment.total }})
        button(type="button" :class="[$style.commentType, { [$style.active]: tabActiveId == 'new' }]" @click="handleToggleTab('new')") {{ $t('comment__new_title') }} ({{ newComment.total }})
      main(ref="dom_tabMain" :class="$style.tab_main")
        div(:class="$style.tab_content")
          div.scroll(ref="dom_commentHot" :class="$style.tab_content_scroll")
            p(v-if="hotComment.isLoadError" :class="$style.commentLabel" style="cursor: pointer;" @click="handleGetHotComment(currentMusicInfo, hotComment.nextPage, hotComment.limit)") {{ $t('comment__hot_load_error') }}
            p(v-else-if="hotComment.isLoading && !hotComment.list.length" :class="$style.commentLabel") {{ $t('comment__hot_loading') }}
            comment-floor(v-if="!hotComment.isLoadError && hotComment.list.length" :class="[$style.commentFloor, hotComment.isLoading ? $style.loading : null]" :comments="hotComment.list")
            p(v-else-if="!hotComment.isLoadError && !hotComment.isLoading" :class="$style.commentLabel") {{ $t('comment__no_content') }}
            div(:class="$style.pagination")
              material-pagination(:count="hotComment.total" :btn-length="5" :limit="hotComment.limit" :page="hotComment.page" @btn-click="handleToggleHotCommentPage")
        div(:class="$style.tab_content")
          div.scroll(ref="dom_commentNew" :class="$style.tab_content_scroll")
            p(v-if="newComment.isLoadError" :class="$style.commentLabel" style="cursor: pointer;" @click="handleGetNewComment(currentMusicInfo, newComment.nextPage, newComment.limit)") {{ $t('comment__new_load_error') }}
            p(v-else-if="newComment.isLoading && !newComment.list.length" :class="$style.commentLabel") {{ $t('comment__new_loading') }}
            comment-floor(v-if="!newComment.isLoadError && newComment.list.length" :class="[$style.commentFloor, newComment.isLoading ? $style.loading : null]" :comments="newComment.list")
            p(v-else-if="!newComment.isLoadError && !newComment.isLoading" :class="$style.commentLabel") {{ $t('comment__no_content') }}
            div(:class="$style.pagination")
              material-pagination(:count="newComment.total" :btn-length="5" :limit="newComment.limit" :page="newComment.page" @btn-click="handleToggleCommentPage")
    div(v-else :class="$style.unavailable")
      p {{ $t('comment__unavailable') }}

  div(v-if="available" :class="$style.commentFooter")
    span(v-show="publishTip" :class="$style.publishTip") {{ $t('comment__publish_tip') }}
    div(:class="$style.inputBar")
      input(ref="commentInput" v-model="commentText" :class="$style.input" type="text" :placeholder="$t('comment__input_ph')" @keydown.enter="handlePublish")
      svg(:class="$style.smiley" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true")
        path(d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM8.5 9.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zm7 0a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM7.5 14.1c.9 1.6 2.6 2.6 4.5 2.6s3.6-1 4.5-2.6l1.4.8c-1.2 2.1-3.4 3.4-5.9 3.4s-4.7-1.3-5.9-3.4l1.4-.8z" fill="currentColor")
      button(type="button" :class="$style.publishBtn" @click="handlePublish") {{ $t('comment__publish') }}
</template>

<script>
import { toOldMusicInfo } from '@renderer/utils'
import music from '@renderer/utils/musicSdk'
import { musicInfo as songMeta } from '@renderer/store/player/state'
import CommentFloor from './CommentFloor.vue'

export default {
  name: 'MusicComment',
  components: {
    CommentFloor,
  },
  props: {
    show: Boolean,
    musicInfo: {
      type: Object,
      required: true,
    },
  },
  emits: ['close'],
  data() {
    return {
      available: false,
      currentMusicInfo: {
        name: '',
        singer: '',
      },
      tabActiveId: 'hot',
      commentText: '',
      publishTip: false,
      newComment: {
        isLoading: false,
        isLoadError: false,
        page: 1,
        total: 0,
        maxPage: 1,
        nextPage: 1,
        limit: 20,
        list: [],
      },
      hotComment: {
        isLoading: true,
        isLoadError: true,
        page: 1,
        total: 0,
        maxPage: 1,
        nextPage: 1,
        limit: 20,
        list: [],
      },
    }
  },
  computed: {
    songMeta() {
      return songMeta
    },
  },
  watch: {
    show(n) {
      if (n) this.handleShowComment()
    },
    // playMusicInfo 是 shallowReactive，歌曲信息在详情页打开后才填充，
    // 只靠 show 触发会拿到空对象（表现为「「」的评论」+「此歌曲不支持获取评论」）。
    // 这里补一个深比较监听：歌曲真正就绪后重新加载评论。
    musicInfo: {
      handler(n) {
        if (!n?.source) return
        if (!this.show) return
        this.handleShowComment()
      },
      deep: true,
    },
  },
  mounted() {
    this.setWidth()
    window.addEventListener('resize', this.setWidth)
    // 评论按钮在播放栏上：点击时详情页与本组件同时打开，挂载时 show 已为 true，
    // `watch show`（无 immediate）永远不会触发 → currentMusicInfo 停留在初始空值，
    // 表现为「「」的评论」+「此歌曲不支持获取评论」。这里补一次初始加载。
    if (this.show) this.handleShowComment()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.setWidth)
    clearTimeout(this._tipTimer)
  },
  methods: {
    setWidth() {
      setTimeout(() => {
        // 模板 ref 在延时回调里可能已经被卸载（详情页快速开关），
        // 直接解引用会抛 "Cannot read properties of null (reading 'clientWidth')"
        // 并把异常冒到全局；这里先判空再取值。
        const el = this.$refs.dom_container
        if (!el?.parentNode) return
        el.style.width = Math.floor(el.parentNode.clientWidth * 0.5) + 'px'

        setTimeout(() => {
          this.handleToggleTab(this.tabActiveId, true)
        })
      })
    },
    handleCoverError(event) {
      event.target.style.display = 'none'
    },
    handlePublish() {
      // 未接入账号体系，暂时只做提示，不做真实发表
      if (!this.commentText.trim()) {
        this.$refs.commentInput?.focus()
        return
      }
      this.publishTip = true
      clearTimeout(this._tipTimer)
      this._tipTimer = setTimeout(() => {
        this.publishTip = false
      }, 2000)
    },
    async getComment(musicInfo, page, limit, retryNum = 0) {
      let resp
      try {
        resp = await music[musicInfo.source].comment.getComment(musicInfo, page, limit)
      } catch (error) {
        if (error.message == '取消请求' || ++retryNum > 2) throw error
        resp = await this.getComment(musicInfo, page, limit, retryNum)
      }
      return resp
    },
    async getHotComment(musicInfo, page, limit, retryNum = 0) {
      let resp
      try {
        resp = await music[musicInfo.source].comment.getHotComment(musicInfo, page, limit)
      } catch (error) {
        if (error.message == '取消请求' || ++retryNum > 2) throw error
        resp = await this.getHotComment(musicInfo, page, limit, retryNum)
      }
      return resp
    },
    handleGetNewComment(musicInfo, page, limit) {
      this.newComment.isLoadError = false
      this.newComment.isLoading = true
      this.getComment(toOldMusicInfo(musicInfo), page, limit).then(comment => {
        this.newComment.isLoading = false
        this.newComment.total = comment.total
        this.newComment.maxPage = comment.maxPage
        this.newComment.page = page
        this.newComment.list = comment.comments
        this.$nextTick(() => {
          this.$refs.dom_commentNew.scrollTo(0, 0)
        })
      }).catch(err => {
        console.log(err)
        if (err.message == '取消请求') return
        this.newComment.isLoadError = true
        this.newComment.isLoading = false
      })
    },
    handleGetHotComment(musicInfo, page, limit) {
      this.hotComment.isLoadError = false
      this.hotComment.isLoading = true
      this.getHotComment(toOldMusicInfo(musicInfo), page, limit).then(hotComment => {
        this.hotComment.isLoading = false
        this.hotComment.total = hotComment.total
        this.hotComment.maxPage = hotComment.maxPage
        this.hotComment.page = page
        this.hotComment.list = hotComment.comments
        this.$nextTick(() => {
          this.$refs.dom_commentHot.scrollTo(0, 0)
        })
      }).catch(err => {
        console.log(err)
        if (err.message == '取消请求') return
        this.hotComment.isLoadError = true
        this.hotComment.isLoading = false
      })
    },
    handleShowComment() {
      const info = this.musicInfo || {}
      // 'progress' 型才从 metadata 里取真正的歌曲信息；普通 PlayMusicInfo 直接用自身。
      // 注意 metadata 可能缺失，需同时判断，否则读 .musicInfo 会抛错。
      this.currentMusicInfo = ('progress' in info && info.metadata?.musicInfo)
        ? info.metadata.musicInfo
        : info

      // 歌曲信息尚未就绪（shallowReactive 深层变更不触发，详情页刚打开时可能还是空对象）：
      // 此时不能判定为「不支持评论」，否则会一直停在「此歌曲不支持获取评论」。
      const source = this.currentMusicInfo?.source
      if (!source) {
        this.available = false
        return
      }
      if (source == 'local' || !music[source]?.comment) {
        this.available = false
        return
      }
      this.available = true
      // if (this.musicInfo.songmid != this.currentMusicInfo.songmid) {
      this.hotComment.page = 1
      this.hotComment.total = 0
      this.hotComment.maxPage = 1
      this.hotComment.nextPage = 1

      this.newComment.page = 1
      this.newComment.total = 0
      this.newComment.maxPage = 1
      this.newComment.nextPage = 1
      // }
      this.isShowComment = true

      this.handleGetHotComment(this.currentMusicInfo, this.hotComment.page, this.hotComment.limit)
      this.handleGetNewComment(this.currentMusicInfo, this.newComment.page, this.newComment.limit)
    },
    handleToggleHotCommentPage(page) {
      this.hotComment.nextPage = page
      this.handleGetHotComment(this.currentMusicInfo, page, this.hotComment.limit)
    },
    handleToggleCommentPage(page) {
      this.newComment.nextPage = page
      this.handleGetNewComment(this.currentMusicInfo, page, this.newComment.limit)
    },
    handleToggleTab(id, force) {
      if (!this.available || (!force && this.tabActiveId == id)) return
      // 页签容器在「评论不可用 / 尚未渲染」时为 null，同样需要先判空
      const tabMain = this.$refs.dom_tabMain
      if (!tabMain) return
      switch (id) {
        case 'hot':
          tabMain.scrollLeft = 0
          break
        case 'new':
          tabMain.scrollLeft = tabMain.clientWidth
          break
      }
      this.tabActiveId = id
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.comment {
  display: flex;
  flex-flow: column nowrap;
  transition: @transition-normal;
  transition-property: transform,opacity;
  transform-origin: 100%;
  overflow: hidden;
  // 不透明深色面板：此前是带 alpha 的绿色背景，
  // 歌词/封面文字会穿透面板（表现为「评论区和歌词叠在一起」）
  background-color: #1a1e24;
  padding: 14px 24px 14px 20px;
  box-sizing: border-box;
}

.commentHeader {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
}

.songInfo {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.songCover {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: var(--qm-radius-xs, 6px);
  object-fit: cover;
  background-color: rgba(255, 255, 255, .06);
}

.songCoverEmpty {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: var(--qm-radius-xs, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, .06);
  color: rgba(255, 255, 255, .3);
}

.songCoverEmptyIcon {
  width: 40%;
  height: 40%;
  fill: currentColor;
}

.songText {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 2px;
}

.songName {
  font-size: 15px;
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--color-font);
  line-height: 1.3;
  .mixin-ellipsis-1();
}

.songSinger {
  font-size: var(--qm-fs-xs, 12px);
  color: rgba(255, 255, 255, .55);
  line-height: 1.3;
  .mixin-ellipsis-1();
}

.commentHeaderBtns {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-end;
  color: rgba(255, 255, 255, .8);
}
.commentHeaderBtn {
  height: 22px;
  width: 22px;
  cursor: pointer;
  transition: opacity @transition-normal;

  +.commentHeaderBtn {
    margin-left: 5px;
  }

  &:hover {
    opacity: .7;
  }
}
.commentMain {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.tab_header {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  gap: var(--qm-sp-6, 15px);
  padding-left: 0;
  padding-right: var(--qm-sp-4, 10px);
}
.tab_main {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: row nowrap;
  overflow: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
}
.tab_content {
  flex-shrink: 0;
  width: 100%;
  position: relative;
}
.tab_content_scroll {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  padding-left: 0;
  padding-right: var(--qm-sp-4, 10px);
  scroll-behavior: smooth;
}
.commentLabel {
  padding: var(--qm-sp-6, 15px) 0;
  color: var(--color-font-label);
  font-size: var(--qm-fs-md, 14px);
}
.commentType {
  position: relative;
  padding: 6px 2px 10px;
  margin: 0;
  font-size: 15px;
  color: rgba(255, 255, 255, .6);
  background: none;
  border: none;
  cursor: pointer;
  transition: @transition-normal;
  transition-property: opacity, color;
  &:hover {
    opacity: .8;
  }
  &.active {
    color: var(--qm-primary);
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: 2px;
      width: 18px;
      height: 3px;
      border-radius: 2px;
      background-color: var(--qm-primary);
      transform: translateX(-50%);
    }
  }
}
.commentFloor {
  opacity: 1;
  transition: opacity @transition-normal;

  &.loading {
    opacity: .4;
  }
}
.pagination {
  padding: 10px 0;
}

.commentFooter {
  flex: none;
  position: relative;
  padding-top: 10px;
}

.publishTip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 2px);
  transform: translateX(-50%);
  padding: 5px 12px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, .65);
  color: rgba(255, 255, 255, .85);
  font-size: var(--qm-fs-xs, 12px);
  white-space: nowrap;
  z-index: 3;
}

.inputBar {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  height: 42px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, .08);
  padding: 0 6px 0 18px;
}

.input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-font);
  font-size: var(--qm-fs-sm, 13px);

  &::placeholder {
    color: rgba(255, 255, 255, .38);
  }
}

.smiley {
  flex: none;
  width: 18px;
  height: 18px;
  margin: 0 10px;
  color: rgba(255, 255, 255, .5);
}

.publishBtn {
  flex: none;
  height: 32px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  background-color: var(--qm-primary);
  color: #fff;
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  transition: opacity @transition-normal;

  &:hover {
    opacity: .85;
  }
}

.unavailable {
  flex: auto;
  padding-top: 10%;
  text-align: center;
  font-size: var(--qm-fs-md, 14px);
  color: var(--color-font-label);
}

</style>
