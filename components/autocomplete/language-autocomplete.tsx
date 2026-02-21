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
import { forwardRef, useImperativeHandle, useState, useMemo } from 'react'
import { languages as countryLanguages, type TLanguageCode } from 'countries-list'

interface LanguageInfo {
  code: string
  name: string
  display: string
}

interface LanguageAutocompleteProps {
  languages: (string | LanguageInfo)[]
  onSelect: (languages: string[]) => void
  selectedLanguages: string[]
  maxSelections?: number
  'aria-label'?: string
  className?: string
  placeholder?: string
  mobilePlaceholder?: string
}

export const LanguageAutocomplete = React.forwardRef<
  { reset: () => void },
  LanguageAutocompleteProps
>(function LanguageAutocomplete({ 
  languages, 
  onSelect, 
  selectedLanguages,
  maxSelections = 8,
  'aria-label': ariaLabel = "Select languages",
  className,
  placeholder = "Filter by languages",
  mobilePlaceholder = "Filter"
}, ref) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  useImperativeHandle(ref, () => ({
    reset: () => {
      setValue('')
      onSelect([])
      setOpen(false)
    }
  }))

  const formattedLanguages = useMemo(() => {
    // Create a Map to ensure unique language entries by code
    const languageMap = new Map()
    
    // Filter out any 'All' entries from the input languages
    const filteredLanguages = languages.filter(lang => 
      typeof lang === 'string' ? lang !== 'All' : lang.code !== 'All'
    )

    for (const lang of filteredLanguages) {
      // If it's a string, assume it's a language name (not code)
      if (typeof lang === 'string') {
        // Find the language code by name
        const entry = Object.entries(countryLanguages).find(([_, data]) => data.name === lang)
        if (entry) {
          const [code, data] = entry
          languageMap.set(code, {
            code,
            name: data.name,
            display: `${data.name} (${code})`
          })
        } else {
          // If not found in countryLanguages, use the string as is
          languageMap.set(lang, {
            code: lang,
            name: lang,
            display: lang
          })
        }
      } else if (typeof lang === 'object' && 'code' in lang) {
        // If it's already an object with a code, format it properly
        const code = lang.code
        if (!languageMap.has(code)) {
          languageMap.set(code, {
            code,
            name: lang.name,
            display: `${lang.name} (${code})`
          })
        }
      }
    }

    return Array.from(languageMap.values())
  }, [languages])

  const filteredLanguages = React.useMemo(() => 
    formattedLanguages.filter(language => 
      language.display.toLowerCase().includes(value.toLowerCase()) ||
      language.code.toLowerCase().includes(value.toLowerCase())
    ),
    [formattedLanguages, value]
  )

  const handleToggleLanguage = (languageCode: string) => {
    const isSelected = selectedLanguages.includes(languageCode)
    
    if (isSelected) {
      // Remove language
      onSelect(selectedLanguages.filter(l => l !== languageCode))
    } else if (selectedLanguages.length < maxSelections) {
      // Add language (max reached check)
      onSelect([...selectedLanguages, languageCode])
    }
    // If max reached and not selected, do nothing
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
          aria-controls="language-search"
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={cn("w-[200px] justify-between", className)}
        >
          {selectedLanguages.length === 0 ? (
            <span className="fade-in text-left truncate">All Languages</span>
          ) : (
            <span className="text-left truncate">
              {selectedLanguages.length} language{selectedLanguages.length > 1 ? 's' : ''}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-0" side="bottom" avoidCollisions={false}>
        <Command>
          <CommandInput 
            placeholder="Search languages..." 
            value={value}
            onValueChange={setValue}
          />
          <CommandList className="max-h-[200px] overflow-y-auto">
            {filteredLanguages.length === 0 ? (
              <CommandEmpty>No languages found.</CommandEmpty>
            ) : (
              <>
                {selectedLanguages.length > 0 && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => onSelect([])}
                      className="text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear all languages
                    </CommandItem>
                  </CommandGroup>
                )}
                <CommandGroup>
                  {filteredLanguages.map((language) => {
                    const isSelected = selectedLanguages.includes(language.code)
                    const canSelect = selectedLanguages.length < maxSelections || isSelected
                    
                    return (
                      <CommandItem
                        key={language.code}
                        value={language.display}
                        onSelect={() => handleToggleLanguage(language.code)}
                        disabled={!canSelect}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex-1">{language.display}</span>
                        {!canSelect && (
                          <span className="ml-auto text-xs text-muted-foreground">(Max reached)</span>
                        )}
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
})

LanguageAutocomplete.displayName = 'LanguageAutocomplete'

