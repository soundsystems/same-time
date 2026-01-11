'use client'

import { useQueryStates } from 'nuqs'
import { locationParsers } from '@/lib/search-params'
import type { TimeType, TimeOfDay, SortField } from '@/components/same-time/types'
import { useTransition, useCallback } from 'react'

export function useLocationState() {
  const [isPending, startTransition] = useTransition()
  
  const [state, setState] = useQueryStates(locationParsers, {
    startTransition,
    shallow: true, // Prevent server re-renders on URL changes to avoid infinite loops
  })

  // Batch update function to update multiple state values at once
  // Note: startTransition is already handled by useQueryStates, so we don't need to wrap setState
  const batchUpdate = useCallback((updates: Parameters<typeof setState>[0]) => {
    setState(updates)
  }, [setState])

  return {
    selectedLanguage: state.language,
    setLanguage: (lang: string) => {
      setState({ language: lang, page: 1 })
    },
    selectedTimeType: state.timeType as TimeType,
    setTimeType: (type: TimeType) => {
      setState({ timeType: type, page: 1 })
    },
    selectedTimeOfDay: state.timeOfDay as TimeOfDay,
    setTimeOfDay: (timeOfDay: TimeOfDay) => {
      setState({ timeOfDay, page: 1 })
    },
    page: state.page,
    setPage: (page: number) => {
      setState({ page })
    },
    sortField: state.sortField as SortField,
    setSortField: (field: SortField) => {
      setState({ sortField: field })
    },
    sortDirection: state.sortDirection as 'asc' | 'desc',
    setSortDirection: (direction: 'asc' | 'desc') => {
      setState({ sortDirection: direction })
    },
    batchUpdate, // Expose batch update function
    isPending, // Expose loading state for UI
  }
} 