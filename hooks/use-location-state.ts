'use client'

import { useQueryStates } from 'nuqs'
import { locationParsers } from '@/lib/search-params'
import type { TimeType, TimeOfDay, SortField } from '@/components/same-time/types'
import { useCallback, useEffect } from 'react'

const STORAGE_KEY = 'same-time-state'

export function useLocationState() {
  const [state, setState] = useQueryStates(locationParsers, {
    shallow: true, // Prevent server re-renders on URL changes to avoid infinite loops
  })

  // Batch update function to update multiple state values at once
  // Note: startTransition is already handled by useQueryStates, so we don't need to wrap setState
  const batchUpdate = useCallback((updates: Parameters<typeof setState>[0]) => {
    setState(updates)
  }, [setState])

  const toggleLanguage = useCallback((lang: string) => {
    const current = state.language
    const isSelected = current.includes(lang)
    
    if (isSelected) {
      // Remove language
      setState({ language: current.filter(l => l !== lang), page: 1 })
    } else if (current.length < 8) {
      // Add language (max 8)
      setState({ language: [...current, lang], page: 1 })
    }
    // If already at 8, do nothing (could show toast in calling component)
  }, [state.language, setState])

  // Selected timezone management (max 3)
  const addSelectedTimezone = useCallback((encoded: string) => {
    const current = state.selectedTzs
    
    // Check if already selected
    const existingIndex = current.indexOf(encoded)
    if (existingIndex !== -1) {
      // Move to front (make it priority)
      const reordered = [encoded, ...current.filter((_, i) => i !== existingIndex)]
      setState({ selectedTzs: reordered, page: 1 })
      return
    }
    
    // Add to front, keep max 3
    const updated = [encoded, ...current].slice(0, 3)
    setState({ selectedTzs: updated, page: 1 })
  }, [state.selectedTzs, setState])

  const removeSelectedTimezone = useCallback((encoded: string) => {
    const updated = state.selectedTzs.filter(tz => tz !== encoded)
    setState({ selectedTzs: updated })
  }, [state.selectedTzs, setState])

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    
    try {
      const stateToSave = {
        selectedTzs: state.selectedTzs,
        scrollMode: state.scrollMode,
        showAll: state.showAll,
        language: state.language,
        timeType: state.timeType,
        timeOfDay: state.timeOfDay,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
    } catch (err) {
      console.error('Failed to save to localStorage:', err)
    }
  }, [state])

  // Restore from localStorage on mount if URL is empty/default
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    
    try {
      // Check if URL has any search params - if not, restore from localStorage
      const urlSearchParams = new URLSearchParams(window.location.search)
      const hasUrlParams = urlSearchParams.toString().length > 0
      
      if (!hasUrlParams) {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          // Only restore if we have valid saved state
          if (parsed && typeof parsed === 'object') {
            batchUpdate(parsed)
          }
        }
      }
    } catch (err) {
      console.error('Failed to restore from localStorage:', err)
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: Only restore once on mount
  }, []) // Only run once on mount

  return {
    selectedLanguages: state.language,
    setLanguages: (langs: string[]) => {
      setState({ language: langs, page: 1 })
    },
    toggleLanguage,
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
    // Selected timezones
    selectedTimezones: state.selectedTzs,
    setSelectedTimezones: (tzs: string[]) => {
      setState({ selectedTzs: tzs.slice(0, 3) }) // Max 3
    },
    addSelectedTimezone,
    removeSelectedTimezone,
    // Scroll mode
    scrollMode: state.scrollMode as 'pagination' | 'infinite',
    setScrollMode: (mode: 'pagination' | 'infinite') => {
      setState({ scrollMode: mode })
    },
    // Show all countries
    showAllCountries: state.showAll,
    setShowAllCountries: (showAll: boolean) => {
      setState({ showAll })
    },
    batchUpdate, // Expose batch update function
  }
} 