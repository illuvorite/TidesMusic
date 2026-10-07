<template>
  <component
    :is="containerEl"
    ref="dom_scrollContainer"
    :class="containerClass"
    tabindex="0"
    style="outline: none; height: 100%; overflow-y: auto; position: relative; display: block; contain: strict;"
  >
    <component :is="contentEl" :class="contentClass" :style="contentStyle">
      <div v-for="item in views" :key="item.key" :style="item.style">
        <slot name="default" v-bind="{ item: item.item, index: item.index }" />
      </div>
    </component>
    <slot name="footer" />
  </component>
</template>

<script>
import {
  computed,
  ref,
  nextTick,
  watch,
  onMounted,
  onBeforeUnmount,
} from 'vue'

/**
 * 生成防抖函数
 * @param {*} fn
 * @param {*} delay
 */
export const debounce = (fn, delay = 100) => {
  let timer = null
  let _args = null
  return function(...args) {
    _args = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn.apply(this, _args)
    }, delay)
  }
}

const easeInOutQuad = (t, b, c, d) => {
  t /= d / 2
  if (t < 1) return (c / 2) * t * t + b
  t--
  return (-c / 2) * (t * (t - 2) - 1) + b
}
const handleScroll = (element, to, duration = 300, callback = () => {}, onCancel = () => {}) => {
  if (!element) { callback(); return }
  const start = element.scrollTop || element.scrollY || 0
  let cancel = false
  if (to > start) {
    let maxScrollTop = element.scrollHeight - element.clientHeight
    if (to > maxScrollTop) to = maxScrollTop
  } else if (to < start) {
    if (to < 0) to = 0
  } else { callback(); return }
  const change = to - start
  const increment = 10
  if (!change) { callback(); return }

  let currentTime = 0
  let val
  let cancelCallback

  const animateScroll = () => {
    currentTime += increment
    val = parseInt(easeInOutQuad(currentTime, start, change, duration))
    if (element.scrollTo) {
      element.scrollTo(0, val)
    } else {
      element.scrollTop = val
    }
    if (currentTime < duration) {
      if (cancel) {
        cancelCallback()
        onCancel()
        return
      }
      window.setTimeout(animateScroll, increment)
    } else {
      callback()
    }
  }
  animateScroll()
  return (callback) => {
    cancelCallback = callback
    cancel = true
  }
}

