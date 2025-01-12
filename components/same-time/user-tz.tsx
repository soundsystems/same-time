'use client'

import type { UserTimezone } from './types'
import { getTimeOfDay } from './utils'
import { languages, type TLanguageCode } from 'countries-list'
import { useLiveTime } from '@/hooks/use-live-time'
import NumberFlow, { NumberFlowGroup } from "@number-flow/react"

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
      <div className="font-mono space-y-2 animate-pulse">
        <div className="h-5 w-64 bg-gray-200 rounded" />
        <div className="h-5 w-48 bg-gray-200 rounded" />
        <div className="h-5 w-40 bg-gray-200 rounded" />
        <div className="h-5 w-96 bg-gray-200 rounded" />
      </div>
    )
  }

  const timeValues = useLiveTime(userTimezone.currentTimeOffsetInMinutes)
  const timeOfDay = getTimeOfDay(timeValues.rawHours)

  return (
    <div className="font-mono space-y-2">
      <h2 className="text-sm font-semibold">Your Time Zone: {userTimezone.name}</h2>
      <p className="text-sm">
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
      <p className="text-sm">Time of Day: {timeOfDay}</p>
      <div className="text-sm text-gray-500">
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