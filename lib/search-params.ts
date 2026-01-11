import { parseAsString, parseAsInteger, createSearchParamsCache } from 'nuqs/server'
import type { TimeType, TimeOfDay, SortField } from '@/components/same-time/types'

// Shared parsers for both server and client
export const locationParsers = {
  language: parseAsString.withDefault('All'),
  timeType: parseAsString.withDefault<TimeType>('All'),
  timeOfDay: parseAsString.withDefault<TimeOfDay>('All'),
  page: parseAsInteger.withDefault(1),
  sortField: parseAsString.withDefault<SortField>('type'),
  sortDirection: parseAsString.withDefault<'asc' | 'desc'>('asc'),
  timezone: parseAsString, // Optional timezone param
}

// Server-side cache for accessing search params in Server Components
export const searchParamsCache = createSearchParamsCache(locationParsers)
