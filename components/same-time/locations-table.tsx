'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

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

// Utility function for truncating city names
const truncateCityName = (city: string) => {
  if (city.includes('-')) {
    return `${city.split('-')[0]}...`
  }
  const words = city.split(' ')
  if (words.length <= 2) {
    return city
  }
  return `${words.slice(0, 2).join(' ')}...`
}

const getMobileCountryName = (countryName: string) => {
  let name = countryName

  if (name.startsWith('Saint ')) {
    name = name.replace('Saint ', 'St. ')
  }

  name = name
    .replace(/Northern /g, 'N. ')
    .replace(/North /g, 'N. ')
    .replace(/Southern /g, 'S. ')
    .replace(/South /g, 'S. ')
    .replace(/French /g, 'Fr. ')

  if (name === 'United States') {
    return 'USA'
  }
  if (name === 'Democratic Republic of the Congo') {
    return 'DRC'
  }
  if (name === 'Republic of the Congo') {
    return 'ROC'
  }
  if (name === 'Central African Republic') {
    return 'CAR'
  }
  if (name === 'The Netherlands') {
    return 'Netherlands'
  }
  if (name === 'United Arab Emirates') {
    return 'UAE'
  }
  if (name === 'N. Macedonia') {
    return 'NMK'
  }
  if (name === 'Palestinian Territory') {
    return 'Palestine'
  }
  if (name === 'United States Minor Outlying Islands') {
    return 'USMOI'
  }
  if (name === 'British Virgin Islands') {
    return 'Virgin Isl.'
  }
  if (name === 'U.S. Virgin Islands') {
    return 'US Virgin Isl.'
  }
  if (name === 'British Indian Ocean Territory') {
    return 'Indian Ocean'
  }
  if (name === 'Equatorial Guinea') {
    return 'GNQ'
  }
  if (name === 'Fr. S. Territories') {
    return 'TF'
  }
  if (name === 'United Kingdom') {
    return 'UK'
  }
  if (name === 'American Samoa') {
    return 'Am. Samoa'
  }
  if (name === 'Dominican Republic') {
    return 'Dominican'
  }
  if (name === 'St. Barthelemy') {
    return "St. Bart's"
  }
  if (name === 'Christmas Island') {
    return 'X-Mas Island'
  }
  if (name === 'Papua New Guinea') {
    return 'PNG'
  }
  if (name === 'Burkina Faso') {
    return 'BF'
  }
  if (name === 'New Caledonia') {
    return 'New Cal.'
  }
  if (name === 'Luxembourg') {
    return 'LUX'
  }

  if (name.includes('Islands')) {
    name = name.replace('Islands', 'Isl.')
  }

  if (name.includes(',')) {
    return name.split(',')[0].trim()
  }
  if (name.includes(' and ')) {
    return name.split(' and ')[0].trim()
  }
  return name
}

