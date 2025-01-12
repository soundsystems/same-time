import { useMemo } from 'react'
import type { Location, UserTimezone } from '@/components/same-time/types'
import { useLocationState } from './useLocationState'
import { getTimeType, getTimeOfDay } from '@/components/same-time/utils'

export function useLocationFilters(locations: Location[], userTimezone: UserTimezone | null) {
  const {
    selectedTimeType,
    selectedTimeOfDay,
    selectedLanguage,
    sortField,
    sortDirection,
  } = useLocationState()

  return useMemo(() => {
    let filtered = [...locations]

    // Apply time type filter
    if (selectedTimeType !== 'All') {
      filtered = filtered.filter(location => 
        getTimeType(
          location.currentTimeOffsetInMinutes,
          userTimezone?.currentTimeOffsetInMinutes || 0,
          location.isSimilarTime
        ) === selectedTimeType
      )
    }

    // Apply time of day filter
    if (selectedTimeOfDay !== 'All') {
      filtered = filtered.filter(location => 
        getTimeOfDay(location.localHour) === selectedTimeOfDay
      )
    }

    // Apply language filter
    if (selectedLanguage !== 'All') {
      filtered = filtered.filter(location => 
        location.languages.some(lang => {
          // Extract the language code from either string or LanguageInfo object
          const langCode = typeof lang === 'string' ? lang : lang.code
          // Compare codes case-insensitively
          return langCode.toLowerCase() === selectedLanguage.toLowerCase()
        })
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortField === 'country') {
        // Always put Antarctica at the bottom when sorting by country
        if (a.countryName.includes('Antarctica') && !b.countryName.includes('Antarctica')) return 1
        if (!a.countryName.includes('Antarctica') && b.countryName.includes('Antarctica')) return -1
        
        return sortDirection === 'asc'
          ? a.countryName.localeCompare(b.countryName)
          : b.countryName.localeCompare(a.countryName)
      }
      
      // Sort by time type
      const aType = getTimeType(
        a.currentTimeOffsetInMinutes,
        userTimezone?.currentTimeOffsetInMinutes || 0,
        a.isSimilarTime
      )
      const bType = getTimeType(
        b.currentTimeOffsetInMinutes,
        userTimezone?.currentTimeOffsetInMinutes || 0,
        b.isSimilarTime
      )
      
      // First, compare by time type priority
      const typeOrder = { 'Same Time': 1, 'Close Time': 2, 'Reverse Time': 3 }
      const aOrder = typeOrder[aType as keyof typeof typeOrder] || 4
      const bOrder = typeOrder[bType as keyof typeof typeOrder] || 4
      
      if (aOrder !== bOrder) {
        return sortDirection === 'asc'
          ? aOrder - bOrder
          : bOrder - aOrder
      }

      // If same time type, sort by country name
      return sortDirection === 'asc'
        ? a.countryName.localeCompare(b.countryName)
        : b.countryName.localeCompare(a.countryName)
    })

    return filtered
  }, [locations, selectedTimeType, selectedTimeOfDay, selectedLanguage, sortField, sortDirection, userTimezone])
} 