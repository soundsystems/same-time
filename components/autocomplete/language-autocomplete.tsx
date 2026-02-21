import * as React from 'react'
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
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

const MAX_VISIBLE_BADGES = 6

export const LanguageAutocomplete = React.forwardRef<
  { reset: () => void },
  LanguageAutocompleteProps
>(function LanguageAutocomplete({
  languages,
  onSelect,
  selectedLanguages,
  maxSelections = 6,
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
    const languageMap = new Map()

    const filteredLanguages = languages.filter(lang =>
      typeof lang === 'string' ? lang !== 'All' : lang.code !== 'All'
    )

    for (const lang of filteredLanguages) {
      if (typeof lang === 'string') {
        const entry = Object.entries(countryLanguages).find(([_, data]) => data.name === lang)
        if (entry) {
          const [code, data] = entry
          languageMap.set(code, {
            code,
            name: data.name,
            display: `${data.name} (${code})`
          })
        } else {
          languageMap.set(lang, {
            code: lang,
            name: lang,
            display: lang
          })
        }
      } else if (typeof lang === 'object' && 'code' in lang) {
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
      onSelect(selectedLanguages.filter(l => l !== languageCode))
    } else if (selectedLanguages.length < maxSelections) {
      onSelect([...selectedLanguages, languageCode])
    }
  }

  // Get language name for badge display
  const getLanguageName = (code: string) => {
    const lang = formattedLanguages.find(l => l.code === code)
    return lang?.name ?? code
  }

  const visibleBadges = selectedLanguages.slice(0, MAX_VISIBLE_BADGES)
  const extraCount = selectedLanguages.length - MAX_VISIBLE_BADGES

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls="language-search"
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={cn("w-full min-h-10 justify-between", className)}
        >
          {selectedLanguages.length === 0 ? (
            <span className="text-left truncate text-muted-foreground">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
              {visibleBadges.map(code => (
                <Badge
                  key={code}
                  variant="secondary"
                  className="flex items-center gap-0.5 px-1.5 py-0 text-xs font-medium"
                >
                  <span className="truncate max-w-[80px]">{getLanguageName(code)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(selectedLanguages.filter(l => l !== code))
                    }}
                    className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
                    aria-label={`Remove ${getLanguageName(code)}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
              {extraCount > 0 && (
                <span className="text-xs text-muted-foreground">+{extraCount} more</span>
              )}
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0">
        <Command>
          <CommandInput
            placeholder="Search languages..."
            value={value}
            onValueChange={setValue}
          />
          <CommandList className="max-h-[240px] overflow-y-auto">
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
