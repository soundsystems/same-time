import { LocationAutocomplete } from '../autocomplete/location-autocomplete'
import { LanguageAutocomplete } from '../autocomplete/language-autocomplete'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FilterControlsProps, TimeType, TimeOfDay } from './types'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'motion/react'
import { toast } from '@/hooks/use-toast'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PRIORITY_COUNTRIES } from './index'
import { languages, type TLanguageCode } from 'countries-list'
import { getTimeType, getTimeOfDay } from './utils'

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
    rotations: 1.25,
    scale: [1, 0.85, 1],
  },
  showAllCountries,
  onShowAllCountriesChange,
  scrollMode,
  onScrollModeChange
}: FilterControlsProps & { animationConfig?: AnimationConfig }) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [showReset, setShowReset] = useState(false)

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

  const handleScrollModeChange = (showAll: boolean) => {
    onScrollModeChange(showAll ? 'infinite' : 'pagination')
  }

  const formattedLanguages = useMemo(() => {
    const allOption: LanguageInfo = { code: 'All', name: 'All', display: 'All Languages' }
    
    // Filter locations based on current filters (except language filter)
    const filteredLocs = locations.filter(location => {
      const timeType = getTimeType(
        location.currentTimeOffsetInMinutes, 
        userTimezone?.currentTimeOffsetInMinutes || 0,
        location.isSimilarTime
      )
      const timeTypeMatch = selectedTimeType === 'All' || timeType === selectedTimeType
      const timeOfDayMatch = selectedTimeOfDay === 'All' || getTimeOfDay(location.localHour) === selectedTimeOfDay

      // If not showing all countries, check priority
      if (!showAllCountries && !PRIORITY_COUNTRIES.includes(location.countryName)) {
        return false
      }

      return timeTypeMatch && timeOfDayMatch
    })

    // Get unique languages from filtered locations
    const langMap = new Map<string, LanguageInfo>()
    for (const location of filteredLocs) {
      for (const lang of location.languages) {
        if (typeof lang === 'string') {
          const code = lang.toLowerCase()
          if (!langMap.has(code)) {
            langMap.set(code, {
              code,
              name: languages[code as TLanguageCode]?.name || code,
              display: `${languages[code as TLanguageCode]?.name || code} (${code})`
            })
          }
        } else {
          if (!langMap.has(lang.code)) {
            langMap.set(lang.code, lang)
          }
        }
      }
    }

    return [allOption, ...Array.from(langMap.values()).sort((a, b) => a.name.localeCompare(b.name))]
  }, [locations, userTimezone?.currentTimeOffsetInMinutes, selectedTimeType, selectedTimeOfDay, showAllCountries])

  // Validation checks
  if (!Array.isArray(locations) || !Array.isArray(availableLanguages)) {
    return null
  }

  const validTimeTypes: TimeType[] = ['All', 'Same Time', 'Similar Time', 'Reverse Time']
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
              initialLocation={locations.find(loc => loc.timezone === userTimezone?.name)}
              aria-label="Select location"
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
              onSelect={onLanguageChange}
              initialValue={selectedLanguage}
              aria-label="Filter by language" 
              className="w-full"
              placeholder="All Languages"
              mobilePlaceholder="All Langs"
            />
            {/* Show toggle only on mobile */}
            <motion.div 
              className="md:hidden flex flex-col items-start gap-2 min-w-[150px]"
              layout="position"
              layoutId="mobile-toggle"
            >
              <Label 
                htmlFor="show-all-countries-mobile"
                className="text-sm text-gray-500"
              >
                Show all countries
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
            <Select 
              value={selectedTimeType} 
              onValueChange={onTimeTypeChange}
              aria-label="Filter by time type"
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Time Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="Same Time">Same Time</SelectItem>
                <SelectItem value="Similar Time">Similar Time</SelectItem>
                <SelectItem value="Reverse Time">Reverse Time</SelectItem>
              </SelectContent>
            </Select>
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
              className="w-full"
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Time of Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Times</SelectItem>
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
                        duration: animationConfig.duration,
                        ease: animationConfig.ease || "easeInOut"
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