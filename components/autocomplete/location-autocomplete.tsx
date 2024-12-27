import * as React from 'react'
import type { Location, UserTimezone } from '@/components/same-time/types'
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface LocationAutocompleteProps {
  locations: Location[]
  onSelect: (location: Location) => void
  initialLocation?: Location | UserTimezone
}

export const LocationAutocomplete = React.memo(function LocationAutocomplete({ 
  locations, 
  onSelect, 
  initialLocation,
  name = "location"
}: LocationAutocompleteProps & { name?: string }) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  
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

  // Memoize handlers
  const handleValueChange = React.useCallback((value: string) => {
    setQuery(value)
  }, [])

  const handleSelect = React.useCallback((location: Location) => {
    setSelectedLocation(location)
    onSelect(location)
    setOpen(false)
    setQuery("")
  }, [onSelect])

  // Memoize filtered locations
  const filteredLocations = React.useMemo(() => {
    if (!query) return locations
    
    const searchTerm = query.toLowerCase()
    return locations.filter(location => (
      location.name.toLowerCase().includes(searchTerm) ||
      location.alternativeName.toLowerCase().includes(searchTerm) ||
      location.countryName.toLowerCase().includes(searchTerm) ||
      location.mainCities.some(city => city.toLowerCase().includes(searchTerm))
    ))
  }, [locations, query])

  return (
    <Popover 
      open={open} 
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          // biome-ignore lint/a11y/useSemanticElements: <explanation>
          role="combobox"
          aria-expanded={open}
          aria-controls="location-search"
          aria-haspopup="listbox"
          aria-label="Select location"
          className="w-[400px] justify-between"
          name={name}
        >
          {selectedLocation ? (
            <div className="flex items-center w-full">
              <span className="mr-2 text-lg shrink-0">
                {selectedLocation.emoji}
              </span>
              <span className="truncate flex-1">
                {('timezone' in selectedLocation 
                  ? selectedLocation.timezone 
                  : selectedLocation.name).replace(/_/g, ' ')}
              </span>
            </div>
          ) : (
            "Change Location..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            id="location-search"
            placeholder="Search cities, countries, or regions..." 
            value={query}
            onValueChange={handleValueChange}
            aria-label="Search locations"
          />
          <ScrollArea className="h-[300px]">
            <CommandGroup>
              {filteredLocations.length === 0 ? (
                <output 
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No locations found.
                </output>
              ) : (
                filteredLocations.map((location) => (
                  <CommandItem
                    key={`${location.name}-${location.alternativeName}-${location.timezone}`}
                    value={location.name}
                    className={cn(
                      "flex flex-col py-3 px-4 cursor-pointer",
                      selectedLocation && 
                      ('timezone' in selectedLocation ? selectedLocation.timezone : selectedLocation.name) === location.timezone && 
                      "bg-accent"
                    )}
                    onSelect={() => handleSelect(location)}
                    aria-selected={Boolean(
                      selectedLocation && 
                      ('timezone' in selectedLocation ? selectedLocation.timezone : selectedLocation.name) === location.timezone
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{location.emoji}</span>
                      <span className="flex-1">
                        {location.name.replace(/_/g, ' ')} ({location.alternativeName}), {location.countryName}
                      </span>
                      {selectedLocation && 
                       ('timezone' in selectedLocation ? selectedLocation.timezone : selectedLocation.name) === location.timezone && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </div>
                    {location.mainCities.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {location.mainCities.join(', ')}
                      </span>
                    )}
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

LocationAutocomplete.displayName = 'LocationAutocomplete'

