import { LocationAutocomplete } from '../autocomplete/location-autocomplete'
import { LanguageAutocomplete } from '../autocomplete/language-autocomplete'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FilterControlsProps, TimeType, TimeOfDay } from './types'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from '@/hooks/use-toast'

interface AnimationConfig {
  duration: number
  fadeInDuration?: number
  fadeOutDuration?: number
  rotations?: number
  scale?: [number, number, number]
  ease?: string
}

export function FilterControls({
  locations,
  userTimezone,
  availableLanguages,
  selectedTimeType,
  selectedTimeOfDay,
  selectedLanguage,
  onLocationChange,
  onTimeTypeChange,
  onTimeOfDayChange,
  onLanguageChange,
  availableTimesOfDay,
  onReset,
  languageAutocompleteRef,
  animationConfig = {
    duration: 0.8,
    fadeInDuration: 0.2,
    fadeOutDuration: 0.15,
    rotations: 1.25, // Will rotate 450 degrees
    scale: [1, 0.85, 1],
  }
}: FilterControlsProps & { animationConfig?: AnimationConfig }) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [showReset, setShowReset] = useState(false)

  // 1. validation checks
  if (!Array.isArray(locations)) {
    console.error('FilterControls: locations prop must be an array')
    return null
  }

  if (!Array.isArray(availableLanguages)) {
    console.error('FilterControls: availableLanguages prop must be an array')
    return null
  }

  // 2. validation arrays
  const validTimeTypes: TimeType[] = ['All', 'Same Time', 'Similar Time', 'Reverse Time']
  const validTimeOfDay: TimeOfDay[] = ['All', 'Early Morning', 'Morning', 'Afternoon', 'Evening', 'Night', 'Late Night']

  // 3. validation checks for selected values
  if (!validTimeTypes.includes(selectedTimeType)) {
    console.error('FilterControls: invalid selectedTimeType')
    return null
  }

  if (!validTimeOfDay.includes(selectedTimeOfDay)) {
    console.error('FilterControls: invalid selectedTimeOfDay')
    return null
  }

  // Check if any filters are active
  useEffect(() => {
    const hasActiveFilters = 
      selectedTimeType !== 'All' || 
      selectedTimeOfDay !== 'All' || 
      selectedLanguage !== 'All'
    
    setShowReset(hasActiveFilters)
  }, [selectedTimeType, selectedTimeOfDay, selectedLanguage])

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

  // 4. render
  return (
    <form 
      className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-row gap-4 w-full max-w-screen-lg mx-auto px-4"
      aria-label="Filter locations"
    >
      <div className="w-full">
        <LocationAutocomplete 
          locations={locations} 
          onSelect={onLocationChange}
          initialLocation={locations.find(loc => loc.timezone === userTimezone?.name)}
          aria-label="Select location"
        />
      </div>
      <div className="w-full">
        <LanguageAutocomplete 
          ref={languageAutocompleteRef}
          languages={['All', ...availableLanguages]} 
          onSelect={onLanguageChange}
          aria-label="Filter by language" 
        />
      </div>
      <div className="w-full">
        <Select 
          value={selectedTimeType} 
          onValueChange={onTimeTypeChange}
          aria-label="Filter by time type"
        >
          <SelectTrigger className="w-[180px] transition-all hover:bg-gray-100/50 focus:ring-2 focus:ring-blue-500 focus:outline-none hover:scale-105">
            <SelectValue placeholder="Filter by Time Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem className="transition-colors hover:bg-gray-100/50 focus:bg-gray-100/50" value="All">
              All Types
            </SelectItem>
            <SelectItem value="Same Time">Same Time</SelectItem>
            <SelectItem value="Similar Time">Similar Time</SelectItem>
            <SelectItem value="Reverse Time">Reverse Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-full">
        <Select 
          value={selectedTimeOfDay} 
          onValueChange={onTimeOfDayChange}
          aria-label="Filter by time of day"
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Time of Day" />
          </SelectTrigger>
          <SelectContent>
            {availableTimesOfDay.map(timeOfDay => (
              <SelectItem key={timeOfDay} value={timeOfDay}>
                {timeOfDay === 'All' ? 'All Times of Day' : timeOfDay}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <AnimatePresence mode="wait">
        {showReset && (
          <motion.div 
            className="w-full lg:w-auto flex items-center"
            initial={{ opacity: 0, scale: 0.9, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ 
              opacity: 0, 
              scale: 0.9, 
              rotate: 45,
              transition: { 
                duration: animationConfig.fadeOutDuration 
              }
            }}
            transition={{ 
              duration: animationConfig.fadeInDuration,
              ease: animationConfig.ease
            }}
          >
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              aria-label="Reset all filters"
              title="Reset all filters"
              className="transition-all hover:bg-gray-100/50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <motion.div
                animate={isSpinning ? { rotate: 360 } : {}}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
} 