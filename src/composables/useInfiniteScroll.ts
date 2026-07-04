import { nextTick } from 'vue'

export function useInfiniteScroll() {
  const handleScrollUp = async (scrollElement: HTMLElement, loadMoreFn: () => Promise<void>) => {
    if (scrollElement.scrollTop < 50) {
      const oldScrollHeight = scrollElement.scrollHeight
      const oldScrollTop = scrollElement.scrollTop

      try {
        await loadMoreFn()

        // Wait for Vue's next tick
        await nextTick()

        // Wait for virtualizer measurements in the next animation frame
        await new Promise((resolve) => requestAnimationFrame(resolve))

        const newScrollHeight = scrollElement.scrollHeight
        const delta = newScrollHeight - oldScrollHeight

        if (delta > 0) {
          scrollElement.scrollTop = oldScrollTop + delta
        }
      } catch (err) {
        console.error('Error loading older messages:', err)
      }
    }
  }

  return {
    handleScrollUp,
  }
}
