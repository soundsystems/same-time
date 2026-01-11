'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader } from "@/components/ui/loader"
import ReactCountryFlag from "react-country-flag"
import type { Location, UserTimezone, TimeType, TimeOfDay, SortField } from './types'
import { 
  getTimeType, 
  getTimeBadge, 
  getTypeColor, 
  hasMatchingLanguage,
  formatTimezoneName,
  getProximityBadgeColor
} from './utils'
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "motion/react"
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { CircleArrowUp } from 'lucide-react'
import { languages, type TLanguageCode } from 'countries-list'
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible"
import { ChevronRight } from 'lucide-react'
import { LocationPagination } from './pagination'
import { TimeDisplay } from './time-display'
import { useLocationFilters } from '@/hooks/use-location-filters'
import { useLocationState } from '@/hooks/use-location-state'

interface LocationsTableProps {
  locations: Location[]
  userTimezone: UserTimezone | null
  selectedLocations?: Location[]
  onLocationChangeAction: (location: Location) => void
  selectedTimeType: TimeType
  selectedTimeOfDay: TimeOfDay
  showAllCountries: boolean
  priorityCountries: string[]
  scrollMode: 'pagination' | 'infinite'
  onScrollModeChange?: (mode: 'pagination' | 'infinite') => void
  searchedCity: string | null
}

// Throttle utility function
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

// Add utility function for truncating city names
const truncateCityName = (city: string) => {
  // If city contains a hyphen, take only the first part
  if (city.includes('-')) {
    return `${city.split('-')[0]}...`
  }
  // Otherwise keep the original truncation logic
  const words = city.split(' ')
  if (words.length <= 2) return city
  return `${words.slice(0, 2).join(' ')}...`
}

const getMobileCountryName = (countryName: string) => {
  let name = countryName

  // Handle all Saint abbreviations first
  if (name.startsWith('Saint ')) {
    name = name.replace('Saint ', 'St. ')
  }

  // Handle directional abbreviations
  name = name
    .replace(/Northern /g, 'N. ')
    .replace(/North /g, 'N. ')
    .replace(/Southern /g, 'S. ')
    .replace(/South /g, 'S. ')
    .replace(/French /g, 'Fr. ')

  // Special cases
  if (name === 'United States') return 'USA'
  if (name === 'Democratic Republic of the Congo') return 'DRC'
  if (name === 'Republic of the Congo') return 'ROC'
  if (name === 'Central African Republic') return 'CAR'
  if (name === 'The Netherlands') return 'Netherlands'
  if (name === 'United Arab Emirates') return 'UAE'
  if (name === 'N. Macedonia') return 'NMK'
  if (name === 'Palestinian Territory') return 'Palestine'
  if (name === 'United States Minor Outlying Islands') return 'USMOI'
  if (name === 'British Virgin Islands') return 'Virgin Isl.'
  if (name === 'U.S. Virgin Islands') return 'US Virgin Isl.'
  if (name === 'British Indian Ocean Territory') return 'Indian Ocean'
  if (name === 'Equatorial Guinea') return 'GNQ'
  if (name === 'Fr. S. Territories') return 'TF'
  if (name === 'United Kingdom') return 'UK'
  if (name === 'American Samoa') return 'Am. Samoa'
  if (name === 'Dominican Republic') return 'Dominican'
  if (name === 'St. Barthelemy') return "St. Bart's"
  if (name === 'Christmas Island') return 'X-Mas Island'
  if (name === 'Papua New Guinea') return 'PNG'
  if (name === 'Burkina Faso') return 'BF'
  if (name === 'New Caledonia') return 'New Cal.'
  if (name === 'Luxembourg') return 'LUX'

  // Handle Islands abbreviation
  if (name.includes('Islands')) {
    name = name.replace('Islands', 'Isl.')
  }

  // If country has commas, take first part
  if (name.includes(',')) {
    return name.split(',')[0].trim()
  }
  // If country has 'and', take first part
  if (name.includes(' and ')) {
    return name.split(' and ')[0].trim()
  }
  // If no special cases apply, return full name
  return name
}