export default {
  name: 'VirtualizedList',
  props: {
    containerEl: {
      type: String,
      default: 'div',
    },
    containerClass: {
      type: String,
      default: 'virtualized-list',
    },
    contentEl: {
      type: String,
      default: 'div',
    },
    contentClass: {
      type: String,
      default: 'virtualized-list-content',
    },
    itemHeight: {
      type: Number,
      required: true,
    },
    keyName: {
      type: String,
      required: true,
    },
    list: {
      type: Array,
      required: true,
    },
  },
  emits: ['scroll'],
  setup(props, { emit }) {
    const views = ref([])
    const dom_scrollContainer = ref(null)
    let isListScrolling = false
    const isListScrollingRef = ref(false)
    let startIndex = -1
    let endIndex = -1
    let scrollTop = -1
    let cachedList = []
    let cancelScroll = null
    let isAutoScrolling = false
    let scrollToValue = 0

    const createList = (startIndex, endIndex) => {
      const cache = cachedList.slice(startIndex, endIndex)
      const list = props.list.slice(startIndex, endIndex).map((item, i) => {
        if (cache[i]) return cache[i]
        const top = (startIndex + i) * props.itemHeight
        const index = startIndex + i
        return cachedList[index] = {
          item,
          top,
          style: { position: 'absolute', left: 0, right: 0, top: top + 'px', height: props.itemHeight + 'px' },
          index,
          key: item[props.keyName],
        }
      })
      return list
    }

    /**
     * 页面不可见（窗口最小化 / 被其它窗口完全遮挡）时，Chromium 会冻结
     * requestAnimationFrame，回调永远不会执行 —— 而本组件的可见行是在 rAF 里算出来的。
     * 后果：在后台状态下挂载（或被 HMR 整页刷新）的列表永远算不出可见行，
     * 界面表现为「列表区域一片空白」，且切回前台也不会自愈（没有任何东西再触发重算）。
     * 因此不可见时退回 setTimeout，并在重新可见时主动重算一次。
     */
    const nextFrame = (fn) => {
      // 包一层箭头函数：直接把 fn 交给 setTimeout 会触发 no-implied-eval
      if (document.hidden) window.setTimeout(() => { fn() }, 0)
      else window.requestAnimationFrame(fn)
    }

    const updateView = (currentScrollTop) => {
      // 不要把 `dom_scrollContainer.value.scrollTop` 放进默认参数：默认参数在调用时求值，
      // 组件卸载后 ref 为 null，迟到的 setTimeout / resize 回调会抛
      // `Cannot read properties of null (reading 'scrollTop')`。
      const scrollEl = dom_scrollContainer.value
      if (!scrollEl) return
      if (currentScrollTop == null) currentScrollTop = scrollEl.scrollTop
      const itemHeight = props.itemHeight
      const currentStartIndex = Math.floor(currentScrollTop / itemHeight)
      const scrollContainerHeight = dom_scrollContainer.value.clientHeight
      const currentEndIndex = currentStartIndex + Math.ceil(scrollContainerHeight / itemHeight)
      const continuous = currentStartIndex <= endIndex && currentEndIndex >= startIndex
      const currentStartRenderIndex = Math.max(currentStartIndex, 0)
      const currentEndRenderIndex = currentEndIndex + 1
      // console.log(continuous)
      // debugger
      if (continuous) {
        // if (Math.abs(currentScrollTop - this.scrollTop) < this.itemHeight * 0.6) return
        // console.log('update')
        // if (currentScrollTop > scrollTop) { // scroll down
        //   // console.log('scroll down')
        //   views.value = createList(currentStartRenderIndex, currentEndRenderIndex)
        //   // views.value.push(...list.slice(list.indexOf(views.value[views.value.length - 1]) + 1))
        //   // // if (this.views.length > 100) {
        //   // nextTick(() => {
        //   //   views.value.splice(0, views.value.indexOf(list[0]))
        //   // })
        //   // }
        // } else if (currentScrollTop < scrollTop) { // scroll up
        //   // console.log('scroll up')
        //   views.value = createList(currentStartRenderIndex, currentEndRenderIndex)
        // } else return
        if (currentScrollTop == scrollTop && endIndex >= currentEndIndex) return
        nextFrame(() => {
          views.value = createList(currentStartRenderIndex, currentEndRenderIndex)
        })
      } else {
        nextFrame(() => {
          views.value = createList(currentStartRenderIndex, currentEndRenderIndex)
        })
      }
      startIndex = currentStartIndex
      endIndex = currentEndIndex
      scrollTop = currentScrollTop
    }

    const setStopScrollStatus = debounce(() => {
      isListScrolling = false
      isListScrollingRef.value = false
    }, 200)
    const onScroll = event => {
      if (!isListScrolling) isListScrolling = isListScrollingRef.value = true
      setStopScrollStatus()

      const currentScrollTop = dom_scrollContainer.value.scrollTop
      if (Math.abs(currentScrollTop - scrollTop) > props.itemHeight * 0.6) {
        updateView(currentScrollTop)
      }
      emit('scroll', event)
    }

    const scrollTo = (scrollTop, animate = false, onScrollEnd) => {
      if (onScrollEnd) {
        void new Promise(resolve => {
          if (cancelScroll) {
            cancelScroll(resolve)
          } else {
            resolve()
          }
        }).then(() => {
          if (animate) {
            isAutoScrolling = true
            scrollToValue = scrollTop
            cancelScroll = handleScroll(dom_scrollContainer.value, scrollTop, 300, () => {
              cancelScroll = null
              isAutoScrolling = false
              onScrollEnd(true)
            }, () => {
              cancelScroll = null
              isAutoScrolling = false
              onScrollEnd('canceled')
            })
          } else {
            dom_scrollContainer.value.scrollTop = scrollTop
          }
        })
      } else {
        dom_scrollContainer.value.scrollTo({
          top: scrollTop,
          behavior: animate ? 'smooth' : 'instant',
        })
      }
    }

    const scrollToIndex = (index, offset = 0, animate = false, onScrollEnd) => {
      scrollTo(Math.max(index * props.itemHeight + offset, 0), animate, onScrollEnd)
    }

    const getScrollTop = () => {
      return isAutoScrolling ? scrollToValue : dom_scrollContainer.value.scrollTop
    }

    const handleResize = () => {
      window.setTimeout(updateView)
    }
    // 容器高度变化（如上方页签/头部收起展开）也要重算可视窗口，
    // 否则渲染行数仍按旧高度算，容器底部会露出一片空白。
    // window.resize 只在窗口尺寸变化时触发，覆盖不到这类内部布局变化。
    let resizeObserver = null

    const contentStyle = computed(() => {
      const style = {
        display: 'block',
        height: props.list.length * props.itemHeight + 'px',
      }
      if (isListScrollingRef.value) style['pointer-events'] = 'none'
      return style
    })

    const handleReset = list => {
      cachedList = Array(list.length)
      startIndex = -1
      endIndex = -1
      if (cachedList.length) {
        void nextTick(() => {
          nextFrame(() => {
            updateView()
          })
        })
      } else {
        views.value = []
      }
    }
    watch(() => props.itemHeight, () => {
      handleReset(props.list)
    })
    watch(() => props.list, (list) => {
      handleReset(list)
    })

    // 从后台切回前台时重算一次可见行：在隐藏状态下挂载的列表此前算不出任何行，
    // 不打这一枪它就会一直是空白（rAF 解冻不会自动补跑已丢失的回调）。
    const handleVisibilityChange = () => {
      if (document.hidden) return
      handleReset(props.list)
    }

    onMounted(() => {
      dom_scrollContainer.value.addEventListener('scroll', onScroll, {
        capture: false,
        passive: true,
      })
      cachedList = Array(props.list.length)
      startIndex = -1
      endIndex = -1

      if (props.list.length) {
        void nextTick(() => {
          nextFrame(() => {
            updateView()
          })
        })
      }
      window.addEventListener('resize', handleResize)
      document.addEventListener('visibilitychange', handleVisibilityChange)
      if (typeof ResizeObserver != 'undefined' && dom_scrollContainer.value) {
        resizeObserver = new ResizeObserver(() => { window.setTimeout(updateView) })
        resizeObserver.observe(dom_scrollContainer.value)
      }
    })
    onBeforeUnmount(() => {
      dom_scrollContainer.value?.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      resizeObserver?.disconnect()
      if (cancelScroll) cancelScroll()
    })

    return {
      views,
      dom_scrollContainer,
      contentStyle,
      scrollTo,
      scrollToIndex,
      getScrollTop,
    }
  },
}
</script>
