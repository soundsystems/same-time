'use client'

import { useState, useCallback, useMemo, useRef, useOptimistic, useTransition, useEffect } from 'react'
import LocationsTable from './locations-table'
import { FilterControls } from './filter-controls'
import { UserTimezoneInfo, SelectedTimezoneInfo } from './user-tz'
import { getLocationsAction } from '@/app/actions'
import type { Location, UserTimezone, TimeType, TimeOfDay, LanguageInfo } from './types'
import { getTimeType, getTimeOfDay, formatTimezoneName } from './utils'
import { useToast } from '@/hooks/use-toast'
import { languages, type TLanguageCode } from 'countries-list'
import { useLocationState } from '@/hooks/use-location-state'
import { AnimatePresence } from 'motion/react'

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

interface SameTimeClientProps {
  initialData: {
    locations: Location[]
    userTimezone: UserTimezone | null
  }
}

export function SameTimeClient({ initialData }: SameTimeClientProps) {
  const { toast } = useToast()
  const languageAutocompleteRef = useRef<{ reset: () => void; }>({ reset: () => {} })

  // Get location state
  const { 
    selectedTimeType: urlTimeType,
    setTimeType: setUrlTimeType, 
    selectedTimeOfDay: urlTimeOfDay,
    setTimeOfDay: setUrlTimeOfDay, 
    selectedLanguages,
    toggleLanguage,
    batchUpdate,
    selectedTimezones,
    addSelectedTimezone,
    removeSelectedTimezone,
    scrollMode: urlScrollMode,
    setScrollMode: setUrlScrollMode,
    showAllCountries: urlShowAllCountries,
    setShowAllCountries: setUrlShowAllCountries
  } = useLocationState()

  // Use optimistic state for data
  const [, startTransition] = useTransition()
  const [data, setData] = useOptimistic(
    initialData,
    (_current, newData: { locations: Location[]; userTimezone: UserTimezone | null }) => newData
  )

  const [searchedCity, setSearchedCity] = useState<string | null>(null)
  const [isDetectingTimezone, setIsDetectingTimezone] = useState<boolean>(() => {
    // Show loading if initial timezone is the default (Africa/Abidjan)
    return initialData.userTimezone?.name === 'Africa/Abidjan'
  })
  
  // Use URL state directly - no local state needed
  const showAllCountries = urlShowAllCountries
  const scrollMode = urlScrollMode
  
  // Decode selected timezones from URL strings back to Location objects
  const selectedLocations = useMemo(() => {
    return selectedTimezones
      .map(encoded => {
        const [country, tz, alt] = encoded.split('|')
        return data.locations.find(loc => 
          loc.countryName === country && 
          loc.timezone === tz && 
          loc.alternativeName === alt
        )
      })
      .filter(Boolean) as Location[]
  }, [selectedTimezones, data.locations])

  // Track if timezone detection has run to avoid re-running
  const hasDetectedTimezone = useRef(false)
  const fetchAndUpdateLocationsRef = useRef<((timezone: string, showToast?: boolean) => Promise<void>) | null>(null)

  // Use URL state directly - no need for local state duplication
  const selectedTimeType = urlTimeType
  const selectedTimeOfDay = urlTimeOfDay

  // Update handlers to only set URL state
  const handleTimeTypeChange = useCallback((type: TimeType) => {
    setUrlTimeType(type)
  }, [setUrlTimeType])

  const handleTimeOfDayChange = useCallback((timeOfDay: TimeOfDay) => {
    setUrlTimeOfDay(timeOfDay)
  }, [setUrlTimeOfDay])

  // Fetch and update locations using Server Action
  const fetchAndUpdateLocations = useCallback(async (timezone: string, showToast?: boolean) => {
    try {
      const newData = await getLocationsAction(timezone)
      startTransition(() => {
        setData(newData)
      })
      if (showToast && newData.userTimezone) {
        const userTz = newData.userTimezone as Location
        toast({
          title: "Location Changed",
          description: `Switched to ${userTz.countryName} (${formatTimezoneName(userTz.alternativeName)})`,
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to fetch locations',
        variant: "destructive"
      })
    }
  }, [toast, setData])

  // Keep ref updated with latest function
  fetchAndUpdateLocationsRef.current = fetchAndUpdateLocations

  // Detect and set user's timezone on initial mount
  // Use client-side cookie update to avoid cache revalidation and rebuild loops
  useEffect(() => {
    if (hasDetectedTimezone.current) {
      return
    }
    hasDetectedTimezone.current = true
    
    // Defer to next tick to avoid blocking initial render
    setTimeout(() => {
      try {
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        // Use initialData from first render only - UserTimezone only has 'name', not 'timezone'
        const currentTimezone = initialData.userTimezone?.name
        
        // Only update if current is default or doesn't match detected
        if (!currentTimezone || currentTimezone === 'Africa/Abidjan' || currentTimezone !== detectedTimezone) {
          // Update cookie client-side without Server Action to prevent cache revalidation
          // This avoids triggering rebuild loops
          // biome-ignore lint/security/noGlobalEval: Required for setting cookie before React hydration
          document.cookie = `timezone=${detectedTimezone}; max-age=${60 * 60 * 24 * 365}; path=/`
          
          // Fetch new data with detected timezone
          if (fetchAndUpdateLocationsRef.current) {
            fetchAndUpdateLocationsRef.current(detectedTimezone, false).then(() => {
              // Hide loading state after data is fetched
              setIsDetectingTimezone(false)
            }).catch(() => {
              // Hide loading state even on error
              setIsDetectingTimezone(false)
            })
          } else {
            setIsDetectingTimezone(false)
          }
        } else {
          // Timezone already matches, no need to fetch
          setIsDetectingTimezone(false)
        }
      } catch (err) {
        console.error('Failed to detect timezone:', err)
        setIsDetectingTimezone(false)
      }
    }, 0)
    // biome-ignore lint/correctness/useExhaustiveDependencies: Only run once on mount, use initialData from first render only
  }, []) // Empty array - only run once on mount. initialData checked on first render only.

  // Helper to check if location is user timezone
  const isUserTimezone = useCallback((location: Location) => {
    if (!data.userTimezone) {
      return false
    }
    return (
      location.countryName === data.userTimezone.countryName &&
      location.timezone === data.userTimezone.name &&
      location.alternativeName === data.userTimezone.alternativeName
    )
  }, [data.userTimezone])

  // Helper to check if two locations are the same
  const isSameLocation = useCallback((loc1: Location, loc2: Location) => {
    return (
      loc1.countryName === loc2.countryName &&
      loc1.timezone === loc2.timezone &&
      loc1.alternativeName === loc2.alternativeName
    )
  }, [])

  const handleLocationChange = useCallback((location: Location, searchedCity?: string) => {
    // If clicking user timezone, do nothing - it's always selected
    if (isUserTimezone(location)) {
      toast({
        title: "Your Time Zone",
        description: "This is your current timezone - it's always displayed",
      })
      return
    }

    // Encode location for URL storage
    const encoded = `${location.countryName}|${location.timezone}|${location.alternativeName}`
    
    // Add to selected timezones (hook handles priority ordering and max 3)
    addSelectedTimezone(encoded)
    
    // Batch URL updates to avoid History API throttling
    batchUpdate({ timeType: 'All', timeOfDay: 'All', language: [], page: 1 })
    
    // Update the searched city state
    setSearchedCity(searchedCity || null)
    
    // Show toast notification
    toast({
      title: "Location Selected",
      description: `Viewing ${location.countryName} (${formatTimezoneName(location.alternativeName)})`,
    })
  }, [batchUpdate, toast, isUserTimezone, addSelectedTimezone])

  // Handler to clear a specific selection
  const handleClearSelection = useCallback((location: Location) => {
    const encoded = `${location.countryName}|${location.timezone}|${location.alternativeName}`
    removeSelectedTimezone(encoded)
    toast({
      title: "Selection Cleared",
      description: `Removed ${location.countryName}`,
    })
  }, [removeSelectedTimezone, toast])

  const handleReset = useCallback(() => {
    // Batch all URL state updates into a single call to avoid History API throttling
    batchUpdate({
      timeType: 'All',
      timeOfDay: 'All',
      language: [],
      page: 1,
      sortField: 'type',
      sortDirection: 'asc',
      selectedTzs: [],
      scrollMode: 'pagination',
      showAll: false
    })

    // Reset local states
    setSearchedCity(null)

    toast({
      title: "Filters Reset",
      description: "All filters have been reset to their default values",
    })
  }, [toast, batchUpdate])

  const handleShowAllCountriesChange = useCallback((showAll: boolean) => {
    setUrlShowAllCountries(showAll)
    if (!showAll) {
      setUrlScrollMode('pagination')
    }
  }, [setUrlShowAllCountries, setUrlScrollMode])

  const handleScrollModeChange = useCallback((mode: 'pagination' | 'infinite') => {
    setUrlScrollMode(mode)
  }, [setUrlScrollMode])

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
    // Sort chronologically: Early Morning -> Morning -> Afternoon -> Evening -> Night -> Late Night
    const chronologicalOrder: TimeOfDay[] = [
      'Early Morning',
      'Morning',
      'Afternoon',
      'Evening',
      'Night',
      'Late Night'
    ]
    return Array.from(timeSet).sort((a, b) => {
      const indexA = chronologicalOrder.indexOf(a)
      const indexB = chronologicalOrder.indexOf(b)
      return indexA - indexB
    }) as TimeOfDay[]
  }, [data.locations])

  return (
    <div className="flex flex-col items-center min-h-screen p-4">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col items-center gap-4">
          <UserTimezoneInfo 
            userTimezone={isDetectingTimezone ? null : data.userTimezone} 
            selectedLanguages={selectedLanguages}
            onToggleLanguage={toggleLanguage}
          />
          
          <AnimatePresence mode="popLayout">
            {(selectedLocations || []).length > 0 && (
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                {(selectedLocations || []).map((location, index) => (
                  <SelectedTimezoneInfo 
                    key={`${location.countryName}-${location.timezone}-${location.alternativeName}`}
                    selectedLocation={location}
                    position={index + 1}
                    onClear={() => handleClearSelection(location)}
                    selectedLanguages={selectedLanguages}
                    onToggleLanguage={toggleLanguage}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
          
          <FilterControls 
            locations={data.locations}
            userTimezone={data.userTimezone}
            availableLanguages={availableLanguages}
            availableTimesOfDay={availableTimesOfDay}
            selectedTimeType={selectedTimeType}
            selectedTimeOfDay={selectedTimeOfDay}
            selectedLocations={selectedLocations}
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
          selectedLocations={selectedLocations}
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
