import { parseAsString, parseAsInteger, parseAsArrayOf, parseAsBoolean, createSearchParamsCache } from 'nuqs/server'

// Shared parsers for both server and client
export const locationParsers = {
  language: parseAsArrayOf(parseAsString).withDefault([]),
  timeType: parseAsString.withDefault('All'),
  timeOfDay: parseAsString.withDefault('All'),
  page: parseAsInteger.withDefault(1),
  sortField: parseAsString.withDefault('type'),
  sortDirection: parseAsString.withDefault('asc'),
  timezone: parseAsString, // Optional timezone param
  selectedTzs: parseAsArrayOf(parseAsString).withDefault([]), // Format: "CountryName|timezone|altName"
  scrollMode: parseAsString.withDefault('pagination'),
  showAll: parseAsBoolean.withDefault(false),
}

// Server-side cache for accessing search params in Server Components
export const searchParamsCache = createSearchParamsCache(locationParsers)
