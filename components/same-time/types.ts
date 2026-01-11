export interface Location {
  name: string
  countryName: string
  countryCode: string
  timezone: string
  alternativeName: string
  mainCities: string[]
  currentTimeOffsetInMinutes: number
  isSimilarTime: boolean
  localHour: number
  localMinute: number
  languages: (string | LanguageInfo)[]
  emoji: string
}

export interface LanguageInfo {
  code: string
  name: string
  display: string
}

export interface LocationAutocompleteProps {
  locations: Location[]
  onSelect: (location: Location) => void
  initialLocation?: Location
  'aria-label'?: string
  showAllCountries?: boolean
  priorityCountries?: string[]
  className?: string
}

export interface LanguageAutocompleteProps {
  languages: (string | LanguageInfo)[]
  onSelect: (language: string) => void
  initialValue?: string
  'aria-label'?: string
  className?: string
  placeholder?: string
  mobilePlaceholder?: string
}

export interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  'aria-label'?: string
  className?: string
  children: React.ReactNode
}

export type TimeType = 'All' | 'Same Time' | 'Close Time' | 'Reverse Time'
export type TimeOfDay = 'All' | 'Early Morning' | 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Late Night'
export type SortField = 'country' | 'type'

export interface UserTimezone {
  name: string
  countryName: string
  alternativeName: string
  currentTimeOffsetInMinutes: number
  languages: (string | LanguageInfo)[]
}

export interface FilterControlsProps {
  locations: Location[]
  userTimezone: UserTimezone | null
  availableLanguages: (string | LanguageInfo)[]
  selectedTimeType: TimeType
  selectedTimeOfDay: TimeOfDay
  selectedLanguage: string
  onLocationChange: (location: Location) => void
  onTimeTypeChange: (type: TimeType) => void
  onTimeOfDayChange: (timeOfDay: TimeOfDay) => void
  onLanguageChange: (language: string) => void
  availableTimesOfDay: TimeOfDay[]
  onReset: () => void
  languageAutocompleteRef: React.RefObject<{ reset: () => void }>
  showAllCountries: boolean
  onShowAllCountriesChange: (showAll: boolean) => void
  scrollMode: 'pagination' | 'infinite'
  onScrollModeChange: (mode: 'pagination' | 'infinite') => void
  selectedLocations?: Location[]
}

export interface LocationsTableProps {
  locations: Location[]
  userTimezone: UserTimezone | null
  onLocationChangeAction: (location: Location, searchedCity?: string) => void
  selectedTimeType: TimeType
  selectedTimeOfDay: TimeOfDay
  showAllCountries: boolean
  priorityCountries: string[]
  scrollMode: 'pagination' | 'infinite'
  onScrollModeChange?: (mode: 'pagination' | 'infinite') => void
  searchedCity?: string | null
}