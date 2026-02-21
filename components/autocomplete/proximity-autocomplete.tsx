import * as React from 'react'
import { Check, ChevronsUpDown } from "lucide-react"
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
import { forwardRef, useImperativeHandle, useState, useMemo } from 'react'
import type { TimeType } from '@/components/same-time/types'

interface ProximityAutocompleteProps {
  value: TimeType
  onSelect: (value: TimeType) => void
  'aria-label'?: string
  className?: string
  placeholder?: string
}

interface ProximityOption {
  value: TimeType
  label: string
  display: string
}

const PROXIMITY_OPTIONS: ProximityOption[] = [
  { value: 'All', label: 'All Proximities', display: 'All Proximities' },
  { value: 'Synced', label: 'Synced', display: '✅ Synced' },
  { value: 'Adjacent', label: 'Adjacent', display: '☑️ Adjacent' },
  { value: 'Reverse Time', label: 'Reverse Time', display: '😵‍💫 Reverse Time' },
]

export const ProximityAutocomplete = React.forwardRef<
  { reset: () => void },
  ProximityAutocompleteProps
>(function ProximityAutocomplete({ 
  value,
  onSelect,
  'aria-label': ariaLabel = "Filter by proximity",
  className,
  placeholder = "Filter by Proximity"
}, ref) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  useImperativeHandle(ref, () => ({
    reset: () => {
      setSearchValue('')
      onSelect('All')
      setOpen(false)
    }
  }))

  const filteredOptions = useMemo(() => {
    if (!searchValue) {
      return PROXIMITY_OPTIONS
    }
    return PROXIMITY_OPTIONS.filter(option => 
      option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.display.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [searchValue])

  const selectedOption = PROXIMITY_OPTIONS.find(opt => opt.value === value)
  const displayText = selectedOption?.display || placeholder

  const handleSelect = (selectedValue: TimeType) => {
    onSelect(selectedValue)
    setOpen(false)
    setSearchValue('')
  }

  return (
    <Popover 
      open={open} 
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls="proximity-search"
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={cn("w-full justify-between", className)}
        >
          <span className="text-left truncate">{displayText}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" side="bottom" avoidCollisions={false}>
        <Command>
          <CommandInput 
            placeholder="Search proximity..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-[200px] overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <CommandEmpty>No proximity types found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => {
                  const isSelected = value === option.value
                  
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1">{option.display}</span>
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

ProximityAutocomplete.displayName = 'ProximityAutocomplete'
