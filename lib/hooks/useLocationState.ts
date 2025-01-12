import { useQueryState } from 'nuqs'
import type { TimeType, TimeOfDay, SortField } from '@/components/same-time/types'

export function useLocationState() {
  const [selectedTimeType, setSelectedTimeType] = useQueryState<TimeType>('type', {
    defaultValue: 'All',
    parse: (value): TimeType => 
      ['All', 'Same Time', 'Close Time', 'Reverse Time'].includes(value as TimeType) 
        ? (value as TimeType) 
        : 'All',
    history: 'push'
  })
  
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useQueryState<TimeOfDay>('time', {
    defaultValue: 'All',
    parse: (value): TimeOfDay =>
      ['All', 'Early Morning', 'Morning', 'Afternoon', 'Evening', 'Night', 'Late Night'].includes(value as TimeOfDay)
        ? (value as TimeOfDay)
        : 'All',
    history: 'push'
  })
  
  const [selectedLanguage, setSelectedLanguage] = useQueryState('lang', {
    defaultValue: 'All',
    history: 'push'
  })

  const [page, setPage] = useQueryState('p', {
    defaultValue: '1',
    parse: (value) => {
      const num = Number(value)
      return Number.isInteger(num) && num > 0 ? num : 1
    },
    serialize: String,
    history: 'push'
  })

  const [sortField, setSortField] = useQueryState<SortField>('sort', {
    defaultValue: 'type',
    parse: (value): SortField => 
      ['country', 'type'].includes(value as SortField) 
        ? (value as SortField) 
        : 'type',
    history: 'push'
  })

  const [sortDirection, setSortDirection] = useQueryState<'asc' | 'desc'>('dir', {
    defaultValue: 'asc',
    parse: (value): 'asc' | 'desc' => 
      value === 'desc' ? 'desc' : 'asc',
    history: 'push'
  })

  return {
    selectedTimeType,
    setSelectedTimeType,
    selectedTimeOfDay,
    setSelectedTimeOfDay,
    selectedLanguage,
    setSelectedLanguage,
    page,
    setPage,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
  }
} 