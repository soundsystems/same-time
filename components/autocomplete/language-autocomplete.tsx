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
import { forwardRef, useImperativeHandle, useState } from 'react'

interface LanguageAutocompleteProps {
  languages: string[]
  onSelect: (language: string) => void
  initialValue?: string
}

export const LanguageAutocomplete = forwardRef<
  { reset: () => void },
  LanguageAutocompleteProps
>(({ languages, onSelect, initialValue = '' }, ref) => {
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

  const filteredLanguages = React.useMemo(() => 
    languages.filter(language => 
      language.toLowerCase().includes(value.toLowerCase())
    ),
    [languages, value]
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
          type='button'
          variant="outline"
          className="w-[180px] justify-between"
        >
          {selectedLanguage || "Select language..."}
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
                    key={language}
                    value={language}
                    onSelect={() => handleSelectLanguage(language)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedLanguage === language ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {language}
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

