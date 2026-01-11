import * as React from 'react'
import type { Location, UserTimezone } from '@/components/same-time/types'
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTimezoneName } from '@/components/same-time/utils'
import { Button } from "@/components/ui/button"
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
  initialLocation,
  name = "location",
  showAllCountries = false,
  priorityCountries = [],
  className,
  'aria-label': ariaLabel = "Select location"
}: LocationAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState('')

  // Memoize the initial state calculation
  const initialLocationState = React.useMemo(() => {
    if (!initialLocation) return null;
    return {
      ...initialLocation,
      timezone: 'timezone' in initialLocation 
        ? initialLocation.timezone 
        : initialLocation.name
    }
  }, [initialLocation])

  const [selectedLocation, setSelectedLocation] = 
    React.useState<Location | UserTimezone | null>(initialLocationState)

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
    if (location) {
      // Find if there's a matching city in the search
      let matchedCity: string | undefined
      if (value) {
        const searchTerm = value.toLowerCase()
        matchedCity = location.mainCities.find(city => 
          city.toLowerCase().includes(searchTerm)
        )
      }
      
      setSelectedLocation(location)
      onSelect(location, matchedCity)
      setOpen(false)
      setValue('')
    }
  }, [locations, onSelect, value])

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
          className={cn("w-[400px] justify-between", className)}
          name={name}
        >
          {selectedLocation ? (
            <div className="flex items-center w-full justify-start">
              <span className="mr-2 text-lg shrink-0">
                {'emoji' in selectedLocation ? selectedLocation.emoji : '🌍'}
              </span>
              <span className="truncate flex-1 text-left">
                {formatTimezoneName('timezone' in selectedLocation 
                  ? selectedLocation.timezone 
                  : selectedLocation.name)}
              </span>
            </div>
          ) : (
            <span className="fade-in text-left">Change Location...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0" 
        side="bottom" 
        align="start"
        sideOffset={4}
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
                  const isSelected = selectedLocation && 
                    ('timezone' in selectedLocation ? selectedLocation.timezone : selectedLocation.name) === location.timezone
                  
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
                      className="flex flex-col py-3 px-4 justify-start items-start"
                    >
                      <div className="flex items-center gap-2 w-full justify-start">
                        <span className="text-lg shrink-0">{location.emoji}</span>
                        <span className="flex-1 text-left">
                          {highlightMatch(formatTimezoneName(location.name), value)} ({highlightMatch(location.alternativeName, value)}), {highlightMatch(location.countryName, value)}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0" />
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

