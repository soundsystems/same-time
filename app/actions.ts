'use server'

import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { getLocationsData } from '@/lib/data'

export async function updateTimezone(timezone: string) {
  // Save preference in cookie
  const cookieStore = await cookies()
  cookieStore.set('timezone', timezone, { 
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false, // Allow client to read for initial state
  })
  
  // Revalidate cached location data
  revalidateTag(`tz-${timezone}`)
  
  return { success: true, timezone }
}

export async function getLocationsAction(timezone: string) {
  // Server Action wrapper for data fetching
  // This can be called from client components
  const data = await getLocationsData(timezone)
  return data
}

export async function resetFilters() {
  const cookieStore = await cookies()
  cookieStore.delete('timezone')
  return { success: true }
}
