import { useMemo } from 'react'
import type { Location, UserTimezone } from '@/components/same-time/types'
import { getTimeType, getTimeOfDay } from '@/components/same-time/utils'
import { useLocationState } from './use-location-state'

export function useLocationFilters(
  locations: Location[], 
  userTimezone: UserTimezone | null,
  selectedLocations: Location[] = []
) {
  const { 
    selectedLanguages, 
    selectedTimeType, 
    selectedTimeOfDay,
    sortField,
    sortDirection
  } = useLocationState()

  return useMemo(() => {
    let filtered = [...locations]

    // Filter by languages if any selected (OR logic)
    if (selectedLanguages.length > 0) {
      filtered = filtered.filter(location => 
        location.languages.some(locLang => {
          const locCode = typeof locLang === 'string' ? locLang : locLang.code
          return selectedLanguages.some(selLang => 
            locCode.toLowerCase() === selLang.toLowerCase()
          )
        })
      )
    }

    // Filter by time type (proximity) if selected
    // Check if location matches proximity to ANY of the selected timezones (user + 1-3 selections)
    if (selectedTimeType !== 'All') {
      filtered = filtered.filter(location => {
        // Check against user timezone
        const typeVsUser = getTimeType(
          location.currentTimeOffsetInMinutes,
          userTimezone?.currentTimeOffsetInMinutes || 0,
          location.isSimilarTime
        )
        if (typeVsUser === selectedTimeType) {
          return true
        }

        // Check against each selected timezone
        for (const selected of selectedLocations) {
          const typeVsSelected = getTimeType(
            location.currentTimeOffsetInMinutes,
            selected.currentTimeOffsetInMinutes,
            location.isSimilarTime
          )
          if (typeVsSelected === selectedTimeType) {
            return true
          }
        }

        return false
      })
    }

    // Filter by time of day if selected
    if (selectedTimeOfDay !== 'All') {
      filtered = filtered.filter(location => {
        const timeOfDay = getTimeOfDay(location.localHour)
        return timeOfDay === selectedTimeOfDay
      })
    }

    // Sort the filtered results
    if (sortField) {
      filtered.sort((a, b) => {
        let comparison = 0

        if (sortField === 'country') {
          comparison = a.countryName.localeCompare(b.countryName)
        } else if (sortField === 'type') {
          const typeA = getTimeType(
            a.currentTimeOffsetInMinutes,
            userTimezone?.currentTimeOffsetInMinutes || 0,
            a.isSimilarTime
          )
          const typeB = getTimeType(
            b.currentTimeOffsetInMinutes,
            userTimezone?.currentTimeOffsetInMinutes || 0,
            b.isSimilarTime
          )
          
          // Check if languages match user's languages
          const hasMatchingLangA = userTimezone?.languages && a.languages.some(lang => {
            const langCode = typeof lang === 'string' ? lang : lang.code
            return userTimezone.languages.includes(langCode)
          })
          const hasMatchingLangB = userTimezone?.languages && b.languages.some(lang => {
            const langCode = typeof lang === 'string' ? lang : lang.code
            return userTimezone.languages.includes(langCode)
          })

          // Get tier based on time type and language match
          const getTier = (type: string, hasMatchingLang: boolean) => {
            switch (type) {
              case 'Synced': return hasMatchingLang ? 1 : 2
              case 'Adjacent': return hasMatchingLang ? 3 : 4
              case 'Reverse Time': return hasMatchingLang ? 5 : 6
              case 'Far Out': return hasMatchingLang ? 7 : 8
              default: return 9
            }
          }

          const tierA = getTier(typeA, hasMatchingLangA || false)
          const tierB = getTier(typeB, hasMatchingLangB || false)

          if (tierA !== tierB) {
            comparison = tierA - tierB
          } else {
            // If same tier, sort by time difference
            const diffA = Math.abs((a.currentTimeOffsetInMinutes - (userTimezone?.currentTimeOffsetInMinutes || 0)) / 60)
            const diffB = Math.abs((b.currentTimeOffsetInMinutes - (userTimezone?.currentTimeOffsetInMinutes || 0)) / 60)
            comparison = diffA - diffB
          }
        }

        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [locations, selectedLanguages, selectedTimeType, selectedTimeOfDay, userTimezone, sortField, sortDirection, selectedLocations])
} 