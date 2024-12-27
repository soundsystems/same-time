export interface Location {
  name: string
  alternativeName: string
  countryName: string
  countryCode: string
  mainCities: string[]
  currentTimeOffsetInMinutes: number
  languages: string[]
  localHour: number
  timeOfDay: string
  isSimilarTime: boolean
  timezone: string
  emoji: string
}

export interface UserTimezone {
  name: string
  countryCode: string
  countryName: string
  languages: string[]
  currentTimeOffsetInMinutes: number
  emoji: string
  timeOfDay: string
}

export type SortField = 'country' | 'time' | 'type' | 'languages'
export type TimeType = 'All' | 'Same Time' | 'Similar Time' | 'Reverse Time'
export type TimeOfDay = 'Early Morning' | 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Late Night' | 'All'

// Props interfaces
export interface AnimationConfig {
  duration: number
  fadeInDuration?: number
  fadeOutDuration?: number
  rotations?: number
  scale?: [number, number, number]
  ease?: string
}

export interface FilterControlsProps {
  locations: Location[]
  userTimezone: UserTimezone | null
  availableLanguages: string[]
  availableTimesOfDay: TimeOfDay[]
  selectedTimeType: TimeType
  selectedTimeOfDay: TimeOfDay
  selectedLanguage: string
  onLocationChange: (location: Location) => void
  onTimeTypeChange: (type: TimeType) => void
  onTimeOfDayChange: (timeOfDay: TimeOfDay) => void
  onLanguageChange: (language: string) => void
  onReset: () => void
  animationConfig?: AnimationConfig
  languageAutocompleteRef: React.RefObject<{ reset: () => void } | null>
}

interface LocationsTableProps {
  locations: Location[]
  userTimezone: UserTimezone | null
  onLocationChangeAction: (location: Location) => void
  selectedLanguage: string
  selectedTimeType: TimeType
  selectedTimeOfDay: TimeOfDay
}