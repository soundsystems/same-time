import { LocationAutocomplete } from '../autocomplete/location-autocomplete'
import { LanguageAutocomplete } from '../autocomplete/language-autocomplete'
import { ProximityAutocomplete } from '../autocomplete/proximity-autocomplete'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FilterControlsProps, TimeType, TimeOfDay, Location } from './types'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'motion/react'
import { toast } from '@/hooks/use-toast'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PRIORITY_COUNTRIES } from './index'
import { useLocationState } from '@/hooks/use-location-state'

interface AnimationConfig {
  duration: number
  fadeInDuration?: number
  fadeOutDuration?: number
  rotations?: number
  scale?: [number, number, number]
  ease?: string
}

interface LanguageInfo {
  code: string
  name: string
  display: string
}

export function FilterControls({
  locations,
  userTimezone,
  availableLanguages,
  selectedTimeType,
  selectedTimeOfDay,
  onLocationChange,
  onTimeTypeChange,
  onTimeOfDayChange,
  availableTimesOfDay,
  onReset,
  languageAutocompleteRef,
  animationConfig = {
    duration: 0.8,
    fadeInDuration: 0.2,
    fadeOutDuration: 0.15,
    rotations: 1.25,
    scale: [1, 0.85, 1],
  },
  showAllCountries,
  onShowAllCountriesChange,
  scrollMode,
  onScrollModeChange,
  selectedLocations = []
}: Omit<FilterControlsProps, 'selectedLanguage' | 'onLanguageChange'> & { 
  animationConfig?: AnimationConfig
  selectedLocations?: Location[]
}) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const { selectedLanguages, setLanguages, removeSelectedTimezone } = useLocationState()

  const handleLocationRemove = (location: Location) => {
    const encoded = `${location.countryName}|${location.timezone}|${location.alternativeName}`
    removeSelectedTimezone(encoded)
  }

  // Check if any filters are active
  useEffect(() => {
    const hasActiveFilters = 
      selectedTimeType !== 'All' || 
      selectedTimeOfDay !== 'All' || 
      selectedLanguages.length > 0 ||
      selectedLocations.length > 0
    
    setShowReset(hasActiveFilters)
  }, [selectedTimeType, selectedTimeOfDay, selectedLanguages, selectedLocations])

  const handleReset = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsSpinning(true)
    onReset()
    toast({
      title: "Filters have been reset",
      description: "All filters have been reset to their default values",
    })
    setTimeout(() => setIsSpinning(false), 500)
  }

  const formattedLanguages = useMemo(() => {
    const allOption: LanguageInfo = { code: 'All', name: 'All', display: 'All Languages' }
    return [allOption, ...availableLanguages]
  }, [availableLanguages])

  // Validation checks
  if (!Array.isArray(locations) || !Array.isArray(availableLanguages)) {
    return null
  }

  const validTimeTypes: TimeType[] = ['All', 'Same Time', 'Close Time', 'Reverse Time']
  const validTimeOfDay: TimeOfDay[] = ['All', 'Early Morning', 'Morning', 'Afternoon', 'Evening', 'Night', 'Late Night']

  if (!validTimeTypes.includes(selectedTimeType) || !validTimeOfDay.includes(selectedTimeOfDay)) {
    return null
  }

  // 4. render
  return (
    <LayoutGroup id="filter-controls">
      <motion.form 
        className="grid grid-cols-1 gap-4 w-full max-w-screen-lg mx-auto"
        aria-label="Filter locations"
        layout="size"
        layoutId="filter-form"
        transition={{ 
          layout: { duration: 0.3, type: "spring", stiffness: 200, damping: 30 }
        }}
      >
        {/* Top row - Location selector with toggle on larger screens */}
        <motion.div 
          className="flex flex-col md:flex-row md:items-center"
          layout="position"
          layoutId="top-row"
          transition={{ 
            layout: { duration: 0.3, type: "spring", stiffness: 200, damping: 30 }
          }}
        >
          <motion.div 
            className="flex-1 md:mr-4"
            layout="size"
            layoutId="location-autocomplete"
          >
            <LocationAutocomplete 
              locations={locations} 
              onSelect={onLocationChange}
              onRemove={handleLocationRemove}
              selectedLocations={selectedLocations}
              maxSelections={3}
              initialLocation={locations.find(loc => loc.timezone === userTimezone?.name)}
              aria-label="Select up to 3 timezones"
              showAllCountries={scrollMode === 'infinite'}
              priorityCountries={PRIORITY_COUNTRIES}
              className="w-full"
            />
          </motion.div>
          <motion.div 
            className="hidden md:flex items-center gap-2"
            layout="position"
            layoutId="desktop-toggle"
          >
            <Label 
              htmlFor="show-all-countries-desktop"
              className="text-sm text-gray-500 whitespace-nowrap"
            >
              Show all countries
            </Label>
            <Switch
              id="show-all-countries-desktop"
              checked={showAllCountries}
              onCheckedChange={onShowAllCountriesChange}
            />
          </motion.div>
        </motion.div>

        {/* Bottom row - Other filters */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          layout="position"
          layoutId="bottom-row"
          transition={{ 
            layout: { duration: 0.3, type: "spring", stiffness: 200, damping: 30 }
          }}
        >
          <motion.div 
            className="flex items-center gap-4"
            layout="position"
            layoutId="language-filter"
          >
            <LanguageAutocomplete 
              ref={languageAutocompleteRef}
              languages={formattedLanguages}
              onSelect={setLanguages}
              selectedLanguages={selectedLanguages}
              maxSelections={8}
              aria-label="Filter by languages" 
              className="w-full"
              placeholder="All Languages"
              mobilePlaceholder="All Langs"
            />
            {/* Show toggle only on mobile */}
            <motion.div 
              className="md:hidden flex items-center gap-2"
              layout="position"
              layoutId="mobile-toggle"
            >
              <Label 
                htmlFor="show-all-countries-mobile"
                className="text-sm text-gray-500 whitespace-nowrap"
              >
                Show all
              </Label>
              <Switch
                id="show-all-countries-mobile"
                checked={showAllCountries}
                onCheckedChange={onShowAllCountriesChange}
              />
            </motion.div>
          </motion.div>

          <motion.div 
            layout="position"
            layoutId="time-type-filter"
          >
            <ProximityAutocomplete 
              value={selectedTimeType} 
              onSelect={onTimeTypeChange}
              aria-label="Filter by proximity"
              className="w-full"
            />
          </motion.div>

          <motion.div 
            className="flex items-center gap-4"
            layout="position"
            layoutId="time-of-day-filter"
          >
            <Select 
              value={selectedTimeOfDay} 
              onValueChange={onTimeOfDayChange}
              aria-label="Filter by time of day"
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Time of Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Times of Day</SelectItem>
                {availableTimesOfDay.map(timeOfDay => (
                  <SelectItem key={timeOfDay} value={timeOfDay}>
                    {timeOfDay}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AnimatePresence>
              {showReset && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleReset}
                    className="relative"
                    aria-label="Reset filters"
                  >
                    <motion.div
                      animate={isSpinning ? {
                        rotate: 360 * (animationConfig.rotations || 1),
                        scale: animationConfig.scale || [1, 0.85, 1]
                      } : {}}
                      transition={{
                        duration: animationConfig.duration
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </motion.div>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.form>
    </LayoutGroup>
  )
} 