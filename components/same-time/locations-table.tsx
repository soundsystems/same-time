'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader } from "@/components/ui/loader"
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
import { cn } from "@/lib/utils"
import { useOptimistic } from 'react'
import { AnimatePresence, motion } from "motion/react"
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { CircleArrowUp } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { languages, type TLanguageCode, type TLanguages } from 'countries-list'
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible"
import { ChevronRight, ChevronDown } from 'lucide-react'
import { LocationPagination } from './pagination'
import { TimeDisplay } from './time-display'

interface LocationsTableProps {
  locations: Location[]
  userTimezone: UserTimezone | null
  onLocationChangeAction: (location: Location) => void
  selectedLanguage: string
  selectedTimeType: TimeType
  selectedTimeOfDay: TimeOfDay
  showAllCountries: boolean
  priorityCountries: string[]
  scrollMode: 'pagination' | 'infinite'
  onScrollModeChange?: (mode: 'pagination' | 'infinite') => void
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

// Add this utility function at the top
const throttle = <T extends (...args: unknown[]) => void>(func: T, limit: number): T => {
  let inThrottle = false
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }) as T
}

export default function LocationsTable({ 
  locations, 
  userTimezone,
  onLocationChangeAction,
  selectedLanguage,
  selectedTimeType,
  selectedTimeOfDay,
  showAllCountries,
  priorityCountries,
  scrollMode = 'pagination',
  onScrollModeChange
}: LocationsTableProps) {
  // 1. All useState hooks
  const [sortField, setSortField] = useState<SortField>('type')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showPagination, setShowPagination] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})

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
    // Common filter logic
    const timeType = getTimeType(
      location.currentTimeOffsetInMinutes, 
      userTimezone?.currentTimeOffsetInMinutes || 0,
      location.isSimilarTime
    )
    const languageMatch = selectedLanguage === 'All' || location.languages.some(lang => 
      typeof lang === 'string' ? lang === selectedLanguage : lang.code === selectedLanguage
    )
    const timeTypeMatch = selectedTimeType === 'All' || timeType === selectedTimeType
    const timeOfDayMatch = selectedTimeOfDay === 'All' || getTimeOfDay(location.localHour) === selectedTimeOfDay

    // Base filters that always apply
    const baseFilters = languageMatch && timeTypeMatch && timeOfDayMatch

    // If showing all countries, only apply base filters
    if (showAllCountries) {
      return baseFilters
    }

    // If not showing all countries, also check priority
    return priorityCountries.includes(location.countryName) && baseFilters
  }, [
    selectedLanguage,
    selectedTimeType,
    selectedTimeOfDay,
    userTimezone?.currentTimeOffsetInMinutes,
    showAllCountries,
    priorityCountries
  ])

  // 4. useMemo hooks
  const filteredAndSortedLocations = useMemo(() => 
    [...locations].filter(filterLocations).sort(sortLocations),
    [locations, filterLocations, sortLocations]
  )

  const totalPages = Math.ceil(filteredAndSortedLocations.length / itemsPerPage)

  // Get paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedLocations.slice(startIndex, startIndex + itemsPerPage)
  }, [currentPage, itemsPerPage, filteredAndSortedLocations])

  // Add infinite scroll hook
  const {
    items: infiniteScrollItems,
    hasMore,
    isLoading: isLoadingMore,
    loadMore,
    loadMoreRef,
    reset: resetInfiniteScroll,
    setInitialItems
  } = useInfiniteScroll({
    items: filteredAndSortedLocations,
    pageSize: itemsPerPage
  })

  // Handle scroll mode change
  const handleShowAll = useCallback(() => {
    if (onScrollModeChange) {
      // First set all items to prevent loading more
      setInitialItems(filteredAndSortedLocations.length)
      // Then change the mode
      onScrollModeChange('infinite')
      // Reset page to 1
      setCurrentPage(1)
    }
  }, [onScrollModeChange, setInitialItems, filteredAndSortedLocations.length])

  // Reset infinite scroll only when filters change, not on mode change
  useEffect(() => {
    if (filteredAndSortedLocations.length > 0) {
      resetInfiniteScroll()
    }
  }, [filteredAndSortedLocations, resetInfiniteScroll])

  // Combine the items based on mode
  const displayedItems = useMemo(() => {
    if (scrollMode === 'infinite') {
      return infiniteScrollItems.length > 0 ? infiniteScrollItems : filteredAndSortedLocations
    }
    return paginatedItems
  }, [scrollMode, infiniteScrollItems, paginatedItems, filteredAndSortedLocations])

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

  // Watch for all countries toggle - separate from scroll mode
  useEffect(() => {
    setCurrentPage(1) // Only reset pagination when switching country filter mode
  }, []) // Run only on mount since we just want to ensure we start at page 1

  // Add scroll listener
  useEffect(() => {
    const handleScroll = throttle(() => {
      setShowScrollTop(window.scrollY > window.innerHeight * 2)
    }, 100) // Only run at most every 100ms
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Add these calculations near the other pagination-related code
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage

  return (
    <div className="relative">
      <AnimatePresence>
        {filteredAndSortedLocations.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <motion.tr layout="position" layoutId="table-header">
                  <TableHead>Country</TableHead>
                  <TableHead>Local Time</TableHead>
                  <TableHead>Time Type</TableHead>
                  <TableHead>Languages</TableHead>
                </motion.tr>
              </TableHeader>
              <TableBody>
                {displayedItems.map((location) => (
                  <motion.tr
                    key={`${location.countryName}-${location.timezone}-${location.alternativeName}`}
                    layout="position"
                    layoutId={`row-${location.countryName}-${location.timezone}`}
                    transition={{ 
                      layout: { duration: 0.3, type: "spring", stiffness: 200, damping: 30 },
                      delay: indexOfFirstItem * 0.05
                    }}
                    className={cn(
                      "hover:bg-gray-100/50 cursor-pointer transition-colors",
                      hasMatchingLanguage(
                        location.languages,
                        userTimezone?.languages ?? []
                      ) && "bg-blue-50/30"
                    )}
                    onClick={() => onLocationChangeAction(location)}
                  >
                    <motion.td 
                      layout="position" 
                      layoutId={`country-${location.countryName}-${location.timezone}`}
                      className="text-left"
                    >
                      <div className="flex flex-col items-start w-full">
                        <div className="flex items-center space-x-2">
                          <motion.div layout="preserve-aspect">
                            <ReactCountryFlag
                              countryCode={location.countryCode}
                              style={{
                                width: '1.5em',
                                height: '1.5em'
                              }}
                              svg
                            />
                          </motion.div>
                          <motion.span layout="position">
                            {location.countryName} ({location.alternativeName})
                          </motion.span>
                        </div>
                        {location.mainCities.length > 0 && (
                          <Collapsible 
                            className="w-full"
                            onOpenChange={(isOpen) => {
                              setOpenStates(prev => ({
                                ...prev,
                                [`${location.countryName}-${location.timezone}`]: isOpen
                              }))
                            }}
                          >
                            <div className="flex items-center text-xs text-gray-500">
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center gap-1 hover:text-gray-700 transition-colors cursor-pointer">
                                  <motion.div
                                    animate={{ 
                                      rotate: openStates[`${location.countryName}-${location.timezone}`] ? 90 : 0 
                                    }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </motion.div>
                                  <div className="flex items-center gap-1">
                                    <span className="truncate">{location.mainCities[0]}</span>
                                    <AnimatePresence mode="wait">
                                      {!openStates[`${location.countryName}-${location.timezone}`] && location.mainCities.length > 1 && (
                                        <motion.span 
                                          className="text-gray-400 text-[10px] flex-shrink-0"
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0, x: -10 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          +{location.mainCities.length - 1} more
                                        </motion.span>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent className="text-xs text-gray-500">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                {location.mainCities.slice(1).map((city) => (
                                  <motion.div 
                                    key={city} 
                                    className="mt-1"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    {city}
                                  </motion.div>
                                ))}
                              </motion.div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    </motion.td>
                    <motion.td 
                      layout="position" 
                      layoutId={`time-${location.countryName}-${location.timezone}`}
                      className="text-center"
                    >
                      <motion.div layout="preserve-aspect">
                        <TimeDisplay offsetInMinutes={location.currentTimeOffsetInMinutes} />
                        {getTimeBadge(location.currentTimeOffsetInMinutes, userTimezone?.currentTimeOffsetInMinutes || 0) && (
                          <Badge variant="outline" className="ml-2">
                            {getTimeBadge(location.currentTimeOffsetInMinutes, userTimezone?.currentTimeOffsetInMinutes || 0)}
                          </Badge>
                        )}
                      </motion.div>
                    </motion.td>
                    <motion.td 
                      layout="position" 
                      layoutId={`type-${location.countryName}-${location.timezone}`}
                      className="text-center"
                    >
                      <motion.span 
                        layout="preserve-aspect"
                        className={`px-2 py-1 rounded-full text-sm whitespace-normal ${getTypeColor(getTimeType(
                          location.currentTimeOffsetInMinutes,
                          userTimezone?.currentTimeOffsetInMinutes || 0,
                          location.isSimilarTime
                        ))}`}
                      >
                        {(() => {
                          const type = getTimeType(
                            location.currentTimeOffsetInMinutes,
                            userTimezone?.currentTimeOffsetInMinutes || 0,
                            location.isSimilarTime
                          )
                          const firstWord = type.split(' ')[0]
                          return (
                            <>
                              <span className="md:hidden">
                                {firstWord}
                              </span>
                              <span className="hidden md:inline">
                                {type}
                              </span>
                            </>
                          )
                        })()}
                      </motion.span>
                    </motion.td>
                    <motion.td 
                      layout="position" 
                      layoutId={`languages-${location.countryName}-${location.timezone}`}
                      className="text-center"
                    >
                      <motion.div 
                        layout="position"
                        className="flex flex-col items-center gap-1"
                      >
                        {Array.from(new Set(location.languages)).map((lang) => {
                          const langCode = typeof lang === 'string' ? lang : lang.code
                          const langName = typeof lang === 'string' 
                            ? languages[lang as TLanguageCode]?.name || lang 
                            : lang.name
                          
                          return (
                            <motion.span 
                              key={`${location.countryName}-${langCode}`}
                              layout="preserve-aspect"
                              className={`inline-block px-2 py-1 rounded-full text-sm mr-1 mb-1 ${
                                hasMatchingLanguage(
                                  location.languages,
                                  userTimezone?.languages ?? []
                                ) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              <span className="hidden md:inline">{langName}</span>
                              <span className="md:hidden">{langCode}</span>
                            </motion.span>
                          )
                        })}
                      </motion.div>
                    </motion.td>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>

            {scrollMode === 'pagination' ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4"
              >
                <LocationPagination 
                  totalItems={filteredAndSortedLocations.length}
                  itemsPerPage={itemsPerPage}
                  onShowAll={handleShowAll}
                />
              </motion.div>
            ) : (
              <>
                {hasMore && (
                  <div 
                    ref={loadMoreRef}
                    className="flex justify-center py-4"
                  >
                    {isLoadingMore ? (
                      <Loader className="h-6 w-6" />
                    ) : null}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p>No locations found matching the selected filters.</p>
        )}
      </AnimatePresence>

      {/* Back to top button */}
      <AnimatePresence>
        {scrollMode === 'infinite' && showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            layoutId="back-to-top"
            layout="position"
            transition={{ 
              duration: 0.2,
              ease: "easeOut",
              layout: { duration: 0.3 },
              scale: { type: "spring", stiffness: 200, damping: 25 }
            }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 bg-black text-white rounded-full px-6 py-2 flex items-center gap-2 shadow-lg hover:bg-gray-800 transition-colors z-50"
            aria-label="Scroll to top"
            style={{ willChange: 'transform, opacity' }}
          >
            <CircleArrowUp className="h-5 w-4" />
            <span className="text-sm font-medium">Back to top</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

