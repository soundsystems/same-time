import { formatInTimeZone } from 'date-fns-tz'
import type { TimeType, LanguageInfo, Location } from './types'

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
  userOffsetInMinutes: number,
  isSimilarTime: boolean
): string {
  const timeDiff = Math.abs((offsetInMinutes - userOffsetInMinutes) / 60)

  if (timeDiff === 0) return 'Synced'
  if (timeDiff === 12) return 'Reverse Time'
  if (timeDiff <= 3 || isSimilarTime) return 'Adjacent'
  return 'Far Out'
}

export function getTimeBadge(offsetInMinutes: number, userOffsetInMinutes: number): string | null {
  const timeDiff = (offsetInMinutes - userOffsetInMinutes) / 60

  if (timeDiff === 12) return 'Tomorrow'
  if (timeDiff === -12) return 'Yesterday'
  return null
}

export function getTypeColor(type: string): string {
  switch (type) {
    case 'Synced':
      return 'bg-green-100 text-green-800'
    case 'Reverse Time':
      return 'bg-red-100 text-red-800'
    case 'Adjacent':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function hasMatchingLanguage(
  locationLanguages: (string | LanguageInfo)[],
  userLanguages: (string | LanguageInfo)[]
): boolean {
  const normalizedLocationLangs = locationLanguages.map(lang => 
    typeof lang === 'string' ? lang : lang.code
  )
  const normalizedUserLangs = userLanguages.map(lang =>
    typeof lang === 'string' ? lang : lang.code
  )
  return normalizedLocationLangs.some(lang => normalizedUserLangs.includes(lang))
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

/**
 * Helper function to check if two locations match the selected proximity type
 */
function matchesProximity(
  locationOffset: number,
  referenceOffset: number,
  isSimilarTime: boolean,
  proximityFilter: TimeType
): boolean {
  const timeType = getTimeType(locationOffset, referenceOffset, isSimilarTime)
  return proximityFilter === 'All' || timeType === proximityFilter
}

/**
 * Get the badge info (color and label) for a location based on proximity filter with priority cascade
 * Priority: User timezone (green) > 1st selected (blue) > 2nd selected (pink) > 3rd selected (purple)
 */
export function getProximityBadgeColor(
  locationOffset: number,
  locationIsSimilarTime: boolean,
  userOffset: number,
  userCountryName: string | null,
  selectedLocations: Location[],
  proximityFilter: TimeType
): { color: string; label: string } | null {
  // If no proximity filter is active, return null
  if (proximityFilter === 'All') {
    return null
  }

  // Priority 1: Check if matches user timezone
  if (userCountryName && matchesProximity(locationOffset, userOffset, locationIsSimilarTime, proximityFilter)) {
    return {
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      label: userCountryName
    }
  }

  // Priority 2: Check if matches 1st selected timezone
  if (selectedLocations[0] && matchesProximity(
    locationOffset,
    selectedLocations[0].currentTimeOffsetInMinutes,
    locationIsSimilarTime,
    proximityFilter
  )) {
    return {
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      label: selectedLocations[0].countryName
    }
  }

  // Priority 3: Check if matches 2nd selected timezone
  if (selectedLocations[1] && matchesProximity(
    locationOffset,
    selectedLocations[1].currentTimeOffsetInMinutes,
    locationIsSimilarTime,
    proximityFilter
  )) {
    return {
      color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      label: selectedLocations[1].countryName
    }
  }

  // Priority 4: Check if matches 3rd selected timezone
  if (selectedLocations[2] && matchesProximity(
    locationOffset,
    selectedLocations[2].currentTimeOffsetInMinutes,
    locationIsSimilarTime,
    proximityFilter
  )) {
    return {
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      label: selectedLocations[2].countryName
    }
  }

  // No match - don't show badge
  return null
} 