'use client'

import { useState, useCallback, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import ReactCountryFlag from "react-country-flag"
import type { Location, UserTimezone, TimeType, TimeOfDay, SortField } from './types'
import { 
  getTimeOfDay, 
  getLocalTime, 
  getTimeType, 
  getTimeBadge, 
  getTypeColor, 
  hasMatchingLanguage 
} from './utils'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { useOptimistic } from 'react'
import { AnimatePresence, motion } from 'motion/react'

interface LocationsTableProps {
  locations: Location[]
  userTimezone: UserTimezone | null
  onLocationChangeAction: (location: Location) => void
  selectedLanguage: string
  selectedTimeType: TimeType
  selectedTimeOfDay: TimeOfDay
}

// Add priority countries array
const PRIORITY_COUNTRIES = [
  'Albania', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Belarus', 'Belgium',
  'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'China',
  'Colombia', 'Croatia', 'Czechia', 'Denmark', 'Finland', 'France', 'Germany',
  'Greece', 'Hungary', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Kazakhstan', 'Korea', 'Latvia', 'Lithuania', 'Luxembourg',
  'Malaysia', 'Mexico', 'Moldova', 'Netherlands', 'New Zealand', 'North Macedonia',
  'Norway', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia',
  'Serbia', 'Slovakia', 'Slovenia', 'South Africa', 'Spain', 'Sweden',
  'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 'Ukraine', 'United Kingdom',
  'United States', 'Venezuela'
]

export default function LocationsTable({ 
  locations, 
  userTimezone,
  onLocationChangeAction,
  selectedLanguage,
  selectedTimeType,
  selectedTimeOfDay
}: LocationsTableProps) {
  // 1. All useState hooks
  const [sortField, setSortField] = useState<SortField>('type')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // 2. useOptimistic hook
  const [optimisticUserTimezone, setOptimisticUserTimezone] = useOptimistic(
    userTimezone,
    (state, newTimezone: UserTimezone) => ({
      ...state,
      ...newTimezone
    })
  )

  // 3. useCallback hooks
  const getMatchingLanguagesCount = useCallback((locationLanguages: string[]) => {
    if (!userTimezone?.languages) return 0
    const userLangSet = new Set(userTimezone.languages)
    return locationLanguages.filter(lang => userLangSet.has(lang)).length
  }, [userTimezone?.languages])

  const getLocationPriority = useCallback((location: Location): number => {
    if (!userTimezone) return 6
    
    const timeType = getTimeType(
      location.currentTimeOffsetInMinutes,
      userTimezone.currentTimeOffsetInMinutes,
      location.isSimilarTime
    )
    const userLangSet = new Set(userTimezone.languages)
    const hasMatchingLang = hasMatchingLanguage(
      location.languages, 
      userTimezone?.languages ?? []
    )
    
    switch (timeType) {
      case 'Same Time':
        return hasMatchingLang ? 1 : 2
      case 'Similar Time':
        return hasMatchingLang ? 3 : 4
      case 'Different Time':
        return hasMatchingLang ? 5 : 6
      default:
        return 6
    }
  }, [userTimezone])

  const sortLocations = useCallback((a: Location, b: Location) => {
    if (sortField === 'country') {
      const direction = sortDirection === 'asc' ? 1 : -1
      
      // Always put Antarctica at the bottom when sorting by country
      if (a.countryName.includes('Antarctica') && !b.countryName.includes('Antarctica')) return 1
      if (!a.countryName.includes('Antarctica') && b.countryName.includes('Antarctica')) return -1
      
      return direction * a.countryName.localeCompare(b.countryName)
    }
    
    if (sortField === 'type') {
      const typeA = getTimeType(
        a.currentTimeOffsetInMinutes,
        userTimezone?.currentTimeOffsetInMinutes || 0,
        a.isSimilarTime
      )
      const typeB = getTimeType(
        b.currentTimeOffsetInMinutes,
        userTimezone?.currentTimeOffsetInMinutes || 0,
        b.isSimilarTime
      )

      // First, compare by time type priority
      const priorityA = getTimePriority(typeA, hasMatchingLanguage(a.languages, userTimezone?.languages ?? []))
      const priorityB = getTimePriority(typeB, hasMatchingLanguage(b.languages, userTimezone?.languages ?? []))
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      // Within each time category:
      // 1. Check for Antarctica (should be last)
      if (a.countryName.includes('Antarctica') && !b.countryName.includes('Antarctica')) return 1
      if (!a.countryName.includes('Antarctica') && b.countryName.includes('Antarctica')) return -1
      
      // 2. Then prioritize specific countries
      const isPriorityA = PRIORITY_COUNTRIES.includes(a.countryName)
      const isPriorityB = PRIORITY_COUNTRIES.includes(b.countryName)
      if (isPriorityA !== isPriorityB) {
        return isPriorityA ? -1 : 1
      }

      // 3. If same priority, sort by time offset difference
      const offsetDiffA = Math.abs(a.currentTimeOffsetInMinutes - (userTimezone?.currentTimeOffsetInMinutes || 0))
      const offsetDiffB = Math.abs(b.currentTimeOffsetInMinutes - (userTimezone?.currentTimeOffsetInMinutes || 0))
      
      if (offsetDiffA !== offsetDiffB) {
        return offsetDiffA - offsetDiffB
      }

      // 4. Finally, sort by country name
      return a.countryName.localeCompare(b.countryName)
    }
    
    return 0
  }, [sortField, sortDirection, userTimezone])

  // Helper function for time priority
  const getTimePriority = useCallback((type: string, hasMatchingLang: boolean) => {
    switch (type) {
      case 'Same Time': return hasMatchingLang ? 1 : 2
      case 'Similar Time': return hasMatchingLang ? 3 : 4
      case 'Reverse Time': return hasMatchingLang ? 5 : 6
      default: return 7
    }
  }, [])

  const filterLocations = useCallback((location: Location) => {
    const timeType = getTimeType(
      location.currentTimeOffsetInMinutes, 
      userTimezone?.currentTimeOffsetInMinutes || 0,
      location.isSimilarTime
    )
    const languageMatch = selectedLanguage === 'All' || location.languages.includes(selectedLanguage)
    const timeTypeMatch = selectedTimeType === 'All' || timeType === selectedTimeType
    const timeOfDayMatch = selectedTimeOfDay === 'All' || getTimeOfDay(location.localHour) === selectedTimeOfDay
    return (timeType === 'Same Time' || timeType === 'Similar Time' || timeType === 'Reverse Time') 
      && languageMatch 
      && timeTypeMatch
      && timeOfDayMatch
  }, [
    selectedLanguage,
    selectedTimeType,
    selectedTimeOfDay,
    userTimezone?.currentTimeOffsetInMinutes
  ])

  // 4. useMemo hooks
  const filteredAndSortedLocations = useMemo(() => 
    [...locations].filter(filterLocations).sort(sortLocations),
    [locations, filterLocations, sortLocations]
  )

  const totalPages = Math.ceil(filteredAndSortedLocations.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage

  const currentItems = useMemo(() => 
    filteredAndSortedLocations.slice(indexOfFirstItem, indexOfLastItem),
    [filteredAndSortedLocations, indexOfFirstItem, indexOfLastItem]
  )

  // Pagination helpers
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  const getPageNumbers = () => {
    const pages: number[] = []
    
    // Show all pages if 6 or fewer
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    // Always show first page
    pages.push(1)

    // Calculate range after current page (show next 4 pages)
    const afterCurrent = Math.min(currentPage + 4, totalPages - 1)
    
    // If we're near the start, show more pages before ellipsis
    if (currentPage <= 3) {
      for (let i = 2; i <= afterCurrent; i++) {
        pages.push(i)
      }
      if (afterCurrent < totalPages - 1) {
        pages.push(-1) // ellipsis
      }
    } 
    // If we're near the end, show more pages after ellipsis
    else if (currentPage > totalPages - 4) {
      pages.push(-1) // ellipsis
      for (let i = totalPages - 4; i < totalPages; i++) {
        pages.push(i)
      }
    } 
    // In the middle, show ellipsis on both sides
    else {
      pages.push(-1) // first ellipsis
      for (let i = currentPage; i <= afterCurrent; i++) {
        pages.push(i)
      }
      if (afterCurrent < totalPages - 1) {
        pages.push(-1) // second ellipsis
      }
    }

    // Always show last page
    pages.push(totalPages)

    return pages
  }

  const handleKeyboardNavigation = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        if (currentPage > 1) {
          e.preventDefault()
          paginate(currentPage - 1)
        }
        break
      case 'ArrowRight':
        if (currentPage < totalPages) {
          e.preventDefault()
          paginate(currentPage + 1)
        }
        break
      case 'Home':
        if (currentPage !== 1) {
          e.preventDefault()
          paginate(1)
        }
        break
      case 'End':
        if (currentPage !== totalPages) {
          e.preventDefault()
          paginate(totalPages)
        }
        break
    }
  }

  // Event handlers
  const handleSort = useCallback((field: SortField) => {
    setCurrentPage(1)
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc')
    setSortField(field)
  }, [sortField, sortDirection])

  // Render
  return (
    <section 
      className="mt-8"
      aria-label="Timezone locations"
    >
      <h2 className="text-2xl font-semibold mb-4 font-sans">
        Locations in Your Time Zone
      </h2>

      <AnimatePresence mode="wait">
        {filteredAndSortedLocations.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Table 
              className="font-sans"
              aria-label="Locations in your timezone"
            >
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer transition-colors hover:bg-gray-100 active:bg-gray-200"
                    aria-sort={sortField === 'country' 
                      ? sortDirection === 'asc' 
                        ? 'ascending' 
                        : 'descending'
                      : 'none'
                    }
                    tabIndex={0}
                    onClick={() => handleSort('country')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSort('country')
                      }
                    }}
                    aria-label="Sort by country name"
                  >
                    <div className="flex items-center justify-between">
                      Country
                      {sortField === 'country' && (
                        <span className="ml-2" aria-hidden="true">
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead 
                    className="cursor-pointer transition-colors hover:bg-gray-100 active:bg-gray-200"
                    aria-sort={sortField === 'type' 
                      ? sortDirection === 'asc' 
                        ? 'ascending' 
                        : 'descending'
                      : 'none'
                    }
                    tabIndex={0}
                    onClick={() => handleSort('type')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSort('type')
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      Type
                      {sortField === 'type' && (
                        <span className="ml-2" aria-hidden="true">
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Languages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((location, index) => (
                  <motion.tr
                    key={`${location.countryName}-${location.alternativeName}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: "easeOut",
                      delay: index * 0.05 // Stagger each row
                    }}
                    className="transition-colors hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:outline-none"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <TableCell className="text-left">
                      <div className="flex flex-col items-start">
                        <div className="flex items-center space-x-2">
                          <ReactCountryFlag
                            countryCode={location.countryCode}
                            style={{
                              width: '1.5em',
                              height: '1.5em'
                            }}
                            svg
                          />
                          <span>{location.countryName} ({location.alternativeName})</span>
                        </div>
                        <div className="text-sm text-gray-500 ml-7">
                          {location.mainCities.join(', ')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div>
                        {getLocalTime(location.currentTimeOffsetInMinutes)}
                        <div className="text-sm text-gray-500 whitespace-nowrap">{location.timeOfDay}</div>
                        {getTimeBadge(location.currentTimeOffsetInMinutes, userTimezone?.currentTimeOffsetInMinutes || 0) && (
                          <Badge variant="outline" className="ml-2">
                            {getTimeBadge(location.currentTimeOffsetInMinutes, userTimezone?.currentTimeOffsetInMinutes || 0)}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-full text-sm whitespace-nowrap ${
                        getTypeColor(getTimeType(
                          location.currentTimeOffsetInMinutes,
                          userTimezone?.currentTimeOffsetInMinutes || 0,
                          location.isSimilarTime
                        ))
                      }`}>
                        {getTimeType(
                          location.currentTimeOffsetInMinutes,
                          userTimezone?.currentTimeOffsetInMinutes || 0,
                          location.isSimilarTime
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {location.languages.map((lang) => (
                          <span 
                            key={`${location.countryName}-${location.alternativeName}-${lang}`}
                            className={`inline-block px-2 py-1 rounded-full text-sm mr-1 mb-1 ${
                              hasMatchingLanguage([lang], userTimezone?.languages ?? []) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>

            <Pagination 
              className="mt-4"
              aria-label="Table navigation"
              onKeyDown={handleKeyboardNavigation}
              tabIndex={0}
            >
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    aria-label={`Go to previous page${currentPage > 1 ? '' : ' (disabled)'}`}
                    aria-disabled={currentPage === 1}
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage > 1) paginate(currentPage - 1)
                    }}
                  />
                </PaginationItem>

                {getPageNumbers().map((pageNum) => (
                  <PaginationItem 
                    key={pageNum === -1 ? `ellipsis-${Math.random()}` : pageNum}
                  >
                    {pageNum === -1 ? (
                      <PaginationEllipsis 
                        aria-hidden="true"
                        className="select-none"
                      />
                    ) : (
                      <PaginationLink
                        href="#"
                        isActive={pageNum === currentPage}
                        aria-label={`Page ${pageNum}${pageNum === currentPage ? ', current page' : ''}`}
                        aria-current={pageNum === currentPage ? 'page' : undefined}
                        className={cn(
                          "transition-all duration-200 ease-in-out",
                          "hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none",
                          "transform hover:scale-105",
                          pageNum === currentPage && "bg-blue-500 text-white hover:bg-blue-600"
                        )}
                        onClick={(e) => {
                          e.preventDefault()
                          paginate(pageNum)
                        }}
                      >
                        {pageNum}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    aria-label={`Go to next page${currentPage < totalPages ? '' : ' (disabled)'}`}
                    aria-disabled={currentPage >= totalPages}
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage < totalPages) paginate(currentPage + 1)
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <output 
              className="sr-only" 
              aria-live="polite"
            >
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAndSortedLocations.length)} of {filteredAndSortedLocations.length} locations
            </output>
          </motion.div>
        ) : (
          <motion.output
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            aria-live="polite"
          >
            No locations found matching the selected filters.
          </motion.output>
        )}
      </AnimatePresence>
    </section>
  )
}

