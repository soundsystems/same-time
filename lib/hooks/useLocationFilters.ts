import { useMemo } from 'react'
import type { Location } from '@/components/same-time/types'
import { useLocationState } from './useLocationState'

export function useLocationFilters(locations: Location[]) {
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
      filtered = filtered.filter(location => location.timeOfDay === selectedTimeType)
    }

    // Apply time of day filter
    if (selectedTimeOfDay !== 'All') {
      filtered = filtered.filter(location => location.timeOfDay === selectedTimeOfDay)
    }

    // Apply language filter
    if (selectedLanguage !== 'All') {
      filtered = filtered.filter(location => 
        location.languages.includes(selectedLanguage)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortField === 'country') {
        return sortDirection === 'asc'
          ? a.countryName.localeCompare(b.countryName)
          : b.countryName.localeCompare(a.countryName)
      }
      
      // Sort by time type
      const typeOrder = { 'Same Time': 1, 'Similar Time': 2, 'Reverse Time': 3 }
      const aOrder = typeOrder[a.timeOfDay as keyof typeof typeOrder] || 4
      const bOrder = typeOrder[b.timeOfDay as keyof typeof typeOrder] || 4
      
      return sortDirection === 'asc'
        ? aOrder - bOrder
        : bOrder - aOrder
    })

    return filtered
  }, [locations, selectedTimeType, selectedTimeOfDay, selectedLanguage, sortField, sortDirection])
} 