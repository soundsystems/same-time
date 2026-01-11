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
import { languages as countryLanguages, type TLanguageCode } from 'countries-list'

interface LanguageInfo {
  code: string
  name: string
  display: string
}

interface LanguageAutocompleteProps {
  languages: (string | LanguageInfo)[]
  onSelect: (language: string) => void
  initialValue?: string
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
  initialValue = 'All',
  'aria-label': ariaLabel = "Select language",
  className,
  placeholder = "Filter by language",
  mobilePlaceholder = "Filter"
}, ref) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState(initialValue)

  useImperativeHandle(ref, () => ({
    reset: () => {
      setValue('')
      setSelectedLanguage('All')
      setOpen(false)
    }
  }))

  const formattedLanguages = useMemo(() => {
    const allOption = { code: 'All', name: 'All Languages', display: 'All Languages' }
    
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

    return [allOption, ...Array.from(languageMap.values())]
  }, [languages])

  const filteredLanguages = React.useMemo(() => 
    formattedLanguages.filter(language => 
      language.display.toLowerCase().includes(value.toLowerCase()) ||
      language.code.toLowerCase().includes(value.toLowerCase())
    ),
    [formattedLanguages, value]
  )

  React.useEffect(() => {
    setSelectedLanguage(initialValue)
  }, [initialValue])

  const handleSelectLanguage = (language: string) => {
    setSelectedLanguage(language)
    setOpen(false)
    onSelect(language)
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
          {selectedLanguage === 'All' ? (
            <span className="fade-in text-left">All Languages</span>
          ) : (
            <span className="text-left">
              {formattedLanguages.find(l => l.code === selectedLanguage)?.display || 
              selectedLanguage}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-0">
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
              <CommandGroup>
                {filteredLanguages.map((language) => (
                  <CommandItem
                    key={language.code}
                    value={language.display}
                    onSelect={() => handleSelectLanguage(language.code)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedLanguage === language.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {language.display}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

LanguageAutocomplete.displayName = 'LanguageAutocomplete'

