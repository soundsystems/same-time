import { useState, useEffect, useCallback } from 'react'

export function useLiveTime(offsetInMinutes: number) {
  const getTimeValues = useCallback((date: Date) => {
    const localTime = new Date(date.getTime() + offsetInMinutes * 60000)
    const hours = localTime.getUTCHours()
    const minutes = localTime.getUTCMinutes()
    const seconds = localTime.getUTCSeconds()
    // Convert to 12-hour format
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return {
      hours: hours12,
      minutes,
      seconds,
      rawHours: hours
    }
  }, [offsetInMinutes])

  const [timeValues, setTimeValues] = useState(() => getTimeValues(new Date()))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeValues(getTimeValues(new Date()))
    }, 1000)

    return () => clearInterval(timer)
  }, [getTimeValues])

  return {
    hours: timeValues.hours,
    minutes: timeValues.minutes,
    seconds: timeValues.seconds,
    rawHours: timeValues.rawHours,
    isAM: timeValues.rawHours < 12
  }
} 