// Add useIsMobile hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 768
  )

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return isMobile
}

// Smart pagination: calculates optimal items per page to avoid orphans
const calculateSmartPagination = (totalItems: number) => {
  const MIN_ITEMS_PER_PAGE = 4
  const MAX_ITEMS_PER_PAGE = 11
  const MAX_LAST_PAGE = 14
  
  // Handle edge cases
  if (totalItems === 0) {
    return { itemsPerPage: MAX_ITEMS_PER_PAGE, totalPages: 0 }
  }
  
  // If total items fit in one page
  if (totalItems <= MAX_LAST_PAGE) {
    return {
      itemsPerPage: MAX_ITEMS_PER_PAGE,
      totalPages: 1
    }
  }
  
  // Start with standard items per page
  let itemsPerPage = MAX_ITEMS_PER_PAGE
  let totalPages = Math.ceil(totalItems / itemsPerPage)
  let lastPageItems = totalItems % itemsPerPage || itemsPerPage
  
  // If last page has too few items (orphan), redistribute
  if (lastPageItems < MIN_ITEMS_PER_PAGE && lastPageItems > 0) {
    // Try increasing items per page slightly
    itemsPerPage = Math.ceil(totalItems / (totalPages - 1))
    
    // Ensure we don't exceed max for last page
    if (itemsPerPage > MAX_LAST_PAGE) {
      itemsPerPage = MAX_ITEMS_PER_PAGE
    }
    
    totalPages = Math.ceil(totalItems / itemsPerPage)
  }
  
  return {
    itemsPerPage,
    totalPages
  }
}

