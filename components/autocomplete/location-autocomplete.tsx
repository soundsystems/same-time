import * as React from 'react'
import type { Location, UserTimezone } from '@/components/same-time/types'
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTimezoneName } from '@/components/same-time/utils'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface LocationAutocompleteProps {
  locations: Location[]
  onSelect: (location: Location, searchedCity?: string) => void
  onRemove?: (location: Location) => void
  selectedLocations?: Location[]
  maxSelections?: number
  initialLocation?: Location | UserTimezone
  showAllCountries?: boolean
  priorityCountries?: string[]
  name?: string
  className?: string
  'aria-label'?: string
}

export const LocationAutocomplete = React.memo(function LocationAutocomplete({ 
  locations, 
  onSelect, 
  onRemove,
  selectedLocations = [],
  maxSelections = 3,
  // biome-ignore lint/complexity/noUnusedVariables: initialLocation kept for API compatibility
  initialLocation,
  name = "location",
  showAllCountries = false,
  priorityCountries = [],
  className,
  'aria-label': ariaLabel = "Select up to 3 timezones"
}: LocationAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState('')

  // Helper to check if location is selected
  const isLocationSelected = React.useCallback((location: Location) => {
    return selectedLocations.some(selected => 
      selected.countryName === location.countryName &&
      selected.timezone === location.timezone &&
      selected.alternativeName === location.alternativeName
    )
  }, [selectedLocations])

  // Helper to get position-based badge color
  const getBadgeColor = React.useCallback((index: number) => {
    switch (index) {
      case 0:
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
      case 1:
        return 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700'
      case 2:
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700'
      default:
        return 'bg-secondary text-secondary-foreground'
    }
  }, [])

  // Add highlight function
  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm) return text
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'))
    let position = 0
    return (
      <>
        {parts.map(part => {
          const currentPosition = position
          position += part.length
          return part.toLowerCase() === searchTerm.toLowerCase() ? (
            <span key={`${part}-${currentPosition}`} className="font-bold">{part}</span>
          ) : part
        })}
      </>
    )
  }

  // Memoize filtered locations
  const filteredLocations = React.useMemo(() => {
    let filtered = locations;
    
    // First filter by search query if one exists
    if (value) {
      const searchTerm = value.toLowerCase()
      
      // Define match scoring function inside
      const getMatchScore = (location: Location, term: string) => {
        if (location.name.toLowerCase() === term) return 100
        if (location.alternativeName.toLowerCase() === term) return 90
        if (location.countryName.toLowerCase() === term) return 80
        if (location.name.toLowerCase().includes(term)) return 70
        if (location.alternativeName.toLowerCase().includes(term)) return 60
        if (location.countryName.toLowerCase().includes(term)) return 50
        const cityIndex = location.mainCities.findIndex(city => city.toLowerCase().includes(term))
        if (cityIndex === 0) return 40
        if (cityIndex > 0) return 30 - cityIndex
        return 0
      }

      filtered = filtered.filter(location => (
        location.name.toLowerCase().includes(searchTerm) ||
        location.alternativeName.toLowerCase().includes(searchTerm) ||
        location.countryName.toLowerCase().includes(searchTerm) ||
        location.mainCities.some(city => city.toLowerCase().includes(searchTerm))
      ))
      // Sort results to prioritize matches
      filtered.sort((a, b) => {
        const aScore = getMatchScore(a, searchTerm)
        const bScore = getMatchScore(b, searchTerm)
        return bScore - aScore
      })
    } 
    // Only apply priority filter if there's no search term
    else if (!showAllCountries) {
      filtered = filtered.filter(location => priorityCountries.includes(location.countryName))
    }
    
    return filtered
  }, [locations, value, showAllCountries, priorityCountries])

  const handleSelect = React.useCallback((locationId: string) => {
    const location = locations.find(loc => 
      `${loc.name}-${loc.alternativeName}-${loc.timezone}` === locationId
    )
    if (!location) {
      return
    }

    // Check if already selected - toggle behavior
    const isSelected = isLocationSelected(location)
    
    if (isSelected) {
      // Remove selection
      if (onRemove) {
        onRemove(location)
      }
      setValue('')
      return
    }

    // Check if max selections reached
    if (selectedLocations.length >= maxSelections) {
      setValue('')
      return
    }

    // Find if there's a matching city in the search
    let matchedCity: string | undefined
    if (value) {
      const searchTerm = value.toLowerCase()
      matchedCity = location.mainCities.find(city => 
        city.toLowerCase().includes(searchTerm)
      )
    }
    
    onSelect(location, matchedCity)
    setValue('')
  }, [locations, onSelect, onRemove, value, isLocationSelected, selectedLocations.length, maxSelections])

  const handleBadgeRemove = React.useCallback((e: React.MouseEvent, location: Location) => {
    e.stopPropagation()
    if (onRemove) {
      onRemove(location)
    }
  }, [onRemove])

  return (
    <Popover 
      open={open} 
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn("w-[400px] h-auto min-h-10 justify-between", className)}
          name={name}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedLocations.length === 0 ? (
              <span className="text-left text-muted-foreground">Select timezones... (0/{maxSelections})</span>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                {selectedLocations.map((location, index) => (
                  <Badge
                    key={`${location.countryName}-${location.timezone}-${location.alternativeName}`}
                    variant="secondary"
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 text-xs font-medium",
                      getBadgeColor(index)
                    )}
                  >
                    <span className="text-sm">{location.emoji}</span>
                    <span className="truncate max-w-[120px]">
                      {formatTimezoneName(location.alternativeName)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleBadgeRemove(e, location)}
                      className="ml-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
                      aria-label={`Remove ${location.countryName}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {selectedLocations.length < maxSelections && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedLocations.length}/{maxSelections})
                  </span>
                )}
              </div>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0"
        side="bottom"
        align="start"
        sideOffset={4}
        avoidCollisions={false}
      >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search cities, countries, or regions..." 
            value={value}
            onValueChange={setValue}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            {filteredLocations.length === 0 ? (
              <CommandEmpty>No locations found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredLocations.map((location) => {
                  const locationId = `${location.name}-${location.alternativeName}-${location.timezone}`
                  const isSelected = isLocationSelected(location)
                  const isMaxReached = selectedLocations.length >= maxSelections && !isSelected
                  
                  // Find the matching city if any
                  const matchingCityIndex = value ? 
                    location.mainCities.findIndex(city => 
                      city.toLowerCase().includes(value.toLowerCase())
                    ) : -1

                  // Reorder cities to show matching city first
                  const orderedCities = matchingCityIndex >= 0 ? [
                    location.mainCities[matchingCityIndex],
                    ...location.mainCities.slice(0, matchingCityIndex),
                    ...location.mainCities.slice(matchingCityIndex + 1)
                  ] : location.mainCities
                  
                  return (
                    <CommandItem
                      key={locationId}
                      value={locationId}
                      onSelect={() => handleSelect(locationId)}
                      disabled={isMaxReached}
                      className={cn(
                        "flex flex-col py-3 px-4 justify-start items-start",
                        isMaxReached && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full justify-start">
                        <span className="text-lg shrink-0">{location.emoji}</span>
                        <span className="flex-1 text-left">
                          {highlightMatch(formatTimezoneName(location.name), value)} ({highlightMatch(location.alternativeName, value)}), {highlightMatch(location.countryName, value)}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                        {isMaxReached && (
                          <span className="text-xs text-muted-foreground">(Max {maxSelections} selected)</span>
                        )}
                      </div>
                      {orderedCities.length > 0 && (
                        <span className="text-sm text-muted-foreground pl-8">
                          {orderedCities.map((city, index) => (
                            <span key={city}>
                              {index > 0 && ', '}
                              {highlightMatch(city, value)}
                            </span>
                          ))}
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

LocationAutocomplete.displayName = 'LocationAutocomplete'

