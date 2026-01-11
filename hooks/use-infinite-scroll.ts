import { useState, useCallback, useMemo, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

interface UseInfiniteScrollProps<T> {
  items: T[]
  pageSize: number
  isMobile?: boolean
}

export function useInfiniteScroll<T>({ 
  items,
  pageSize,
  isMobile = false
}: UseInfiniteScrollProps<T>) {
  const [numItemsToShow, setNumItemsToShow] = useState(pageSize)
  const [isLoading, setIsLoading] = useState(false)
  const { ref: loadMoreRef, inView } = useInView({
    threshold: isMobile ? 0.25 : 0.1,
    rootMargin: isMobile ? '50px 0px' : '100px 0px',
    triggerOnce: false
  })

  useEffect(() => {
    if (inView && !isLoading) {
      loadMore()
    }
  }, [inView, isLoading])

  const visibleItems = useMemo(() => 
    items.slice(0, numItemsToShow),
    [items, numItemsToShow]
  )

  const hasMore = numItemsToShow < items.length

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return

    setIsLoading(true)
    const batchSize = isMobile ? Math.min(5, pageSize) : pageSize
    setNumItemsToShow(prev => Math.min(prev + batchSize, items.length))
    setIsLoading(false)
  }, [hasMore, isLoading, items.length, pageSize, isMobile])

  const setInitialItems = useCallback((count: number) => {
    setNumItemsToShow(count)
  }, [])

  const reset = useCallback(() => {
    setNumItemsToShow(pageSize)
    setIsLoading(false)
  }, [pageSize])

  return {
    items: visibleItems,
    hasMore,
    isLoading,
    loadMore,
    reset,
    setInitialItems,
    loadMoreRef: loadMoreRef
  }
} 