// Smart pagination: calculates optimal items per page to avoid orphans
const calculateSmartPagination = (totalItems: number) => {
  const MIN_ITEMS_PER_PAGE = 4
  const MAX_ITEMS_PER_PAGE = 11
  const MAX_LAST_PAGE = 14
  
  if (totalItems === 0) {
    return { itemsPerPage: MAX_ITEMS_PER_PAGE, totalPages: 0 }
  }
  
  if (totalItems <= MAX_LAST_PAGE) {
    return {
      itemsPerPage: MAX_ITEMS_PER_PAGE,
      totalPages: 1
    }
  }
  
  let itemsPerPage = MAX_ITEMS_PER_PAGE
  let totalPages = Math.ceil(totalItems / itemsPerPage)
  let lastPageItems = totalItems % itemsPerPage || itemsPerPage
  
  if (lastPageItems < MIN_ITEMS_PER_PAGE && lastPageItems > 0) {
    itemsPerPage = Math.ceil(totalItems / (totalPages - 1))
    
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
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})

  // Helper functions
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

  const isSameLocation = useCallback((loc1: Location, loc2: Location) => {
    return (
      loc1.countryName === loc2.countryName &&
      loc1.timezone === loc2.timezone &&
      loc1.alternativeName === loc2.alternativeName
    )
  }, [])

  const getLocationId = useCallback((location: Location) => {
    return `${location.countryName}-${location.timezone}-${location.alternativeName}`
  }, [])

  const getLanguageBadgeColor = useCallback((
    languageCode: string,
    languageName: string,
    location: Location
  ) => {
    if (userTimezone?.languages.some(lang => {
      const code = typeof lang === 'string' ? lang : lang.code
      return code.toLowerCase() === languageCode.toLowerCase()
    })) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    }
    
    if (selectedLocations && selectedLocations[0]?.languages.some(lang => {
      const code = typeof lang === 'string' ? lang : lang.code
      return code.toLowerCase() === languageCode.toLowerCase()
    })) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
    
    if (selectedLocations && selectedLocations[1]?.languages.some(lang => {
      const code = typeof lang === 'string' ? lang : lang.code
      return code.toLowerCase() === languageCode.toLowerCase()
    })) {
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
    }
    
    if (selectedLocations && selectedLocations[2]?.languages.some(lang => {
      const code = typeof lang === 'string' ? lang : lang.code
      return code.toLowerCase() === languageCode.toLowerCase()
    })) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    }
    
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400'
  }, [userTimezone, selectedLocations])
  
  const {
    selectedLanguages,
    page,
    setPage,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    toggleLanguage,
    setTimeType
  } = useLocationState()

  const handleLocationSelect = useCallback((location: Location) => {
    onLocationChangeAction(location)
  }, [onLocationChangeAction])

  const handleLanguageClick = useCallback((e: React.MouseEvent, langCode: string) => {
    e.stopPropagation()
    toggleLanguage(langCode)
  }, [toggleLanguage])

  const handleProximityClick = useCallback((e: React.MouseEvent, type: TimeType) => {
    e.stopPropagation()
    setTimeType(type)
  }, [setTimeType])

  const filteredAndSortedLocations = useLocationFilters(locations, userTimezone, selectedLocations)

  const finalLocations = useMemo(() => {
    let filtered = showAllCountries 
      ? filteredAndSortedLocations 
      : filteredAndSortedLocations.filter((location: Location) => 
          priorityCountries.includes(location.countryName)
        )

    const orderedLocations: Location[] = []
    const alreadyAdded = new Set<string>()

    for (const selected of (selectedLocations || [])) {
      const found = filtered.find(loc => isSameLocation(loc, selected))
      if (found) {
        orderedLocations.push(found)
        alreadyAdded.add(getLocationId(found))
      }
    }

    if (userTimezone) {
      const userLoc = filtered.find(loc => isUserTimezone(loc))
      if (userLoc && !alreadyAdded.has(getLocationId(userLoc))) {
        orderedLocations.push(userLoc)
        alreadyAdded.add(getLocationId(userLoc))
      }
    }

    const remaining = filtered.filter(loc => 
      !alreadyAdded.has(getLocationId(loc)) && loc.countryName !== 'Antarctica'
    )
    
    const antarctica = filtered.filter(loc => 
      !alreadyAdded.has(getLocationId(loc)) && loc.countryName === 'Antarctica'
    )

    return [...orderedLocations, ...remaining, ...antarctica]
  }, [filteredAndSortedLocations, showAllCountries, priorityCountries, selectedLocations, userTimezone, isSameLocation, isUserTimezone, getLocationId])

  const { itemsPerPage, totalPages } = useMemo(() => {
    return calculateSmartPagination(finalLocations.length)
  }, [finalLocations.length])

  // Pagination logic
  const paginatedItems = useMemo(() => {
    if (scrollMode === 'pagination') {
      const startIndex = (page - 1) * itemsPerPage
      return finalLocations.slice(startIndex, startIndex + itemsPerPage)
    }
    return finalLocations
  }, [page, itemsPerPage, finalLocations, scrollMode])

  const displayedItems = paginatedItems

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [setPage])

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1)
    }
  }, [totalPages, page, setPage])

  const handleShowAll = useCallback(() => {
    if (onScrollModeChange) {
      onScrollModeChange('infinite')
      setPage(1)
    }
  }, [onScrollModeChange, setPage])

  const handleSort = useCallback((field: SortField) => {
    setPage(1)
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc')
    setSortField(field)
  }, [sortField, sortDirection, setSortDirection, setSortField, setPage])

  // Determine if we should use full animations (only for pagination mode with small dataset)
  const shouldAnimate = scrollMode === 'pagination' && !showAllCountries

  // Define columns with TanStack Table
  const columns = useMemo<ColumnDef<Location>[]>(() => [
    {
      id: 'country',
      header: () => (
        <button
          type="button"
          onClick={() => {
            handleSort('country')
          }}
          className="cursor-pointer"
        >
          Country {sortField === 'country' && (sortDirection === 'asc' ? '↑' : '↓')}
        </button>
      ),
      cell: ({ row }) => {
        const location = row.original
        const locationId = getLocationId(location)
        const isUserTz = isUserTimezone(location)
        const selectedIndex = (selectedLocations || []).findIndex(loc => isSameLocation(loc, location))
        const isSelected = selectedIndex !== -1 || isUserTz
        
        let highlightColor = ''
        if (selectedIndex === 0) {
          highlightColor = 'bg-blue-100/50 dark:bg-blue-950/30'
        } else if (selectedIndex === 1) {
          highlightColor = 'bg-pink-100/50 dark:bg-pink-950/30'
        } else if (selectedIndex === 2) {
          highlightColor = 'bg-purple-100/50 dark:bg-purple-950/30'
        } else if (isUserTz) {
          highlightColor = 'bg-green-200/70 dark:bg-green-900/50'
        }

        let orderedCities = location.mainCities
        if (searchedCity) {
          const cityIndex = location.mainCities.findIndex(city => 
            city.toLowerCase().includes(searchedCity.toLowerCase())
          )
          if (cityIndex !== -1) {
            orderedCities = [
              location.mainCities[cityIndex],
              ...location.mainCities.slice(0, cityIndex),
              ...location.mainCities.slice(cityIndex + 1)
            ]
          }
        }

        return (
          <div className="flex flex-col items-start w-full min-w-0 text-left min-w-0 pl-1 pr-0 md:px-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0 w-6 h-6">
                <ReactCountryFlag
                  countryCode={location.countryCode}
                  className="w-full h-full"
                  svg
                />
              </div>
              <span className={cn(
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
              </span>
            </div>
            {orderedCities.length > 0 && (
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
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
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
            )}
          </div>
        )
      },
      size: 200,
    },
    {
      id: 'time',
      header: () => (
        <>
          <span className="md:hidden">Time</span>
          <span className="hidden md:inline">Local Time</span>
        </>
      ),
      cell: ({ row }) => {
        const location = row.original
        const isUserTz = isUserTimezone(location)
        const selectedIndex = (selectedLocations || []).findIndex(loc => isSameLocation(loc, location))
        const isSelected = selectedIndex !== -1 || isUserTz

        return (
          <div className={cn("text-center px-0.5 md:px-4", isSelected && "font-semibold")}>
            <TimeDisplay offsetInMinutes={location.currentTimeOffsetInMinutes} />
            {getTimeBadge(location.currentTimeOffsetInMinutes, userTimezone?.currentTimeOffsetInMinutes || 0) && (
              <Badge variant="outline" className="ml-2">
                {getTimeBadge(location.currentTimeOffsetInMinutes, userTimezone?.currentTimeOffsetInMinutes || 0)}
              </Badge>
            )}
          </div>
        )
      },
      size: 120,
    },
    {
      id: 'proximity',
      header: () => (
        <button
          type="button"
          onClick={() => {
            handleSort('type')
          }}
          className="cursor-pointer"
        >
          <span className="md:hidden pr-1">Prox</span>
          <span className="hidden md:inline pr-1">Proximity</span>
          {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
        </button>
      ),
      cell: ({ row }) => {
        const location = row.original
        const isUserTz = isUserTimezone(location)
        const selectedIndex = (selectedLocations || []).findIndex(loc => isSameLocation(loc, location))
        const isSelected = selectedIndex !== -1 || isUserTz

        const type = getTimeType(
          location.currentTimeOffsetInMinutes,
          userTimezone?.currentTimeOffsetInMinutes || 0,
          location.isSimilarTime
        ) as TimeType | 'Far Out'
        const firstWord = type.split(' ')[0]
        const isFilterableType = type === 'Synced' || type === 'Adjacent' || type === 'Reverse Time'
        const isActiveFilter = _selectedTimeType === type

        const badgeInfo = getProximityBadgeColor(
          location.currentTimeOffsetInMinutes,
          location.isSimilarTime,
          userTimezone?.currentTimeOffsetInMinutes || 0,
          userTimezone?.countryName || null,
          selectedLocations || [],
          _selectedTimeType
        )

        const BadgeContent = (
          <>
            <span className="md:hidden">
              {type === 'Synced' ? 'Sync' :
                type === 'Adjacent' ? 'Adj' :
                type === 'Far Out' ? 'Far' :
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

        return (
          <div className="text-center px-0.5 md:px-4">
            <div className="flex flex-col items-center gap-1">
              {isFilterableType ? (
                <button
                  type="button"
                  onClick={(e) => handleProximityClick(e, type as TimeType)}
                  className={cn(
                    "px-2 py-1 rounded-full text-xs md:text-sm whitespace-normal cursor-pointer transition-all",
                    getTypeColor(type),
                    isSelected && "font-semibold",
                    isActiveFilter && "ring-2 ring-offset-1 ring-primary",
                    "hover:opacity-80 hover:scale-105"
                  )}
                >
                  {BadgeContent}
                </button>
              ) : (
                <span 
                  className={cn(
                    "px-2 py-1 rounded-full text-xs md:text-sm whitespace-normal",
                    getTypeColor(type),
                    isSelected && "font-semibold"
                  )}
                >
                  {BadgeContent}
                </span>
              )}
              {badgeInfo && (
                <Badge variant="outline" className={cn("text-[10px] px-1 py-0", badgeInfo.color)}>
                  {badgeInfo.label}
                </Badge>
              )}
            </div>
          </div>
        )
      },
      size: 150,
    },
    {
      id: 'languages',
      header: () => (
        <>
          <span className="md:hidden">Lang</span>
          <span className="hidden md:inline">Languages</span>
        </>
      ),
      cell: ({ row }) => {
        const location = row.original
        const locationId = getLocationId(location)
        const isUserTz = isUserTimezone(location)
        const selectedIndex = (selectedLocations || []).findIndex(loc => isSameLocation(loc, location))
        const isSelected = selectedIndex !== -1 || isUserTz

        return (
          <div className="flex flex-col items-center gap-1 text-center pl-0 pr-1 md:px-4">
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
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
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
                            const aCode = typeof a === 'string' ? a : a.code
                            const bCode = typeof b === 'string' ? b : b.code
                            const aSelected = selectedLanguages.some(lang => aCode.toLowerCase() === lang.toLowerCase())
                            const bSelected = selectedLanguages.some(lang => bCode.toLowerCase() === lang.toLowerCase())
                            if (aSelected && !bSelected) {
                              return -1
                            }
                            if (!aSelected && bSelected) {
                              return 1
                            }
                            return aCode.localeCompare(bCode)
                          })
                          .slice(0, 2)
                          .map((lang) => {
                            const langCode = typeof lang === 'string' ? lang : lang.code
                            const langName = typeof lang === 'string' 
                              ? languages[lang as TLanguageCode]?.name || lang 
                              : lang.name
                            
                            const isSelectedLang = selectedLanguages.some(lang => 
                              langCode.toLowerCase() === lang.toLowerCase()
                            )
                            
                            const canSelect = selectedLanguages.length < 8 || isSelectedLang
                            
                            return (
                              <button
                                type="button"
                                key={`${locationId}-${langCode}`}
                                onClick={(e) => handleLanguageClick(e, langCode)}
                                disabled={!canSelect}
                                className={cn(
                                  "inline-block px-2 py-1 rounded-full text-xs md:text-sm cursor-pointer transition-all",
                                  getLanguageBadgeColor(langCode, langName, location),
                                  isSelectedLang && "ring-2 ring-offset-1 ring-primary",
                                  "hover:opacity-80 hover:scale-105",
                                  !canSelect && "opacity-50 cursor-not-allowed hover:opacity-50 hover:scale-100"
                                )}
                                title={!canSelect ? "Maximum 8 languages selected" : undefined}
                              >
                                <span className={cn("hidden md:inline", isSelectedLang && "font-semibold")}>
                                  {langName}
                                </span>
                                <span className={cn("md:hidden", isSelectedLang && "font-semibold")}>
                                  {langCode}
                                </span>
                              </button>
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
                        const aCode = typeof a === 'string' ? a : a.code
                        const bCode = typeof b === 'string' ? b : b.code
                        const aSelected = selectedLanguages.some(lang => aCode.toLowerCase() === lang.toLowerCase())
                        const bSelected = selectedLanguages.some(lang => bCode.toLowerCase() === lang.toLowerCase())
                        if (aSelected && !bSelected) {
                          return -1
                        }
                        if (!aSelected && bSelected) {
                          return 1
                        }
                        return aCode.localeCompare(bCode)
                      })
                      .slice(2)
                      .map((lang) => {
                        const langCode = typeof lang === 'string' ? lang : lang.code
                        const langName = typeof lang === 'string' 
                          ? languages[lang as TLanguageCode]?.name || lang 
                          : lang.name
                        
                        const isSelectedLang = selectedLanguages.some(lang => 
                          langCode.toLowerCase() === lang.toLowerCase()
                        )
                        
                        const canSelect = selectedLanguages.length < 8 || isSelectedLang
                        
                        return (
                          <motion.button
                            type="button"
                            key={`${locationId}-${langCode}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => handleLanguageClick(e, langCode)}
                            disabled={!canSelect}
                            className={cn(
                              "inline-block px-2 py-1 rounded-full text-xs md:text-sm cursor-pointer transition-all",
                              getLanguageBadgeColor(langCode, langName, location),
                              isSelectedLang && "ring-2 ring-offset-1 ring-primary",
                              "hover:opacity-80 hover:scale-105",
                              !canSelect && "opacity-50 cursor-not-allowed hover:opacity-50 hover:scale-100"
                            )}
                            title={!canSelect ? "Maximum 8 languages selected" : undefined}
                          >
                            <span className={cn("hidden md:inline", isSelectedLang && "font-semibold")}>
                              {langName}
                            </span>
                            <span className={cn("md:hidden", isSelectedLang && "font-semibold")}>
                              {langCode}
                            </span>
                          </motion.button>
                        )
                      })}
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )
      },
      size: 200,
    },
  ], [
    handleSort,
    sortField,
    sortDirection,
    getLocationId,
    isUserTimezone,
    isSameLocation,
    selectedLocations,
    searchedCity,
    openStates,
    userTimezone,
    _selectedTimeType,
    selectedLanguages,
    getLanguageBadgeColor,
    handleLanguageClick,
    handleProximityClick,
  ])

  // Create TanStack Table instance
  const table = useReactTable({
    data: displayedItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Virtualization for infinite scroll mode or when showing all countries
  const shouldVirtualize = scrollMode === 'infinite' || showAllCountries
  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 72,
    overscan: 10,
    enabled: shouldVirtualize,
    measureElement:
      typeof window !== 'undefined' &&
      navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  })

  // Scroll to user timezone on initial mount
  useEffect(() => {
    if (userTimezone && scrollMode === 'pagination') {
      const userLocationId = getLocationId({ 
        name: '',
        countryName: userTimezone.countryName,
        timezone: userTimezone.name,
        alternativeName: userTimezone.alternativeName,
        countryCode: '',
        currentTimeOffsetInMinutes: 0,
        localHour: 0,
        localMinute: 0,
        mainCities: [],
        languages: [],
        isSimilarTime: false,
        emoji: ''
      } as Location)
      const element = document.getElementById(userLocationId)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }
  }, [userTimezone, getLocationId, scrollMode])

  // Scroll most recent selection into view when selections change
  useEffect(() => {
    if (selectedLocations && selectedLocations.length > 0 && scrollMode === 'pagination') {
      const mostRecent = selectedLocations[0]
      const selectedLocationId = getLocationId(mostRecent)
      const element = document.getElementById(selectedLocationId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedLocations, getLocationId, scrollMode])

  // Scroll listener for back to top button
  useEffect(() => {
    if (scrollMode === 'infinite') {
      const handleScroll = throttle(() => {
        setShowScrollTop(window.scrollY > window.innerHeight * 2)
      }, 100)
      
      window.addEventListener('scroll', handleScroll)
      return () => {
        window.removeEventListener('scroll', handleScroll)
      }
    }
  }, [scrollMode])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (finalLocations.length === 0) {
    return <p>No locations found matching the selected filters.</p>
  }

  // Render virtualized table for infinite scroll or show all
  if (shouldVirtualize) {
    return (
      <div className="relative">
        <div
          ref={tableContainerRef}
          className="h-[600px] overflow-auto relative"
        >
          <table style={{ display: 'grid' }}>
            <thead
              style={{
                display: 'grid',
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: 'var(--background)',
              }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  style={{ display: 'flex', width: '100%' }}
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{
                        display: 'flex',
                        width: header.getSize(),
                      }}
                      className="h-10 px-2 text-left align-middle font-medium text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody
              style={{
                display: 'grid',
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index]
                const location = row.original
                const locationId = getLocationId(location)
                const isUserTz = isUserTimezone(location)
                const selectedIndex = (selectedLocations || []).findIndex(loc => isSameLocation(loc, location))
                const isSelected = selectedIndex !== -1 || isUserTz
                
                let highlightColor = ''
                if (selectedIndex === 0) {
                  highlightColor = 'bg-blue-100/50 dark:bg-blue-950/30'
                } else if (selectedIndex === 1) {
                  highlightColor = 'bg-pink-100/50 dark:bg-pink-950/30'
                } else if (selectedIndex === 2) {
                  highlightColor = 'bg-purple-100/50 dark:bg-purple-950/30'
                } else if (isUserTz) {
                  highlightColor = 'bg-green-200/70 dark:bg-green-900/50'
                }

                return (
                  <tr
                    key={row.id}
                    id={locationId}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      transform: `translateY(${virtualRow.start}px)`,
                      width: '100%',
                    }}
                    className={cn(
                      "hover:bg-amber-100/60 dark:hover:bg-amber-900/40 cursor-pointer transition-colors py-2 border-b",
                      hasMatchingLanguage(
                        location.languages,
                        userTimezone?.languages ?? []
                      ) && !isSelected && "bg-blue-50/30 dark:bg-blue-950/20",
                      highlightColor,
                      isSelected && "font-semibold"
                    )}
                    onClick={() => {
                      handleLocationSelect(location)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{
                          display: 'flex',
                          width: cell.column.getSize(),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Back to top button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ 
                duration: 0.2,
                ease: "easeOut",
              }}
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 bg-black text-white rounded-full px-6 py-2 flex items-center gap-2 shadow-lg hover:bg-gray-800 transition-colors z-50"
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

  // Render normal table for pagination mode
  return (
    <div className="relative">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => {
                const location = row.original
                const locationId = getLocationId(location)
                const isUserTz = isUserTimezone(location)
                const selectedIndex = (selectedLocations || []).findIndex(loc => isSameLocation(loc, location))
                const isSelected = selectedIndex !== -1 || isUserTz
                
                let highlightColor = ''
                if (selectedIndex === 0) {
                  highlightColor = 'bg-blue-100/50 dark:bg-blue-950/30'
                } else if (selectedIndex === 1) {
                  highlightColor = 'bg-pink-100/50 dark:bg-pink-950/30'
                } else if (selectedIndex === 2) {
                  highlightColor = 'bg-purple-100/50 dark:bg-purple-950/30'
                } else if (isUserTz) {
                  highlightColor = 'bg-green-200/70 dark:bg-green-900/50'
                }

                const RowContent = (
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
                    onClick={() => {
                      handleLocationSelect(location)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                )

                return RowContent
              })
            ) : (
              <TableRow>
                <td colSpan={columns.length} className="h-24 text-center">
                  No results.
                </td>
              </TableRow>
            )}
        </TableBody>
      </Table>

      {scrollMode === 'pagination' && (
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
      )}
    </div>
  )
}
