'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { TableSkeleton } from './table-skeleton'
import LocationsTable from './locations-table'
import { FilterControls } from './filter-controls'
import { UserTimezoneInfo } from './user-tz'
import { fetchLocations } from '@/lib/api'
import type { Location, UserTimezone, TimeType, TimeOfDay } from './types'
import { getLocalTime, getTimeType, getTimeOfDay } from './utils'
import { useToast } from '@/hooks/use-toast'

export default function SameTime() {
  const { toast } = useToast()
  const languageAutocompleteRef = useRef<{ reset: () => void }>(null)

  // 1. All useState hooks
  const [data, setData] = useState<{
    locations: Location[]
    userTimezone: UserTimezone | null
  }>({
    locations: [],
    userTimezone: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userTime, setUserTime] = useState<`${number}:${number} ${'AM' | 'PM'}`>('12:00 AM')
  const [selectedTimeType, setSelectedTimeType] = useState<TimeType>('All')
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDay>('All')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All')

  // 2. All useCallback hooks
  const fetchAndUpdateLocations = useCallback(async (timezone: string) => {
    setLoading(true)
    setError(null)
    try {
      const newData = await fetchLocations(timezone)
      setData(newData)
      if (newData.userTimezone) {
        const time = getLocalTime(newData.userTimezone.currentTimeOffsetInMinutes)
        if (/^\d{1,2}:\d{2} (AM|PM)$/.test(time)) {
          setUserTime(time as `${number}:${number} ${'AM' | 'PM'}`)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations')
    } finally {
      setLoading(false)
    }
  }, [])

  // 3. All useEffect hooks
  useEffect(() => {
    const interval = setInterval(() => {
      if (data.userTimezone) {
        const time = getLocalTime(data.userTimezone.currentTimeOffsetInMinutes)
        if (/^\d{1,2}:\d{2} (AM|PM)$/.test(time)) {
          setUserTime(time as `${number}:${number} ${'AM' | 'PM'}`)
        }
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [data.userTimezone])

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetchAndUpdateLocations(timezone)
  }, [fetchAndUpdateLocations])

  // 4. All useMemo hooks
  const filteredLocations = useMemo(() => 
    data.locations.filter(location => {
      const timeType = getTimeType(
        location.currentTimeOffsetInMinutes, 
        data.userTimezone?.currentTimeOffsetInMinutes || 0,
        location.isSimilarTime
      )
      const languageMatch = selectedLanguage === 'All' || location.languages.includes(selectedLanguage)
      const timeTypeMatch = selectedTimeType === 'All' || timeType === selectedTimeType
      const timeOfDayMatch = selectedTimeOfDay === 'All' || getTimeOfDay(location.localHour) === selectedTimeOfDay
      return (timeType === 'Same Time' || timeType === 'Similar Time' || timeType === 'Reverse Time') 
        && languageMatch 
        && timeTypeMatch
        && timeOfDayMatch
    }),
    [
      data.locations, 
      data.userTimezone?.currentTimeOffsetInMinutes,
      selectedLanguage,
      selectedTimeType,
      selectedTimeOfDay
    ]
  )

  const availableLanguages = useMemo(() => 
    Array.from(new Set(filteredLocations.flatMap(location => location.languages))).sort(),
    [filteredLocations]
  )

  const availableTimesOfDay = useMemo(() => {
    const timesInFilteredLocations = new Set(
      filteredLocations.map(location => getTimeOfDay(location.localHour))
    )
    
    // Always include 'All' option
    return ['All', ...Array.from(timesInFilteredLocations)] as TimeOfDay[]
  }, [filteredLocations])

  const handleReset = useCallback(() => {
    setSelectedTimeType('All')
    setSelectedTimeOfDay('All')
    setSelectedLanguage('All')
    toast({
      title: "Location has been changed",
      description: "All filters have been reset to show all locations",
    })
  }, [toast])

  // 5. Then conditional returns
  if (error) {
    return (
      <div role="alert" className="p-4 text-red-700 bg-red-100 rounded">
        <h2 className="font-semibold">Error loading locations</h2>
        <p>{error}</p>
        <button 
          onClick={() => fetchAndUpdateLocations(
            data.userTimezone?.name ?? Intl.DateTimeFormat().resolvedOptions().timeZone
          )}
          className="mt-2 px-4 py-2 bg-red-700 text-white rounded"
          type="button"
        >
          Retry
        </button>
      </div>
    )
  }

  if (loading && !data.locations.length) {
    return (
      <output aria-busy="true" aria-label="Loading locations">
        <TableSkeleton />
      </output>
    )
  }

  // 6. Finally, main render
  return (
    <main 
      className="mt-8 space-y-6"
      aria-label="Timezone comparison tool"
    >
      <UserTimezoneInfo 
        userTimezone={data.userTimezone} 
        userTime={userTime} 
      />
      {loading && (
        <output 
          className="text-sm text-gray-500"
          aria-live="polite"
        >
          Updating locations...
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
        onLocationChange={(location) => {
          setSelectedTimeType('All')
          setSelectedTimeOfDay('All')
          setSelectedLanguage('All')
          if (languageAutocompleteRef.current) {
            languageAutocompleteRef.current.reset()
          }
          fetchAndUpdateLocations(location.timezone)
          toast({
            title: "Location Changed",
            description: "Location has been updated and filters have been reset",
          })
        }}
        onTimeTypeChange={setSelectedTimeType}
        onTimeOfDayChange={setSelectedTimeOfDay}
        onLanguageChange={setSelectedLanguage}
        onReset={handleReset}
        languageAutocompleteRef={languageAutocompleteRef}
      />
      <LocationsTable 
        locations={data.locations}
        userTimezone={data.userTimezone}
        onLocationChangeAction={(location) => {
          fetchAndUpdateLocations(location.timezone)
        }}
        selectedLanguage={selectedLanguage}
        selectedTimeType={selectedTimeType}
        selectedTimeOfDay={selectedTimeOfDay}
      />
    </main>
  )
} 