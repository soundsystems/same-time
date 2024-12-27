import { formatInTimeZone } from 'date-fns-tz'
import type { UserTimezone } from './types'
import { getTimeOfDay } from './utils'

// Add time format type
type TimeFormat = `${number}:${number} ${'AM' | 'PM'}`

interface UserTimezoneInfoProps {
  userTimezone: UserTimezone | null
  userTime: TimeFormat
}

export function UserTimezoneInfo({ userTimezone, userTime }: UserTimezoneInfoProps) {
  // 1. validation/early returns
  if (!userTimezone) return null

  // 2. validation for time format
  const isValidTimeFormat = (time: string) => {
    const [hours, period] = time.split(' ')
    return hours.includes(':') && ['AM', 'PM'].includes(period)
  }

  if (!isValidTimeFormat(userTime)) {
    // Better fallback that maintains UI structure
    return (
      <div className="font-mono space-y-2">
        <h2 className="text-sm font-semibold">Time Zone Information</h2>
        <p className="text-sm">Local Time: --:-- --</p>
        <p className="text-sm">Time of Day: --</p>
        <p className="text-sm">Region: Unknown</p>
        <p className="text-sm">Languages: --</p>
      </div>
    )
  }

  // 3. try/catch block for time formatting
  try {
    const hour = Number.parseInt(formatInTimeZone(new Date(), userTimezone.name || 'UTC', 'H'))
    const timeOfDay = getTimeOfDay(hour)

    return (
      <div className="font-mono space-y-2">
        <h2 className="text-sm font-semibold">Your Time Zone: {userTimezone.name}</h2>
        <p className="text-sm">Local Time: {userTime}</p>
        <p className="text-sm">Time of Day: {timeOfDay}</p>
        <p className="text-sm">Your Country: {userTimezone.emoji} {userTimezone.countryName}</p>
        <p className="text-sm">Official Languages: {userTimezone.languages.join(', ')}</p>
      </div>
    )
  } catch (error) {
    // Maintain visual structure even in error state
    return (
      <div className="font-mono space-y-2">
        <h2 className="text-sm font-semibold">Your Time Zone: {userTimezone.name}</h2>
        <p className="text-sm">Local Time: {userTime}</p>
        <p className="text-sm">Time of Day: --</p>
        <p className="text-sm">Your Country: {userTimezone.emoji} {userTimezone.countryName}</p>
        <p className="text-sm">Official Languages: {userTimezone.languages.join(', ')}</p>
      </div>
    )
  }
} 