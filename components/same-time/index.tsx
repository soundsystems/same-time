'use client'

import { useEffect, useState, useCallback, useMemo, useRef, useLayoutEffect } from 'react'
import { TableSkeleton } from './table-skeleton'
import LocationsTable from './locations-table'
import { FilterControls } from './filter-controls'
import { UserTimezoneInfo } from './user-tz'
import { fetchLocations } from '@/lib/api'
import type { Location, UserTimezone, TimeType, TimeOfDay, LanguageInfo } from './types'
import { getLocalTime, getTimeType, getTimeOfDay } from './utils'
import { useToast } from '@/hooks/use-toast'
import { languages, type TLanguageCode } from 'countries-list'
import { LocationAutocomplete } from '@/components/autocomplete/location-autocomplete'

export const PRIORITY_COUNTRIES = [
  'Albania', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Belarus', 'Belgium',
  'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'China',
  'Colombia', 'Croatia', 'Czechia', 'Denmark', 'Finland', 'France', 'Germany',
  'Greece', 'Hungary', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Kazakhstan', 'Korea', 'Latvia', 'Lithuania', 'Luxembourg',
  'Malaysia', 'Mexico', 'Moldova', 'Netherlands', 'New Zealand', 'North Macedonia',
  'Norway', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia',
  'Serbia', 'Slovakia', 'Slovenia', 'South Africa', 'Spain', 'Sweden',
  'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 'Ukraine', 'United Kingdom',
  'United States', 'Venezuela'
]

