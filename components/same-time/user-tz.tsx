'use client'

import type { UserTimezone, Location } from './types'
import { getTimeOfDay, formatTimezoneName } from './utils'
import { languages, type TLanguageCode } from 'countries-list'
import { useLiveTime } from '@/hooks/use-live-time'
import NumberFlow, { NumberFlowGroup } from "@number-flow/react"
import { formatInTimeZone } from 'date-fns-tz'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import ReactCountryFlag from 'react-country-flag'

interface UserTimezoneInfoProps {
  userTimezone: UserTimezone | null
}

interface LanguageInfo {
  code: string
  name: string
}

const formatLanguages = (langs: Array<string | { code: string; name: string }>) => {
  return langs.map(lang => {
    if (typeof lang === 'string') {
      return languages[lang as TLanguageCode]?.name || lang
    }
    return lang.name
  }).join(', ')
}

export function UserTimezoneInfo({ userTimezone }: UserTimezoneInfoProps) {
  if (!userTimezone) {
    return (
      <motion.div
        className="font-mono space-y-2"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="h-5 w-64 bg-gray-200 rounded" />
        <div className="h-5 w-48 bg-gray-200 rounded" />
        <div className="h-5 w-40 bg-gray-200 rounded" />
        <div className="h-5 w-96 bg-gray-200 rounded" />
      </motion.div>
    )
  }

  const timeValues = useLiveTime(userTimezone.currentTimeOffsetInMinutes)
  const timeOfDay = getTimeOfDay(timeValues.rawHours)
  const now = new Date()
  const formattedDate = formatInTimeZone(now, 'UTC', 'EEEE MMMM do, yyyy')

  return (
    <div className="font-mono space-y-2">
      <h3 className="text-sm md:text-base font-semibold italic">{formattedDate}</h3>
      <h2 className="text-xs md:text-sm font-semibold">Your Time Zone: {formatTimezoneName(userTimezone.name)}</h2>
      <p className="text-xs md:text-sm">
        Local Time:{' '}
        <NumberFlowGroup>
          <span className="inline-flex items-center font-mono">
            <NumberFlow 
              value={timeValues.hours}
              format={{ useGrouping: false }}
            />
            <span>:</span>
            <NumberFlow 
              value={timeValues.minutes}
              format={{ 
                minimumIntegerDigits: 2,
                useGrouping: false
              }}
            />
            <span>:</span>
            <NumberFlow 
              value={timeValues.seconds}
              format={{ 
                minimumIntegerDigits: 2,
                useGrouping: false
              }}
            />
            <span> {timeValues.isAM ? 'AM' : 'PM'}</span>
          </span>
        </NumberFlowGroup>
      </p>
      <p className="text-xs md:text-sm font-semibold text-gray-500">Time of Day: {timeOfDay}</p>
      <div className="text-xs md:text-sm font-semibold text-gray-500">
        Official Languages: {userTimezone.languages.map(lang => {
          if (typeof lang === 'string') {
            return languages[lang as TLanguageCode]?.name || lang
          }
          return (lang as LanguageInfo).name
        }).join(', ')}
      </div>
    </div>
  )
}

interface SelectedTimezoneInfoProps {
  selectedLocation: Location
  onClear: () => void
}

export function SelectedTimezoneInfo({ selectedLocation, onClear }: SelectedTimezoneInfoProps) {
  const timeValues = useLiveTime(selectedLocation.currentTimeOffsetInMinutes)
  const timeOfDay = getTimeOfDay(timeValues.rawHours)
  const now = new Date()
  const formattedDate = formatInTimeZone(now, 'UTC', 'EEEE MMMM do, yyyy')

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -20 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="font-mono space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800 relative">
        <button
          onClick={onClear}
          className="absolute top-2 right-2 p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </button>
        
        <div className="flex items-center gap-2">
          <ReactCountryFlag
            countryCode={selectedLocation.countryCode}
            className="w-6 h-6"
            svg
          />
          <h2 className="text-xs md:text-sm font-semibold text-blue-900 dark:text-blue-100">
            Selected Time Zone: {formatTimezoneName(selectedLocation.alternativeName)}
          </h2>
        </div>
        
        <p className="text-xs md:text-sm font-semibold text-blue-800 dark:text-blue-200">
          {selectedLocation.countryName}
        </p>
        
        {selectedLocation.mainCities.length > 0 && (
          <p className="text-xs md:text-sm text-blue-700 dark:text-blue-300">
            Cities: {selectedLocation.mainCities.slice(0, 3).join(', ')}
            {selectedLocation.mainCities.length > 3 && ` +${selectedLocation.mainCities.length - 3} more`}
          </p>
        )}
        
        <p className="text-xs md:text-sm text-blue-900 dark:text-blue-100">
          Local Time:{' '}
          <NumberFlowGroup>
            <span className="inline-flex items-center font-mono font-semibold">
              <NumberFlow 
                value={timeValues.hours}
                format={{ useGrouping: false }}
              />
              <span>:</span>
              <NumberFlow 
                value={timeValues.minutes}
                format={{ 
                  minimumIntegerDigits: 2,
                  useGrouping: false
                }}
              />
              <span>:</span>
              <NumberFlow 
                value={timeValues.seconds}
                format={{ 
                  minimumIntegerDigits: 2,
                  useGrouping: false
                }}
              />
              <span> {timeValues.isAM ? 'AM' : 'PM'}</span>
            </span>
          </NumberFlowGroup>
        </p>
        
        <p className="text-xs md:text-sm font-semibold text-blue-700 dark:text-blue-300">
          Time of Day: {timeOfDay}
        </p>
        
        <div className="text-xs md:text-sm font-semibold text-blue-700 dark:text-blue-300">
          Official Languages: {selectedLocation.languages.map(lang => {
            if (typeof lang === 'string') {
              return languages[lang as TLanguageCode]?.name || lang
            }
            return (lang as LanguageInfo).name
          }).join(', ')}
        </div>
      </div>
    </motion.div>
  )
} 