import { useState, useCallback, useMemo, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

interface UseInfiniteScrollProps<T> {
  items: T[]
  pageSize: number
}

export function useInfiniteScroll<T>({ 
  items,
  pageSize
}: UseInfiniteScrollProps<T>) {
  const [numItemsToShow, setNumItemsToShow] = useState(pageSize)
  const [isLoading, setIsLoading] = useState(false)
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px 0px'
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
    setTimeout(() => {
      setNumItemsToShow(prev => Math.min(prev + pageSize, items.length))
      setIsLoading(false)
    }, 100)
  }, [hasMore, isLoading, items.length, pageSize])

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