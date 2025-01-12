'use client'

import { useLiveTime } from '@/hooks/use-live-time'
import { getTimeOfDay } from './utils'
import NumberFlow, { NumberFlowGroup } from "@number-flow/react"

interface TimeDisplayProps {
  offsetInMinutes: number
}

export function TimeDisplay({ offsetInMinutes }: TimeDisplayProps) {
  const { hours, minutes, rawHours, isAM } = useLiveTime(offsetInMinutes)
  const timeOfDay = getTimeOfDay(rawHours)

  return (
    <div>
      <NumberFlowGroup>
        <span className="md:hidden">
          <NumberFlow 
            value={hours}
            format={{ useGrouping: false }}
          />
          <span>:</span>
          <NumberFlow 
            value={minutes}
            format={{ 
              minimumIntegerDigits: 2,
              useGrouping: false
            }}
          />
          <span> {isAM ? 'AM' : 'PM'}</span>
        </span>
        <span className="hidden md:inline">
          <NumberFlow 
            value={hours}
            format={{ useGrouping: false }}
          />
          <span>:</span>
          <NumberFlow 
            value={minutes}
            format={{ 
              minimumIntegerDigits: 2,
              useGrouping: false
            }}
          />
          <span> {isAM ? 'AM' : 'PM'}</span>
        </span>
      </NumberFlowGroup>
      <div className="text-sm text-gray-500 whitespace-nowrap">
        <span className="md:hidden">{timeOfDay}</span>
        <span className="hidden md:inline">{timeOfDay}</span>
      </div>
    </div>
  )
} 