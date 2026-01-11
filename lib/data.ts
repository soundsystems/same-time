import { cacheTag, cacheLife } from 'next/cache'
import { getTimeZones, type TimeZone } from '@vvo/tzdb'
import { countries, languages, type TCountryCode, type TLanguageCode } from 'countries-list'
import type { Location, LanguageInfo } from '@/components/same-time/types'

const COUNTRY_LANGUAGES: Record<string, string[]> = {
  'AQ': ['en', 'es', 'ru'],
  'AW': ['nl', 'pap'],
  'CW': ['nl', 'pap', 'en'],
  'BQ': ['nl', 'pap'],
  'SX': ['nl', 'en'],
  'BL': ['fr'],
  'MF': ['fr'],
  'IN': [
    'as',  // Assamese
    'bn',  // Bengali
    'brx', // Bodo
    'doi', // Dogri
    'gu',  // Gujarati
    'hi',  // Hindi
    'kn',  // Kannada
    'ks',  // Kashmiri
    'kok', // Konkani
    'mai', // Maithili
    'ml',  // Malayalam
    'mni', // Manipuri (Meitei)
    'mr',  // Marathi
    'ne',  // Nepali
    'or',  // Odia
    'pj',  // Punjabi
    'sa',  // Sanskrit
    'sat', // Santali
    'sd',  // Sindhi
    'ta',  // Tamil
    'te',  // Telugu
    'ur',  // Urdu
    'en'   // English
  ],
  'PK': ['ur', 'en', 'pj'],
}

function getLanguageInfo(code: string): LanguageInfo {
  // Special cases for languages not in ISO standard
  const specialCases: Record<string, { name: string }> = {
    'pj': { name: 'Punjabi' },
    'brx': { name: 'Bodo' },
    'doi': { name: 'Dogri' },
    'mai': { name: 'Maithili' },
    'mni': { name: 'Manipuri' },
    'sat': { name: 'Santali' }
  }

  if (code in specialCases) {
    return {
      code,
      name: specialCases[code].name,
      display: `${specialCases[code].name} (${code})`
    }
  }

  const language = languages[code as TLanguageCode]
  return {
    code,
    name: language?.name || code,
    display: `${language?.name || code} (${code})`
  }
}

function getCountryInfo(countryCode: string) {
  // Get language codes from our custom mapping or from the countries list
  const languageCodes = COUNTRY_LANGUAGES[countryCode] || 
    (countries[countryCode as TCountryCode]?.languages || [])

  // Convert codes to LanguageInfo objects
  const uniqueLanguages = Array.from(new Set(
    languageCodes.map(code => {
      const normalizedCode = code.toLowerCase()
      return getLanguageInfo(normalizedCode)
    })
  ))

  return {
    languages: uniqueLanguages,
    emoji: countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)))
  }
}

function processTimezone(timezone: TimeZone, userTimezone?: TimeZone): Location | null {
  try {
    const countryInfo = getCountryInfo(timezone.countryCode)
    const localTime = new Date(Date.now() + (timezone.currentTimeOffsetInMinutes || 0) * 60000)
    const localHour = localTime.getUTCHours()
    const localMinute = localTime.getUTCMinutes()

    if (typeof timezone.currentTimeOffsetInMinutes !== 'number') {
      return null
    }

    // Calculate if this timezone is similar to user's timezone
    let isSimilarTime = false
    if (userTimezone && typeof userTimezone.currentTimeOffsetInMinutes === 'number') {
      const hourDiff = Math.abs(timezone.currentTimeOffsetInMinutes - userTimezone.currentTimeOffsetInMinutes) / 60
      isSimilarTime = hourDiff <= 2 // Within 2 hours difference
    }

    return {
      name: timezone.name,
      countryName: timezone.countryName,
      countryCode: timezone.countryCode,
      timezone: timezone.name,
      alternativeName: timezone.alternativeName || timezone.name,
      mainCities: timezone.mainCities,
      currentTimeOffsetInMinutes: timezone.currentTimeOffsetInMinutes,
      languages: countryInfo.languages,
      localHour,
      localMinute,
      isSimilarTime,
      emoji: countryInfo.emoji
    }
  } catch {
    return null
  }
}

function mergeLocations(locations: Location[]) {
  const merged = new Map<string, Location>()
  
  for (const location of locations) {
    if (typeof location.currentTimeOffsetInMinutes !== 'number') continue

    const key = `${location.countryCode}-${location.currentTimeOffsetInMinutes}`
    const existing = merged.get(key)
    
    if (!existing) {
      merged.set(key, location)
      continue
    }
    
    existing.mainCities = Array.from(new Set([...existing.mainCities, ...location.mainCities]))
  }
  
  return Array.from(merged.values())
}

export async function getLocationsData(timezone: string) {
  'use cache'
  // Normalize and validate timezone
  const normalizedTimezone = timezone?.trim() || 'UTC'
  cacheTag('locations', `tz-${normalizedTimezone}`)
  cacheLife('minutes') // Cache for a few minutes
  
  const allTimezones = getTimeZones()
  const userTimezone = allTimezones.find(tz => tz.name === normalizedTimezone)
  
  if (!userTimezone) {
    // Fallback to UTC-equivalent timezone (offset 0) if timezone not found
    const utcTimezone = allTimezones.find(tz => tz.currentTimeOffsetInMinutes === 0) || allTimezones[0]
    if (!utcTimezone) {
      throw new Error('Invalid timezone and UTC fallback failed')
    }
    const utcLocations = allTimezones
      .map(tz => processTimezone(tz, utcTimezone))
      .filter((tz): tz is Location => tz !== null)
    return {
      locations: mergeLocations(utcLocations),
      userTimezone: processTimezone(utcTimezone),
    }
  }

  const locations = allTimezones
    .map(tz => processTimezone(tz, userTimezone))
    .filter((tz): tz is Location => tz !== null)

  return {
    locations: mergeLocations(locations),
    userTimezone: processTimezone(userTimezone),
  }
}
