import { NextResponse } from 'next/server'
import { getTimeZones, type TimeZone } from '@vvo/tzdb'
import { formatInTimeZone } from 'date-fns-tz'
import { countries, languages, type TCountryCode, type TLanguageCode } from 'countries-list'
import countriesEmoji from 'countries-list/minimal/countries.emoji.min.json'

interface CountryData {
  name: string;
  native: string;
  languages: TLanguageCode[];
  emoji: string;
}

interface ProcessedLocation {
  name: string;
  alternativeName: string;
  countryName: string;
  countryCode: string;
  mainCities: string[];
  currentTimeOffsetInMinutes: number;
  languages: string[];
  localHour: number;
  timeOfDay: string;
  isSimilarTime: boolean;
  timezone: string;
  emoji: string;
}

// Language override mappings for countries where the ISO codes don't accurately represent the local languages
const COUNTRY_LANGUAGE_OVERRIDES: Record<string, string[]> = {
  'AQ': ['English', 'Spanish', 'Russian'],          // Antarctica
  'AW': ['Dutch', 'Papiamento'],                   // Aruba
  'CW': ['Dutch', 'Papiamento', 'English'],        // Curacao
  'BQ': ['Dutch', 'Papiamento'],                   // Bonaire
  'SX': ['Dutch', 'English'],                      // Sint Maarten
  'BL': ['French'],                                // Saint Barthélemy
  'MF': ['French'],                                // Saint Martin
}

// Language name standardization mapping
const LANGUAGE_NAME_STANDARDIZATION: Record<string, string> = {
  'pa': 'Punjabi',                    // Instead of "Panjabi / Punjabi"
  'pap': 'Papiamento',                // Explicit mapping for Papiamento
  'zh': 'Chinese',                    // Instead of "Chinese / 汉语 / 漢語"
  'fa': 'Persian',                    // Instead of "Persian / فارسی"
  'ar': 'Arabic',                     // Instead of "Arabic / العربية"
  'bn': 'Bengali',                    // Instead of "Bengali / বাংলা"
  'hi': 'Hindi',                      // Instead of "Hindi / हिन्दी"
}

function getCountryData(countryCode: TCountryCode): CountryData | null {
  const country = countries[countryCode];
  if (!country) return null;
  return {
    name: country.name,
    native: country.native,
    languages: country.languages,
    emoji: countriesEmoji[countryCode] || '🏳️'
  };
}

function standardizeLanguageName(name: string): string {
  return LANGUAGE_NAME_STANDARDIZATION[name] || name;
}

function getLanguageNames(languageCodes: TLanguageCode[]): string[] {
  return languageCodes.map(code => {
    const langName = languages[code]?.name;
    // First check if we have a standardized name for this language code
    if (LANGUAGE_NAME_STANDARDIZATION[code]) {
      return LANGUAGE_NAME_STANDARDIZATION[code];
    }
    // Otherwise return the name from the languages object or the code itself as fallback
    return langName || code;
  });
}

function getCountryLanguages(countryCode: string): string[] {
  // First check if we have an override for this country
  if (COUNTRY_LANGUAGE_OVERRIDES[countryCode]) {
    return COUNTRY_LANGUAGE_OVERRIDES[countryCode];
  }

  // Otherwise use the standard country data
  const countryData = getCountryData(countryCode as TCountryCode);
  if (!countryData) return [];
  
  return getLanguageNames(countryData.languages);
}

function getTimeOfDay(hour: number): string {
  if (hour >= 4 && hour < 8) return 'Early Morning'
  if (hour >= 8 && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 16) return 'Afternoon'
  if (hour >= 16 && hour < 20) return 'Evening'
  if (hour >= 20 && hour < 24) return 'Night'
  return 'Late Night'
}

function mergeLocations(locations: ProcessedLocation[]): ProcessedLocation[] {
  const mergedMap = new Map<string, ProcessedLocation>();

  for (const location of locations) {
    const key = `${location.countryCode}-${location.currentTimeOffsetInMinutes}`;
    
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key);
      if (existing) {
        // Merge cities without duplicates
        const allCities = [...new Set([...existing.mainCities, ...location.mainCities])];
        existing.mainCities = allCities;
      }
    } else {
      mergedMap.set(key, { ...location });
    }
  }

  return Array.from(mergedMap.values());
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timezone = searchParams.get('timezone')

    if (!timezone) {
      return NextResponse.json({ error: 'Timezone is required' }, { status: 400 })
    }

    const allTimeZones = getTimeZones()
    if (!allTimeZones || allTimeZones.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch timezones' }, { status: 500 })
    }

    const selectedTimezone = allTimeZones.find(tz => tz.name === timezone)
    if (!selectedTimezone) {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
    }

    const now = new Date()

    const locations = allTimeZones.map((tz: TimeZone) => {
      const localTime = formatInTimeZone(now, tz.name, 'yyyy-MM-dd HH:mm:ssXXX');
      const localHour = Number.parseInt(formatInTimeZone(now, tz.name, 'H'));
      const offsetInMinutes = tz.currentTimeOffsetInMinutes;

      const countryData = getCountryData(tz.countryCode as TCountryCode);
      const languages = getCountryLanguages(tz.countryCode);

      // Log any potentially problematic language assignments for monitoring
      if (process.env.NODE_ENV === 'development') {
        if (languages.includes('Punjabi') && !['IN', 'PK'].includes(tz.countryCode)) {
          console.warn(`Unexpected Punjabi language assignment for country: ${tz.countryCode}`);
        }
      }

      return {
        name: tz.name,
        alternativeName: tz.alternativeName,
        countryName: countryData?.name || tz.countryName,
        countryCode: tz.countryCode,
        mainCities: tz.mainCities,
        currentTimeOffsetInMinutes: offsetInMinutes,
        languages: languages,
        localHour: localHour,
        timeOfDay: getTimeOfDay(localHour),
        isSimilarTime: false,
        timezone: tz.name,
        emoji: countryData?.emoji || countriesEmoji[tz.countryCode as keyof typeof countriesEmoji] || '🏳️'
      };
    });

    const mergedLocations = mergeLocations(locations);

    const userLocalTime = formatInTimeZone(now, timezone, 'yyyy-MM-dd HH:mm:ssXXX')
    const userOffsetInMinutes = selectedTimezone.currentTimeOffsetInMinutes
    const userCountryData = getCountryData(selectedTimezone.countryCode as TCountryCode);
    const userLanguages = getCountryLanguages(selectedTimezone.countryCode);
    const userLocalHour = Number.parseInt(formatInTimeZone(now, timezone, 'H'));

    return NextResponse.json({
      userTimezone: {
        name: selectedTimezone.name,
        countryCode: selectedTimezone.countryCode,
        countryName: userCountryData?.name || selectedTimezone.countryName,
        languages: userLanguages,
        currentTimeOffsetInMinutes: userOffsetInMinutes,
        emoji: userCountryData?.emoji || countriesEmoji[selectedTimezone.countryCode as keyof typeof countriesEmoji] || '🏳️',
        timeOfDay: getTimeOfDay(userLocalHour)
      },
      locations: mergedLocations
    })
  } catch (error: unknown) {
    console.error('Error in API route:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
