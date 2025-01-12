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
import { useLocationState } from '@/lib/hooks/useLocationState'

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

  // Get location state setters
  const { 
    selectedTimeType: urlTimeType,
    setSelectedTimeType: setUrlTimeType, 
    selectedTimeOfDay: urlTimeOfDay,
    setSelectedTimeOfDay: setUrlTimeOfDay, 
    setSelectedLanguage, 
    setPage, 
    setSortField, 
    setSortDirection 
  } = useLocationState()

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
  const [showAllCountries, setShowAllCountries] = useState(false)
  const [scrollMode, setScrollMode] = useState<'pagination' | 'infinite'>('pagination')
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [searchedCity, setSearchedCity] = useState<string | null>(null)

  // Sync URL state with local state
  useEffect(() => {
    setSelectedTimeType(urlTimeType)
  }, [urlTimeType])

  useEffect(() => {
    setSelectedTimeOfDay(urlTimeOfDay)
  }, [urlTimeOfDay])

  // Update handlers to set both states
  const handleTimeTypeChange = useCallback((type: TimeType) => {
    setUrlTimeType(type)
    setSelectedTimeType(type)
  }, [setUrlTimeType])

  const handleTimeOfDayChange = useCallback((timeOfDay: TimeOfDay) => {
    setUrlTimeOfDay(timeOfDay)
    setSelectedTimeOfDay(timeOfDay)
  }, [setUrlTimeOfDay])

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
      if (newData.userTimezone) {
        setSelectedLocation(newData.userTimezone)
      }
      if (showToast) {
        toast({
          title: "Location Changed",
          description: `Switched to ${newData.userTimezone?.countryName} (${newData.userTimezone?.alternativeName})`,
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

  const handleLocationChange = useCallback((location: Location, searchedCity?: string) => {
    setSelectedLocation(location)
    setSelectedTimeType('All')
    setSelectedTimeOfDay('All')
    if (languageAutocompleteRef.current) {
      languageAutocompleteRef.current.reset()
    }
    fetchAndUpdateLocations(location.timezone, true)
    // Update the searched city state
    setSearchedCity(searchedCity || null)
  }, [fetchAndUpdateLocations])

  const handleReset = useCallback(() => {
    // Reset URL query states
    setUrlTimeType('All')
    setUrlTimeOfDay('All')
    setSelectedLanguage('All')
    setPage(1)
    setSortField('type')
    setSortDirection('asc')

    // Reset local states
    setSelectedTimeType('All')
    setSelectedTimeOfDay('All')
    setSelectedLocation(null)
    setSearchedCity(null)
    setShowAllCountries(false)
    setScrollMode('pagination')

    if (languageAutocompleteRef.current) {
      languageAutocompleteRef.current.reset()
    }

    // Refetch with current timezone to refresh the table
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetchAndUpdateLocations(userTimezone, false)

    toast({
      title: "Filters Reset",
      description: "All filters have been reset to their default values",
    })
  }, [toast, fetchAndUpdateLocations, setUrlTimeType, setUrlTimeOfDay, setSelectedLanguage, setPage, setSortField, setSortDirection])

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
    // First filter locations based on time type, time of day, and priority countries
    const filteredLocations = data.locations.filter(location => {
      const timeType = getTimeType(
        location.currentTimeOffsetInMinutes,
        data.userTimezone?.currentTimeOffsetInMinutes || 0,
        location.isSimilarTime
      )
      const timeOfDay = getTimeOfDay(location.localHour)

      const matchesTimeType = selectedTimeType === 'All' || timeType === selectedTimeType
      const matchesTimeOfDay = selectedTimeOfDay === 'All' || timeOfDay === selectedTimeOfDay
      const matchesPriority = showAllCountries || PRIORITY_COUNTRIES.includes(location.countryName)

      return matchesTimeType && matchesTimeOfDay && matchesPriority
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
  }, [data.locations, data.userTimezone?.currentTimeOffsetInMinutes, selectedTimeType, selectedTimeOfDay, showAllCountries])

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
      <main className="mt-8">
        <div className="animate-pulse">
          <TableSkeleton />
        </div>
      </main>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4">
      <div className="w-full max-w-screen-lg">
        <div className="flex flex-col items-center gap-4">
          <UserTimezoneInfo userTimezone={data.userTimezone} />
          <LocationAutocomplete 
            locations={data.locations} 
            onSelect={handleLocationChange}
            initialLocation={data.userTimezone || undefined}
            showAllCountries={showAllCountries}
            priorityCountries={PRIORITY_COUNTRIES}
            className="w-full max-w-[400px]"
          />
          <FilterControls 
            locations={data.locations}
            userTimezone={data.userTimezone}
            availableLanguages={availableLanguages}
            availableTimesOfDay={availableTimesOfDay}
            selectedTimeType={selectedTimeType}
            selectedTimeOfDay={selectedTimeOfDay}
            onLocationChange={handleLocationChange}
            onTimeTypeChange={handleTimeTypeChange}
            onTimeOfDayChange={handleTimeOfDayChange}
            onReset={handleReset}
            languageAutocompleteRef={languageAutocompleteRef}
            showAllCountries={showAllCountries}
            onShowAllCountriesChange={handleShowAllCountriesChange}
            scrollMode={scrollMode}
            onScrollModeChange={handleScrollModeChange}
          />
        </div>
        <LocationsTable 
          locations={data.locations}
          userTimezone={data.userTimezone}
          onLocationChangeAction={handleLocationChange}
          selectedTimeType={selectedTimeType}
          selectedTimeOfDay={selectedTimeOfDay}
          showAllCountries={showAllCountries}
          priorityCountries={PRIORITY_COUNTRIES}
          scrollMode={scrollMode}
          onScrollModeChange={handleScrollModeChange}
          searchedCity={searchedCity}
        />
      </div>
    </div>
  )
} 