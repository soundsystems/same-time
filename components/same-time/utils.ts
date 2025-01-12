import { formatInTimeZone } from 'date-fns-tz'
import type { UserTimezone, TimeType, LanguageInfo } from './types'

export function getTimeOfDay(hour: number): string {
  switch (true) {
    case hour >= 4 && hour < 8:
      return 'Early Morning'
    case hour >= 8 && hour < 12:
      return 'Morning'
    case hour >= 12 && hour < 16:
      return 'Afternoon'
    case hour >= 16 && hour < 20:
      return 'Evening'
    case hour >= 20 && hour < 24:
      return 'Night'
    default:
      return 'Late Night'
  }
}

export function getLocalTime(offsetInMinutes: number): string {
  const now = new Date()
  const localTime = new Date(now.getTime() + offsetInMinutes * 60000)
  return formatInTimeZone(localTime, 'UTC', 'h:mm a')
}

export function getTimeType(
  offsetInMinutes: number, 
  userOffsetInMinutes: UserTimezone['currentTimeOffsetInMinutes'], 
  isSimilarTime: boolean
): string {
  const timeDiff = Math.abs((offsetInMinutes - userOffsetInMinutes) / 60)

  if (timeDiff === 0) return 'Same Time'
  if (timeDiff === 12) return 'Reverse Time'
  if (timeDiff <= 3 || isSimilarTime) return 'Close Time'
  return 'Different Time'
}

export function getTimeBadge(offsetInMinutes: number, userOffsetInMinutes: number): string | null {
  const timeDiff = (offsetInMinutes - userOffsetInMinutes) / 60

  if (timeDiff === 12) return 'Tomorrow'
  if (timeDiff === -12) return 'Yesterday'
  return null
}

export function getTypeColor(type: string): string {
  switch (type) {
    case 'Same Time':
      return 'bg-green-100 text-green-800'
    case 'Reverse Time':
      return 'bg-red-100 text-red-800'
    case 'Close Time':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function hasMatchingLanguage(
  locationLanguages: (string | LanguageInfo)[],
  userLanguages: string[]
): boolean {
  const normalizedLocationLangs = locationLanguages.map(lang => 
    typeof lang === 'string' ? lang : lang.code
  )
  return normalizedLocationLangs.some(lang => userLanguages.includes(lang))
}

export const formatTimeString = (timezone: string): `${number}:${number} ${'AM' | 'PM'}` => {
  const timeString = new Date().toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  
  if (!/^\d{1,2}:\d{2} (AM|PM)$/.test(timeString)) {
    throw new Error(`Invalid time format received for timezone: ${timezone}`);
  }
  return timeString as `${number}:${number} ${'AM' | 'PM'}`;
}; 

export function formatTimezoneName(timezone: string): string {
  // Remove region prefix (e.g., "America/")
  const withoutRegion = timezone.split('/').pop() || timezone
  // Replace underscores with spaces
  const withSpaces = withoutRegion.replace(/_/g, ' ')
  // Handle special cases like "GMT+8" or "UTC+8"
  if (withSpaces.startsWith('GMT') || withSpaces.startsWith('UTC')) {
    return withSpaces
  }
  return withSpaces
} 