export default function SameTime() {
  const { toast } = useToast()
  const languageAutocompleteRef = useRef<{ reset: () => void; }>({ reset: () => {} })
  const [mounted, setMounted] = useState(false)

  // 1. All useState hooks
  const [data, setData] = useState<{
    locations: Location[]
    userTimezone: UserTimezone | null
  }>({
    locations: [],
    userTimezone: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeType, setSelectedTimeType] = useState<TimeType>('All')
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDay>('All')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All')
  const [showAllCountries, setShowAllCountries] = useState(false)
  const [scrollMode, setScrollMode] = useState<'pagination' | 'infinite'>('pagination')
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  // Handle hydration using useLayoutEffect
  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  // 2. All useCallback hooks
  const fetchAndUpdateLocations = useCallback(async (timezone: string, showToast?: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const newData = await fetchLocations(timezone)
      setData(newData)
      if (showToast) {
        toast({
          title: "Location Changed",
          description: `Switched to ${newData.userTimezone?.countryName} (${newData.userTimezone?.alternativeName}) time`,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations')
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to fetch locations',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Initial data fetch - moved inside useEffect
  useEffect(() => {
    if (mounted) {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      fetchAndUpdateLocations(userTimezone, false)
    }
  }, [mounted, fetchAndUpdateLocations])

  const handleLocationChange = useCallback((location: Location) => {
    setSelectedLocation(location)
    setSelectedTimeType('All')
    setSelectedTimeOfDay('All')
    setSelectedLanguage('All')
    if (languageAutocompleteRef.current) {
      languageAutocompleteRef.current.reset()
    }
    fetchAndUpdateLocations(location.timezone, true)
  }, [fetchAndUpdateLocations])

  const handleReset = useCallback(() => {
    setSelectedTimeType('All')
    setSelectedTimeOfDay('All')
    setSelectedLanguage('All')
    if (languageAutocompleteRef.current) {
      languageAutocompleteRef.current.reset()
    }
    toast({
      title: "Filters Reset",
      description: "All filters have been reset to their default values",
    })
  }, [toast])

  const handleShowAllCountriesChange = useCallback((showAll: boolean) => {
    setShowAllCountries(showAll)
    if (!showAll) {
      setScrollMode('pagination')
    }
  }, [])

  const handleScrollModeChange = useCallback((mode: 'pagination' | 'infinite') => {
    setScrollMode(mode)
  }, [])

  // Calculate available languages
  const availableLanguages = useMemo(() => {
    // First filter locations based on time type and time of day
    const filteredLocations = data.locations.filter(location => {
      const timeType = getTimeType(
        location.currentTimeOffsetInMinutes,
        data.userTimezone?.currentTimeOffsetInMinutes || 0,
        location.isSimilarTime
      )
      const timeOfDay = getTimeOfDay(location.localHour)

      const matchesTimeType = selectedTimeType === 'All' || timeType === selectedTimeType
      const matchesTimeOfDay = selectedTimeOfDay === 'All' || timeOfDay === selectedTimeOfDay

      return matchesTimeType && matchesTimeOfDay
    })

    // Then get languages only from filtered locations
    const langMap = new Map<string, LanguageInfo>()
    for (const location of filteredLocations) {
      for (const lang of location.languages) {
        if (typeof lang === 'string') {
          // This shouldn't happen anymore, but handle it just in case
          const code = lang.toLowerCase()
          if (!langMap.has(code)) {
            langMap.set(code, {
              code,
              name: languages[code as TLanguageCode]?.name || code,
              display: `${languages[code as TLanguageCode]?.name || code} (${code})`
            })
          }
        } else {
          if (!langMap.has(lang.code)) {
            langMap.set(lang.code, lang)
          }
        }
      }
    }
    return Array.from(langMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [data.locations, data.userTimezone?.currentTimeOffsetInMinutes, selectedTimeType, selectedTimeOfDay])

  // Calculate available times of day
  const availableTimesOfDay = useMemo(() => {
    const timeSet = new Set<TimeOfDay>()
    for (const location of data.locations) {
      const timeOfDay = getTimeOfDay(location.localHour)
      if (
        timeOfDay === 'Early Morning' || 
        timeOfDay === 'Morning' || 
        timeOfDay === 'Afternoon' || 
        timeOfDay === 'Evening' || 
        timeOfDay === 'Night' || 
        timeOfDay === 'Late Night'
      ) {
        timeSet.add(timeOfDay)
      }
    }
    return Array.from(timeSet).sort() as TimeOfDay[]
  }, [data.locations])

  // If not mounted yet, return null to avoid hydration mismatch
  if (!mounted) {
    return (
      <main className="mt-8 space-y-6">
        <div className="animate-pulse">
          <TableSkeleton />
        </div>
      </main>
    )
  }

  return (
    <main 
      className="mt-8 space-y-6"
      aria-label="Timezone comparison tool"
    >
      <UserTimezoneInfo 
        userTimezone={data.userTimezone}
      />
      {loading && (
        <output 
          className="text-sm text-gray-500"
          aria-live="polite"
        >
          Updating locations...
        </output>
      )}
      {error && (
        <output 
          className="text-sm text-red-500"
          aria-live="assertive"
        >
          Error: {error}
        </output>
      )}
      <FilterControls 
        locations={data.locations}
        userTimezone={data.userTimezone}
        availableLanguages={availableLanguages}
        availableTimesOfDay={availableTimesOfDay}
        selectedTimeType={selectedTimeType}
        selectedTimeOfDay={selectedTimeOfDay}
        selectedLanguage={selectedLanguage}
        onLocationChange={handleLocationChange}
        onTimeTypeChange={setSelectedTimeType}
        onTimeOfDayChange={setSelectedTimeOfDay}
        onLanguageChange={setSelectedLanguage}
        onReset={handleReset}
        languageAutocompleteRef={languageAutocompleteRef}
        showAllCountries={showAllCountries}
        onShowAllCountriesChange={handleShowAllCountriesChange}
        scrollMode={scrollMode}
        onScrollModeChange={handleScrollModeChange}
      />
      <LocationsTable 
        locations={data.locations}
        userTimezone={data.userTimezone}
        onLocationChangeAction={handleLocationChange}
        selectedLanguage={selectedLanguage}
        selectedTimeType={selectedTimeType}
        selectedTimeOfDay={selectedTimeOfDay}
        showAllCountries={showAllCountries}
        priorityCountries={PRIORITY_COUNTRIES}
        scrollMode={scrollMode}
        onScrollModeChange={handleScrollModeChange}
      />
    </main>
  )
} 