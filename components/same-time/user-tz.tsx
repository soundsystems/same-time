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
      <div className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
        Official Languages:{' '}
        <div className="inline-flex flex-wrap gap-1 mt-1">
          {userTimezone.languages.map(lang => {
            const langName = typeof lang === 'string' 
              ? languages[lang as TLanguageCode]?.name || lang 
              : (lang as LanguageInfo).name
            return (
              <span 
                key={typeof lang === 'string' ? lang : lang.code}
                className="inline-block px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-semibold"
              >
                {langName}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface SelectedTimezoneInfoProps {
  selectedLocation: Location
  position: number // 1 = most recent (blue), 2 = second (teal), 3 = third (purple)
  onClear: () => void
}

const getPositionStyles = (position: number) => {
  switch (position) {
    case 1:
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-300 dark:border-blue-700',
        text: 'text-blue-900 dark:text-blue-100',
        textSecondary: 'text-blue-700 dark:text-blue-300',
        buttonHover: 'hover:bg-blue-100 dark:hover:bg-blue-900',
        buttonText: 'text-blue-600 dark:text-blue-400'
      }
    case 2:
      return {
        bg: 'bg-teal-50 dark:bg-teal-950/30',
        border: 'border-teal-300 dark:border-teal-700',
        text: 'text-teal-900 dark:text-teal-100',
        textSecondary: 'text-teal-700 dark:text-teal-300',
        buttonHover: 'hover:bg-teal-100 dark:hover:bg-teal-900',
        buttonText: 'text-teal-600 dark:text-teal-400'
      }
    case 3:
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        border: 'border-purple-300 dark:border-purple-700',
        text: 'text-purple-900 dark:text-purple-100',
        textSecondary: 'text-purple-700 dark:text-purple-300',
        buttonHover: 'hover:bg-purple-100 dark:hover:bg-purple-900',
        buttonText: 'text-purple-600 dark:text-purple-400'
      }
    default:
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-300 dark:border-blue-700',
        text: 'text-blue-900 dark:text-blue-100',
        textSecondary: 'text-blue-700 dark:text-blue-300',
        buttonHover: 'hover:bg-blue-100 dark:hover:bg-blue-900',
        buttonText: 'text-blue-600 dark:text-blue-400'
      }
  }
}

export function SelectedTimezoneInfo({ selectedLocation, position, onClear }: SelectedTimezoneInfoProps) {
  const timeValues = useLiveTime(selectedLocation.currentTimeOffsetInMinutes)
  const timeOfDay = getTimeOfDay(timeValues.rawHours)
  const styles = getPositionStyles(position)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -20 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="overflow-hidden w-full"
    >
      <div className={`font-mono space-y-2 p-3 md:p-4 rounded-lg border-2 relative ${styles.bg} ${styles.border}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <ReactCountryFlag
              countryCode={selectedLocation.countryCode}
              className="w-5 h-5 md:w-6 md:h-6 shrink-0"
              svg
            />
            <h2 className={`text-xs md:text-sm font-semibold ${styles.text} truncate`}>
              Selected: {formatTimezoneName(selectedLocation.alternativeName)}
            </h2>
          </div>
          <button
            onClick={onClear}
            className={`shrink-0 p-1 rounded-full transition-colors ${styles.buttonHover}`}
            aria-label="Clear selection"
          >
            <X className={`h-4 w-4 ${styles.buttonText}`} />
          </button>
        </div>
        
        <p className={`text-xs md:text-sm font-semibold ${styles.text}`}>
          {selectedLocation.countryName}
        </p>
        
        {selectedLocation.mainCities.length > 0 && (
          <p className={`text-xs md:text-sm ${styles.textSecondary}`}>
            Cities: {selectedLocation.mainCities.slice(0, 3).join(', ')}
            {selectedLocation.mainCities.length > 3 && ` +${selectedLocation.mainCities.length - 3} more`}
          </p>
        )}
        
        <p className={`text-xs md:text-sm ${styles.text}`}>
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
        
        <p className={`text-xs md:text-sm font-semibold ${styles.textSecondary}`}>
          Time of Day: {timeOfDay}
        </p>
        
        <div className={`text-xs md:text-sm font-semibold ${styles.textSecondary}`}>
          Official Languages:{' '}
          <div className="inline-flex flex-wrap gap-1 mt-1">
            {selectedLocation.languages.map(lang => {
              const langCode = typeof lang === 'string' ? lang : lang.code
              const langName = typeof lang === 'string' 
                ? languages[lang as TLanguageCode]?.name || lang 
                : lang.name
              return (
                <span 
                  key={langCode}
                  className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${styles.bg} ${styles.border} border`}
                >
                  {langName}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
} 