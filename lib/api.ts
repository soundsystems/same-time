import type { Location, UserTimezone } from '@/components/same-time/types'

export async function fetchLocations(timezone: string) {
  const response = await fetch(`/api/same-time?timezone=${encodeURIComponent(timezone)}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch locations: ${response.statusText}`)
  }
  const data = await response.json()
  if (!data.locations || !Array.isArray(data.locations)) {
    throw new Error('Invalid response: missing locations array')
  }
  return data
} 