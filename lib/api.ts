import type { Location, UserTimezone } from '@/components/same-time/types'

export async function fetchLocations(timezone?: string) {
  try {
    const response = await fetch(`/api/same-time?timezone=${encodeURIComponent(timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('API Response:', data)
    return data
  } catch (error) {
    console.error('Error fetching locations:', error)
    return {
      locations: [],
      userTimezone: null
    }
  }
} 