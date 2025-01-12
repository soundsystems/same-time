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
import { useLocationFilters } from '@/lib/hooks/useLocationFilters'
import { useLocationState } from '@/lib/hooks/useLocationState'

interface LocationsTableProps {
  locations: Location[]
  userTimezone: UserTimezone | null
  onLocationChangeAction: (location: Location) => void
  selectedTimeType: TimeType
  selectedTimeOfDay: TimeOfDay
  showAllCountries: boolean
  priorityCountries: string[]
  scrollMode: 'pagination' | 'infinite'
  onScrollModeChange?: (mode: 'pagination' | 'infinite') => void
  searchedCity: string | null
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

// Add utility function for truncating city names
const truncateCityName = (city: string, wordLimit = 2) => {
  const words = city.split(' ')
  if (words.length <= wordLimit) return city
  return words.slice(0, wordLimit).join(' ') + '...'
}

export default function LocationsTable({ 
  locations, 
  userTimezone,
  onLocationChangeAction,
  selectedTimeType,
  selectedTimeOfDay,
  showAllCountries,
  priorityCountries,
  scrollMode = 'pagination',
  onScrollModeChange,
  searchedCity
}: LocationsTableProps) {
  // Get language state from useLocationState
  const { selectedLanguage } = useLocationState()

  // 1. All useState hooks
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showPagination, setShowPagination] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  // Function to handle location selection
  const handleLocationSelect = useCallback((location: Location) => {
    setSelectedLocationId(`${location.countryName}-${location.timezone}-${location.alternativeName}`)
    onLocationChangeAction(location)
  }, [onLocationChangeAction])

  // Set initial selected location ID from userTimezone
  useEffect(() => {
    if (userTimezone && 'countryName' in userTimezone && 'timezone' in userTimezone && 'alternativeName' in userTimezone) {
      setSelectedLocationId(`${userTimezone.countryName}-${userTimezone.timezone}-${userTimezone.alternativeName}`)
    }
  }, [userTimezone])

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
    if (selectedLocationId) {
      filtered = [
        ...filtered.filter(loc => 
          `${loc.countryName}-${loc.timezone}-${loc.alternativeName}` === selectedLocationId
        ),
        ...filtered.filter(loc => 
          `${loc.countryName}-${loc.timezone}-${loc.alternativeName}` !== selectedLocationId
        )
      ]
    }

    return filtered
  }, [filteredAndSortedLocations, showAllCountries, priorityCountries, selectedLocationId])

  // Scroll selected location into view
  useEffect(() => {
    if (selectedLocationId) {
      const element = document.getElementById(selectedLocationId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedLocationId])

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

  const totalPages = Math.ceil(finalLocations.length / itemsPerPage)

  // Get paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return finalLocations.slice(startIndex, startIndex + itemsPerPage)
  }, [currentPage, itemsPerPage, finalLocations])

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
    items: finalLocations,
    pageSize: itemsPerPage
  })

  // Handle scroll mode change
  const handleShowAll = useCallback(() => {
    if (onScrollModeChange) {
      // First set all items to prevent loading more
      setInitialItems(finalLocations.length)
      // Then change the mode
      onScrollModeChange('infinite')
      // Reset page to 1
      setCurrentPage(1)
    }
  }, [onScrollModeChange, setInitialItems, finalLocations.length])

  // Reset infinite scroll only when filters change, not on mode change
  useEffect(() => {
    if (finalLocations.length > 0) {
      resetInfiniteScroll()
    }
  }, [finalLocations, resetInfiniteScroll])

  // Display items based on scroll mode
  const displayedItems = scrollMode === 'infinite' ? infiniteScrollItems : paginatedItems

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

  const getCityDisplay = (city: string) => {
    return city.replace(/\([^)]*\)/g, '').trim()
  }

  // Add sorting state from useLocationState
  const { sortField, setSortField, sortDirection, setSortDirection } = useLocationState()

  // Add back handleSort using the state from useLocationState
  const handleSort = useCallback((field: SortField) => {
    setCurrentPage(1)
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc')
    setSortField(field)
  }, [sortField, sortDirection, setSortDirection, setSortField, setCurrentPage])

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
                  const isSelected = locationId === selectedLocationId

                  return (
                    <motion.tr
                      id={locationId}
                      key={locationId}
                      layout="position"
                      layoutId={`row-${locationId}`}
                      transition={{ 
                        layout: { duration: 0.3, type: "spring", stiffness: 200, damping: 30 },
                        delay: indexOfFirstItem * 0.05
                      }}
                      className={cn(
                        "hover:bg-gray-100/50 cursor-pointer transition-colors",
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
                        className="text-left min-w-0"
                      >
                        <div className="flex flex-col items-start w-full min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <motion.div layout="preserve-aspect" className="flex-shrink-0">
                              <ReactCountryFlag
                                countryCode={location.countryCode}
                                style={{
                                  width: '1.5em',
                                  height: '1.5em'
                                }}
                                svg
                              />
                            </motion.div>
                            <motion.span layout="position" className={cn(
                              isSelected && "font-semibold",
                              "flex flex-col min-w-0"
                            )}>
                              <span className="truncate">
                                <span className="md:hidden">
                                  {location.countryName === 'United States' ? 'USA' : 
                                   location.countryName === 'Bosnia and Herzegovina' ? 'Bosnia' :
                                   location.countryName}
                                </span>
                                <span className="hidden md:inline">{location.countryName}</span>
                              </span>
                              <span className={cn(
                                "text-sm text-gray-500 hidden md:inline truncate",
                                isSelected && "font-semibold"
                              )}>
                                {location.alternativeName}
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
                                                className="text-gray-400 text-[10px] flex-shrink-0"
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
                        className="text-center"
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
                        className="text-center"
                      >
                        <motion.span 
                          layout="preserve-aspect"
                          className={cn(
                            `px-2 py-1 rounded-full text-sm whitespace-normal`,
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
                        className="text-center"
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
                                        .map((lang, index) => {
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
                                            className={`inline-block px-2 py-1 rounded-full text-sm ${
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
                                            className="text-gray-400 text-[10px] flex-shrink-0"
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
                                        className={`inline-block px-2 py-1 rounded-full text-sm ${
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
                  totalItems={finalLocations.length}
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

