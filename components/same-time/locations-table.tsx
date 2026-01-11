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
  formatTimezoneName
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
  selectedLocation: Location | null
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

export default function LocationsTable({ 
  locations, 
  userTimezone,
  selectedLocation,
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
  const [itemsPerPage] = useState(10)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})

  // Function to handle location selection
  const handleLocationSelect = useCallback((location: Location) => {
    onLocationChangeAction(location)
  }, [onLocationChangeAction])

  // Get filtered and sorted locations from the hook
  const filteredAndSortedLocations = useLocationFilters(locations, userTimezone)

  // Filter and sort locations with selected location at top
  const finalLocations = useMemo(() => {
    let filtered = showAllCountries 
      ? filteredAndSortedLocations 
      : filteredAndSortedLocations.filter((location: Location) => 
          priorityCountries.includes(location.countryName)
        )

    // Move selected location to top if exists
    if (selectedLocation) {
      const selectedLocationId = `${selectedLocation.countryName}-${selectedLocation.timezone}-${selectedLocation.alternativeName}`
      filtered = [
        ...filtered.filter(loc => 
          `${loc.countryName}-${loc.timezone}-${loc.alternativeName}` === selectedLocationId
        ),
        ...filtered.filter(loc => 
          `${loc.countryName}-${loc.timezone}-${loc.alternativeName}` !== selectedLocationId
        )
      ]
    }

    // Push Antarctica to bottom
    return [
      ...filtered.filter(loc => loc.countryName !== 'Antarctica'),
      ...filtered.filter(loc => loc.countryName === 'Antarctica')
    ]
  }, [filteredAndSortedLocations, showAllCountries, priorityCountries, selectedLocation])

  // Scroll selected location into view
  useEffect(() => {
    if (selectedLocation) {
      const selectedLocationId = `${selectedLocation.countryName}-${selectedLocation.timezone}-${selectedLocation.alternativeName}`
      const element = document.getElementById(selectedLocationId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedLocation])

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
                    <span className="md:hidden pr-1">Type</span>
                    <span className="hidden md:inline pr-1">Time Type</span>
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
                  const locationId = `${location.countryName}-${location.timezone}-${location.alternativeName}`
                  const selectedLocationId = selectedLocation 
                    ? `${selectedLocation.countryName}-${selectedLocation.timezone}-${selectedLocation.alternativeName}`
                    : null
                  const isSelected = locationId === selectedLocationId

                  return (
                    <motion.tr
                      id={locationId}
                      key={locationId}
                      layout="position"
                      layoutId={`row-${locationId}`}
                      transition={{ 
                        layout: { duration: 0.3, type: "spring", stiffness: 200, damping: 30 }
                      }}
                      className={cn(
                        "hover:bg-gray-100/50 cursor-pointer transition-colors py-2",
                        hasMatchingLanguage(
                          location.languages,
                          userTimezone?.languages ?? []
                        ) && "bg-blue-50/30",
                        isSelected && "bg-blue-100/50 font-semibold"
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
                                      <div className="flex items-center gap-1 hover:text-gray-700 transition-colors cursor-pointer">
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
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
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
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      {orderedCities.slice(1).map((city) => (
                                        <motion.div 
                                          key={city} 
                                          className="mt-1"
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
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
                                  <div className="flex items-center gap-1 hover:text-gray-700 transition-colors cursor-pointer">
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
                                              hasMatchingLanguage(
                                                location.languages,
                                                userTimezone?.languages ?? []
                                              ) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
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
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
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
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`inline-block px-2 py-1 rounded-full text-xs md:text-sm ${
                                          hasMatchingLanguage(
                                            location.languages,
                                            userTimezone?.languages ?? []
                                          ) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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