export default function LocationsTable({ 
  locations, 
  userTimezone,
  selectedLocations = [],
  onLocationChangeAction,
  selectedTimeType: _selectedTimeType,
  selectedTimeOfDay: _selectedTimeOfDay,
  showAllCountries,
  priorityCountries,
  scrollMode = 'pagination',
  onScrollModeChange,
  searchedCity
}: LocationsTableProps) {
  const isMobile = useIsMobile()

  // Helper to check if location is user timezone
  const isUserTimezone = useCallback((location: Location) => {
    if (!userTimezone) {
      return false
    }
    return (
      location.countryName === userTimezone.countryName &&
      location.timezone === userTimezone.name &&
      location.alternativeName === userTimezone.alternativeName
    )
  }, [userTimezone])

  // Helper to check if two locations are the same
  const isSameLocation = useCallback((loc1: Location, loc2: Location) => {
    return (
      loc1.countryName === loc2.countryName &&
      loc1.timezone === loc2.timezone &&
      loc1.alternativeName === loc2.alternativeName
    )
  }, [])

  // Helper to get location ID
  const getLocationId = useCallback((location: Location) => {
    return `${location.countryName}-${location.timezone}-${location.alternativeName}`
  }, [])

  // Helper to get language badge color based on priority
  const getLanguageBadgeColor = useCallback((
    languageCode: string,
    languageName: string,
    location: Location
  ) => {
    // Priority 1: Check if language matches user timezone
    if (userTimezone?.languages.some(lang => {
      const code = typeof lang === 'string' ? lang : lang.code
      return code.toLowerCase() === languageCode.toLowerCase()
    })) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    }
    
    // Priority 2: Check if matches 1st selected timezone
    if (selectedLocations && selectedLocations[0]?.languages.some(lang => {
      const code = typeof lang === 'string' ? lang : lang.code
      return code.toLowerCase() === languageCode.toLowerCase()
    })) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
    
    // Priority 3: Check if matches 2nd selected timezone
    if (selectedLocations && selectedLocations[1]?.languages.some(lang => {
      const code = typeof lang === 'string' ? lang : lang.code
      return code.toLowerCase() === languageCode.toLowerCase()
    })) {
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
    }
    
    // Priority 4: Check if matches 3rd selected timezone
    if (selectedLocations && selectedLocations[2]?.languages.some(lang => {
      const code = typeof lang === 'string' ? lang : lang.code
      return code.toLowerCase() === languageCode.toLowerCase()
    })) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    }
    
    // No match: neutral gray
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400'
  }, [userTimezone, selectedLocations])
  
  // Get all location state from useLocationState in a single call to prevent multiple hook instances
  const {
    selectedLanguage,
    page,
    setPage,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection
  } = useLocationState()

  // 1. All useState hooks
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})

  // Function to handle location selection
  const handleLocationSelect = useCallback((location: Location) => {
    onLocationChangeAction(location)
  }, [onLocationChangeAction])

  // Get filtered and sorted locations from the hook
  const filteredAndSortedLocations = useLocationFilters(locations, userTimezone, selectedLocations)

  // Filter and sort locations with selected locations at top in priority order
  const finalLocations = useMemo(() => {
    let filtered = showAllCountries 
      ? filteredAndSortedLocations 
      : filteredAndSortedLocations.filter((location: Location) => 
          priorityCountries.includes(location.countryName)
        )

    // Create ordered list: selected locations first (in order), then user TZ, then rest
    const orderedLocations: Location[] = []
    const alreadyAdded = new Set<string>()

    // 1. Add selected locations in priority order (newest first)
    for (const selected of (selectedLocations || [])) {
      const found = filtered.find(loc => isSameLocation(loc, selected))
      if (found) {
        orderedLocations.push(found)
        alreadyAdded.add(getLocationId(found))
      }
    }

    // 2. Add user timezone if not already in selected
    if (userTimezone) {
      const userLoc = filtered.find(loc => isUserTimezone(loc))
      if (userLoc && !alreadyAdded.has(getLocationId(userLoc))) {
        orderedLocations.push(userLoc)
        alreadyAdded.add(getLocationId(userLoc))
      }
    }

    // 3. Add remaining locations (excluding Antarctica for now)
    const remaining = filtered.filter(loc => 
      !alreadyAdded.has(getLocationId(loc)) && loc.countryName !== 'Antarctica'
    )
    
    // 4. Add Antarctica at the end
    const antarctica = filtered.filter(loc => 
      !alreadyAdded.has(getLocationId(loc)) && loc.countryName === 'Antarctica'
    )

    return [...orderedLocations, ...remaining, ...antarctica]
  }, [filteredAndSortedLocations, showAllCountries, priorityCountries, selectedLocations, userTimezone, isSameLocation, isUserTimezone, getLocationId])

  // Calculate smart pagination based on filtered locations
  const { itemsPerPage, totalPages } = useMemo(() => {
    return calculateSmartPagination(finalLocations.length)
  }, [finalLocations.length])

  // Scroll to user timezone on initial mount
  useEffect(() => {
    if (userTimezone) {
      const userLocationId = getLocationId({ 
        countryName: userTimezone.countryName,
        timezone: userTimezone.name,
        alternativeName: userTimezone.alternativeName,
        countryCode: '',
        currentTimeOffsetInMinutes: 0,
        localHour: 0,
        mainCities: [],
        languages: [],
        isSimilarTime: false
      } as Location)
      const element = document.getElementById(userLocationId)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  // Scroll most recent selection into view when selections change
  useEffect(() => {
    if (selectedLocations && selectedLocations.length > 0) {
      const mostRecent = selectedLocations[0]
      const selectedLocationId = getLocationId(mostRecent)
      const element = document.getElementById(selectedLocationId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedLocations, getLocationId])

  // Update paginated items to use the page from URL
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage
    return finalLocations.slice(startIndex, startIndex + itemsPerPage)
  }, [page, itemsPerPage, finalLocations])

  // Update pagination handler
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [setPage])

  // Reset to page 1 if current page exceeds total pages after filtering
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1)
    }
  }, [totalPages, page, setPage])

  // Add infinite scroll hook
  const {
    items: infiniteScrollItems,
    hasMore,
    isLoading: isLoadingMore,
    loadMoreRef,
    reset: resetInfiniteScroll,
    setInitialItems
  } = useInfiniteScroll({
    items: finalLocations,
    pageSize: itemsPerPage,
    isMobile
  })

  // Handle scroll mode change
  const handleShowAll = useCallback(() => {
    if (onScrollModeChange) {
      // First set all items to prevent loading more
      setInitialItems(finalLocations.length)
      // Then change the mode
      onScrollModeChange('infinite')
      // Reset page to 1
      setPage(1)
    }
  }, [onScrollModeChange, setInitialItems, finalLocations.length, setPage])

  // Reset infinite scroll only when filters change, not on mode change
  useEffect(() => {
    if (finalLocations.length > 0) {
      resetInfiniteScroll()
    }
  }, [finalLocations, resetInfiniteScroll])

  // Display items based on scroll mode
  const displayedItems = scrollMode === 'infinite' ? infiniteScrollItems : paginatedItems

  // Watch for all countries toggle - separate from scroll mode
  // Note: Page defaults to 1 via URL parser, so this effect is not needed
  // Removed to prevent unnecessary re-renders

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

  // Add back handleSort using the state from useLocationState
  const handleSort = useCallback((field: SortField) => {
    setPage(1)
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc')
    setSortField(field)
  }, [sortField, sortDirection, setSortDirection, setSortField, setPage])

  return (
    <div className="relative">
      <AnimatePresence>
        {finalLocations.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <motion.tr layout="position" layoutId="table-header">
                  <TableHead onClick={() => handleSort('country')} className="cursor-pointer w-[45%] md:w-auto">
                    Country {sortField === 'country' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="w-[25%] md:w-auto">
                    <span className="md:hidden">Time</span>
                    <span className="hidden md:inline">Local Time</span>
                  </TableHead>
                  <TableHead onClick={() => handleSort('type')} className="cursor-pointer w-[15%] md:w-auto">
                    <span className="md:hidden pr-1">Prox</span>
                    <span className="hidden md:inline pr-1">Proximity</span>
                    {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="w-[15%] md:w-auto">
                    <span className="md:hidden">Lang</span>
                    <span className="hidden md:inline">Languages</span>
                  </TableHead>
                </motion.tr>
              </TableHeader>
              <TableBody>
                {displayedItems.map((location) => {
                  const locationId = getLocationId(location)
                  
                  // Check if it's user timezone
                  const isUserTz = isUserTimezone(location)
                  
                  // Check if in selected array and get position
                  const selectedIndex = (selectedLocations || []).findIndex(loc => isSameLocation(loc, location))
                  const isSelected = selectedIndex !== -1 || isUserTz
                  
                  // Determine highlight color based on position
                  let highlightColor = ''
                  if (selectedIndex === 0) {
                    highlightColor = 'bg-blue-100/50 dark:bg-blue-950/30'
                  } else if (selectedIndex === 1) {
                    highlightColor = 'bg-teal-100/50 dark:bg-teal-950/30'
                  } else if (selectedIndex === 2) {
                    highlightColor = 'bg-purple-100/50 dark:bg-purple-950/30'
                  } else if (isUserTz) {
                    highlightColor = 'bg-green-200/70 dark:bg-green-900/50'
                  }

                  return (
                    <motion.tr
                      id={locationId}
                      key={locationId}
                      layout="position"
                      layoutId={`row-${locationId}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ 
                        opacity: { duration: 0.2 },
                        layout: { duration: 0.25, ease: "easeInOut" }
                      }}
                      className={cn(
                        "hover:bg-amber-100/60 dark:hover:bg-amber-900/40 cursor-pointer transition-colors py-2",
                        hasMatchingLanguage(
                          location.languages,
                          userTimezone?.languages ?? []
                        ) && !isSelected && "bg-blue-50/30 dark:bg-blue-950/20",
                        highlightColor,
                        isSelected && "font-semibold"
                      )}
                      onClick={() => handleLocationSelect(location)}
                    >
                      <motion.td 
                        layout="position" 
                        layoutId={`country-${locationId}`}
                        className="text-left min-w-0 pl-1 pr-0 md:px-4"
                      >
                        <div className="flex flex-col items-start w-full min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <motion.div layout="preserve-aspect" className="shrink-0 w-6 h-6">
                              <ReactCountryFlag
                                countryCode={location.countryCode}
                                className="w-full h-full"
                                svg
                              />
                            </motion.div>
                            <motion.span layout="position" className={cn(
                              isSelected && "font-semibold",
                              "flex flex-col min-w-0"
                            )}>
                              <span className="truncate">
                                <span className="md:hidden">
                                  {getMobileCountryName(location.countryName)}
                                </span>
                                <span className="hidden md:inline">{location.countryName}</span>
                              </span>
                              <span className={cn(
                                "text-xs text-gray-500 hidden md:inline truncate",
                                isSelected && "font-semibold"
                              )}>
                                {formatTimezoneName(location.alternativeName)}
                              </span>
                            </motion.span>
                          </div>
                          {(() => {
                            // Order cities based on search
                            let orderedCities = location.mainCities;
                            if (searchedCity) {
                              const cityIndex = location.mainCities.findIndex(city => 
                                city.toLowerCase().includes(searchedCity.toLowerCase())
                              );
                              if (cityIndex !== -1) {
                                orderedCities = [
                                  location.mainCities[cityIndex],
                                  ...location.mainCities.slice(0, cityIndex),
                                  ...location.mainCities.slice(cityIndex + 1)
                                ];
                              }
                            }

                            return orderedCities.length > 0 && (
                              orderedCities.length === 1 ? (
                                <div className="flex items-center text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <span className="truncate">
                                      {searchedCity && orderedCities[0].toLowerCase().includes(searchedCity.toLowerCase()) ? (
                                        <span className="font-semibold">
                                          <span className="md:hidden">{truncateCityName(orderedCities[0])}</span>
                                          <span className="hidden md:inline">{orderedCities[0]}</span>
                                        </span>
                                      ) : (
                                        <>
                                          <span className="md:hidden">{truncateCityName(orderedCities[0])}</span>
                                          <span className="hidden md:inline">{orderedCities[0]}</span>
                                        </>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <Collapsible 
                                  className="w-full"
                                  onOpenChange={(isOpen) => {
                                    setOpenStates(prev => ({
                                      ...prev,
                                      [locationId]: isOpen
                                    }))
                                  }}
                                >
                                  <div className="flex items-center text-xs text-gray-500">
                                    <CollapsibleTrigger asChild>
                                      <div 
                                        className="flex items-center gap-1 hover:text-gray-700 transition-colors cursor-pointer"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <motion.div
                                          animate={{ 
                                            rotate: openStates[locationId] ? 90 : 0 
                                          }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <ChevronRight className="h-3 w-3" />
                                        </motion.div>
                                        <div className="flex items-center gap-1">
                                          <span className="truncate">
                                            {searchedCity && orderedCities[0].toLowerCase().includes(searchedCity.toLowerCase()) ? (
                                              <span className="font-semibold">
                                                <span className="md:hidden">{truncateCityName(orderedCities[0])}</span>
                                                <span className="hidden md:inline">{orderedCities[0]}</span>
                                              </span>
                                            ) : (
                                              <>
                                                <span className="md:hidden">{truncateCityName(orderedCities[0])}</span>
                                                <span className="hidden md:inline">{orderedCities[0]}</span>
                                              </>
                                            )}
                                          </span>
                                          <AnimatePresence mode="wait">
                                            {!openStates[locationId] && orderedCities.length > 1 && (
                                              <motion.span 
                                                className="text-gray-400 text-[10px] shrink-0"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                              >
                                                +{orderedCities.length - 1} more
                                              </motion.span>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>
                                  </div>
                                  <CollapsibleContent className="text-xs text-gray-500">
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.15 }}
                                    >
                                      {orderedCities.slice(1).map((city) => (
                                        <motion.div 
                                          key={city} 
                                          className="mt-1"
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          {searchedCity && city.toLowerCase().includes(searchedCity.toLowerCase()) ? (
                                            <span className="font-semibold">{city}</span>
                                          ) : city}
                                        </motion.div>
                                      ))}
                                    </motion.div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )
                            );
                          })()}
                        </div>
                      </motion.td>
                      <motion.td 
                        layout="position" 
                        layoutId={`time-${locationId}`}
                        className="text-center px-0.5 md:px-4"
                      >
                        <motion.div layout="preserve-aspect" className={cn(isSelected && "font-semibold")}>
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
                        layoutId={`type-${locationId}`}
                        className="text-center px-0.5 md:px-4"
                      >
                        <motion.div layout="preserve-aspect" className="flex flex-col items-center gap-1">
                          <motion.span 
                            layout="preserve-aspect"
                            className={cn(
                              "px-2 py-1 rounded-full text-xs md:text-sm whitespace-normal",
                              getTypeColor(getTimeType(
                                location.currentTimeOffsetInMinutes,
                                userTimezone?.currentTimeOffsetInMinutes || 0,
                                location.isSimilarTime
                              )),
                              isSelected && "font-semibold"
                            )}
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
                                    {firstWord === 'Similar' ? 'Close' : 
                                      firstWord === 'Different' ? 'Diff' : 
                                      firstWord === 'Early' ? 'Early' :
                                      firstWord === 'Late' ? 'Late' :
                                      firstWord === 'Reverse' ? 'Rev' :
                                      firstWord}
                                  </span>
                                  <span className="hidden md:inline">
                                    {type}
                                  </span>
                                </>
                              )
                            })()}
                          </motion.span>
                          {(() => {
                            const badgeInfo = getProximityBadgeColor(
                              location.currentTimeOffsetInMinutes,
                              location.isSimilarTime,
                              userTimezone?.currentTimeOffsetInMinutes || 0,
                              userTimezone?.name || null,
                              selectedLocations || [],
                              _selectedTimeType
                            )
                            return badgeInfo ? (
                              <Badge variant="outline" className={cn("text-[10px] px-1 py-0", badgeInfo.color)}>
                                {badgeInfo.label}
                              </Badge>
                            ) : null
                          })()}
                        </motion.div>
                      </motion.td>
                      <motion.td 
                        layout="position" 
                        layoutId={`languages-${locationId}`}
                        className="text-center pl-0 pr-1 md:px-4"
                      >
                        <motion.div 
                          layout="position"
                          className="flex flex-col items-center gap-1"
                        >
                          {Array.from(new Set(location.languages)).length > 0 && (
                            <Collapsible 
                              className="w-full"
                              onOpenChange={(isOpen) => {
                                setOpenStates(prev => ({
                                  ...prev,
                                  [`${locationId}-langs`]: isOpen
                                }))
                              }}
                            >
                              <div className="flex items-center justify-center text-xs">
                                <CollapsibleTrigger asChild>
                                  <div 
                                    className="flex items-center gap-1 hover:text-gray-700 transition-colors cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {Array.from(new Set(location.languages)).length > 2 && (
                                      <motion.div
                                        animate={{ 
                                          rotate: openStates[`${locationId}-langs`] ? 90 : 0 
                                        }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        <ChevronRight className="h-3 w-3" />
                                      </motion.div>
                                    )}
                                    <div className="flex items-center gap-1 flex-wrap justify-center">
                                      {Array.from(new Set(location.languages))
                                        .sort((a, b) => {
                                          const aCode = typeof a === 'string' ? a : a.code;
                                          const bCode = typeof b === 'string' ? b : b.code;
                                          // If selectedLanguage matches either code, prioritize it
                                          if (aCode.toLowerCase() === selectedLanguage.toLowerCase()) return -1;
                                          if (bCode.toLowerCase() === selectedLanguage.toLowerCase()) return 1;
                                          // Otherwise maintain alphabetical order
                                          return aCode.localeCompare(bCode);
                                        })
                                        .slice(0, 2)
                                        .map((lang) => {
                                        const langCode = typeof lang === 'string' ? lang : lang.code
                                        const langName = typeof lang === 'string' 
                                          ? languages[lang as TLanguageCode]?.name || lang 
                                          : lang.name
                                        
                                        const isSelectedLang = selectedLanguage && 
                                          langCode.toLowerCase() === selectedLanguage.toLowerCase()
                                        
                                        return (
                                          <motion.span 
                                            key={`${locationId}-${langCode}`}
                                            layout="preserve-aspect"
                                            className={`inline-block px-2 py-1 rounded-full text-xs md:text-sm ${
                                              getLanguageBadgeColor(langCode, langName, location)
                                            }`}
                                          >
                                            <span className={cn("hidden md:inline", isSelectedLang && "font-semibold")}>
                                              {langName}
                                            </span>
                                            <span className={cn("md:hidden", isSelectedLang && "font-semibold")}>
                                              {langCode}
                                            </span>
                                          </motion.span>
                                        )
                                      })}
                                      <AnimatePresence mode="wait">
                                        {!openStates[`${locationId}-langs`] && Array.from(new Set(location.languages)).length > 2 && (
                                          <motion.span 
                                            className="text-gray-400 text-[10px] shrink-0"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            +{Array.from(new Set(location.languages)).length - 2} more
                                          </motion.span>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>
                              </div>
                              <CollapsibleContent className="text-xs">
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="flex flex-wrap justify-center gap-1 mt-1"
                                >
                                  {Array.from(new Set(location.languages))
                                    .sort((a, b) => {
                                      const aCode = typeof a === 'string' ? a : a.code;
                                      const bCode = typeof b === 'string' ? b : b.code;
                                      // If selectedLanguage matches either code, prioritize it
                                      if (aCode.toLowerCase() === selectedLanguage.toLowerCase()) return -1;
                                      if (bCode.toLowerCase() === selectedLanguage.toLowerCase()) return 1;
                                      // Otherwise maintain alphabetical order
                                      return aCode.localeCompare(bCode);
                                    })
                                    .slice(2)
                                    .map((lang) => {
                                    const langCode = typeof lang === 'string' ? lang : lang.code
                                    const langName = typeof lang === 'string' 
                                      ? languages[lang as TLanguageCode]?.name || lang 
                                      : lang.name
                                    
                                    const isSelectedLang = selectedLanguage && 
                                      langCode.toLowerCase() === selectedLanguage.toLowerCase()
                                    
                                    return (
                                      <motion.span 
                                        key={`${locationId}-${langCode}`}
                                        layout="preserve-aspect"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                        className={`inline-block px-2 py-1 rounded-full text-xs md:text-sm ${
                                          getLanguageBadgeColor(langCode, langName, location)
                                        }`}
                                      >
                                        <span className={cn("hidden md:inline", isSelectedLang && "font-semibold")}>
                                          {langName}
                                        </span>
                                        <span className={cn("md:hidden", isSelectedLang && "font-semibold")}>
                                          {langCode}
                                        </span>
                                      </motion.span>
                                    )
                                  })}
                                </motion.div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </motion.div>
                      </motion.td>
                    </motion.tr>
                  )
                })}
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
                  currentPage={page}
                  totalItems={finalLocations.length}
                  itemsPerPage={itemsPerPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
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
            className="fixed bottom-8 right-8 bg-black text-white rounded-full px-6 py-2 flex items-center gap-2 shadow-lg hover:bg-gray-800 transition-colors z-50 will-change-[transform,opacity]"
            aria-label="Scroll to top"
          >
            <CircleArrowUp className="h-5 w-4" />
            <span className="text-sm font-medium">Back to top</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

