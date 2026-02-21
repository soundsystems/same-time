import * as React from 'react'
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
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
import { useState, useMemo } from 'react'
import type { TimeOfDay } from '@/components/same-time/types'

interface TimeOfDayAutocompleteProps {
  availableTimesOfDay: TimeOfDay[]
  values: TimeOfDay[]
  onSelect: (values: TimeOfDay[]) => void
  'aria-label'?: string
  className?: string
  placeholder?: string
}

const TIME_OF_DAY_EMOJIS: Record<TimeOfDay, string> = {
  'Early Morning': '🌅',
  'Morning': '☀️',
  'Afternoon': '🌤️',
  'Evening': '🌆',
  'Night': '🌙',
  'Late Night': '🌃',
}

export function TimeOfDayAutocomplete({
  availableTimesOfDay,
  values,
  onSelect,
  'aria-label': ariaLabel = "Filter by time of day",
  className,
  placeholder = "All Times of Day",
}: TimeOfDayAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const filteredOptions = useMemo(() => {
    if (!searchValue) return availableTimesOfDay
    return availableTimesOfDay.filter(tod =>
      tod.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [availableTimesOfDay, searchValue])

  const handleToggle = (tod: TimeOfDay) => {
    const isSelected = values.includes(tod)
    if (isSelected) {
      onSelect(values.filter(v => v !== tod))
    } else {
      onSelect([...values, tod])
    }
  }

  const triggerLabel = values.length === 0
    ? placeholder
    : values.length === 1
      ? `${TIME_OF_DAY_EMOJIS[values[0]]} ${values[0]}`
      : `${values.length} times of day`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={cn("w-full justify-between", className)}
        >
          <span className="text-left truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0">
        <Command>
          <CommandInput
            placeholder="Search times of day..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-[240px] overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <CommandEmpty>No times found.</CommandEmpty>
            ) : (
              <>
                {values.length > 0 && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => onSelect([])}
                      className="text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear all times
                    </CommandItem>
                  </CommandGroup>
                )}
                <CommandGroup>
                  {filteredOptions.map((tod) => {
                    const isSelected = values.includes(tod)
                    return (
                      <CommandItem
                        key={tod}
                        value={tod}
                        onSelect={() => handleToggle(tod)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex-1">
                          {TIME_OF_DAY_EMOJIS[tod]} {tod}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

TimeOfDayAutocomplete.displayName = 'TimeOfDayAutocomplete'
