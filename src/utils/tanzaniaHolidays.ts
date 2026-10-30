/**
 * Tanzanian Public Holidays & Expected School Days Calculator
 *
 * Computes:
 * 1. Fixed Tanzanian National Holidays
 * 2. Movable Christian Holidays (Good Friday, Easter Monday via Meeus/Jones/Butcher algorithm)
 * 3. Movable Islamic Holidays (Eid al-Fitr, Eid al-Adha, Maulid Day)
 * 4. Expected School Days: Total weekdays (Mon-Fri) in a period minus any holiday falling on a weekday.
 */

export interface HolidayItem {
  date: string // ISO YYYY-MM-DD
  name: string
  isWeekday: boolean
}

export interface ExpectedSchoolDaysResult {
  totalCalendarDays: number
  totalWeekdays: number
  expectedSchoolDays: number
  expectedDates: string[]
  weekdayHolidays: HolidayItem[]
  allHolidaysInPeriod: HolidayItem[]
}

/**
 * Calculates Easter Sunday for a given Gregorian year.
 */
function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 1-based (3 = March, 4 = April)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

/**
 * Official Islamic holidays observed in Tanzania for recent and upcoming years.
 * Source: National Public Holidays Calendar (United Republic of Tanzania).
 */
const ISLAMIC_HOLIDAYS_MAP: Record<number, Array<{ date: string; name: string }>> = {
  2024: [
    { date: '2024-04-10', name: 'Eid al-Fitr (Day 1)' },
    { date: '2024-04-11', name: 'Eid al-Fitr (Day 2)' },
    { date: '2024-06-17', name: 'Eid al-Adha' },
    { date: '2024-09-16', name: "Maulid Day (Prophet's Birthday)" },
  ],
  2025: [
    { date: '2025-03-31', name: 'Eid al-Fitr (Day 1)' },
    { date: '2025-04-01', name: 'Eid al-Fitr (Day 2)' },
    { date: '2025-06-07', name: 'Eid al-Adha' },
    { date: '2025-09-05', name: "Maulid Day (Prophet's Birthday)" },
  ],
  2026: [
    { date: '2026-03-20', name: 'Eid al-Fitr (Day 1)' },
    { date: '2026-03-21', name: 'Eid al-Fitr (Day 2)' },
    { date: '2026-05-27', name: 'Eid al-Adha' },
    { date: '2026-08-25', name: "Maulid Day (Prophet's Birthday)" },
  ],
  2027: [
    { date: '2027-03-10', name: 'Eid al-Fitr (Day 1)' },
    { date: '2027-03-11', name: 'Eid al-Fitr (Day 2)' },
    { date: '2027-05-17', name: 'Eid al-Adha' },
    { date: '2027-08-15', name: "Maulid Day (Prophet's Birthday)" },
  ],
  2028: [
    { date: '2028-02-28', name: 'Eid al-Fitr (Day 1)' },
    { date: '2028-02-29', name: 'Eid al-Fitr (Day 2)' },
    { date: '2028-05-05', name: 'Eid al-Adha' },
    { date: '2028-08-03', name: "Maulid Day (Prophet's Birthday)" },
  ],
}

/**
 * Returns all Tanzanian public holidays for a given year.
 */
export function getTanzaniaHolidays(year: number): HolidayItem[] {
  const holidays: HolidayItem[] = []

  const pad = (n: number) => String(n).padStart(2, '0')
  const toISO = (m: number, d: number) => `${year}-${pad(m)}-${pad(d)}`
  const checkWeekday = (dateStr: string): boolean => {
    const day = new Date(dateStr + 'T12:00:00Z').getUTCDay()
    return day >= 1 && day <= 5
  }

  // 1. Fixed National Holidays
  const fixedHolidays: Array<{ month: number; day: number; name: string }> = [
    { month: 1, day: 1, name: "New Year's Day" },
    { month: 1, day: 12, name: 'Zanzibar Revolution Day' },
    { month: 4, day: 7, name: 'Sheikh Abeid Amani Karume Day' },
    { month: 4, day: 26, name: 'Union Day' },
    { month: 5, day: 1, name: "Workers' Day (May Day)" },
    { month: 7, day: 7, name: 'Saba Saba (Industry Day)' },
    { month: 8, day: 8, name: "Nane Nane (Farmers' Day)" },
    { month: 10, day: 14, name: 'Nyerere Day' },
    { month: 12, day: 9, name: 'Republic and Independence Day' },
    { month: 12, day: 25, name: 'Christmas Day' },
    { month: 12, day: 26, name: 'Boxing Day' },
  ]

  for (const fh of fixedHolidays) {
    const dStr = toISO(fh.month, fh.day)
    holidays.push({
      date: dStr,
      name: fh.name,
      isWeekday: checkWeekday(dStr),
    })
  }

  // 2. Movable Christian Holidays (Easter-based)
  const easter = getEasterSunday(year)
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day, 12, 0, 0))

  // Good Friday (2 days before Easter)
  const goodFriday = new Date(easterDate.getTime() - 2 * 24 * 60 * 60 * 1000)
  const gfStr = `${goodFriday.getUTCFullYear()}-${pad(goodFriday.getUTCMonth() + 1)}-${pad(goodFriday.getUTCDate())}`
  holidays.push({
    date: gfStr,
    name: 'Good Friday',
    isWeekday: true,
  })

  // Easter Monday (1 day after Easter)
  const easterMonday = new Date(easterDate.getTime() + 1 * 24 * 60 * 60 * 1000)
  const emStr = `${easterMonday.getUTCFullYear()}-${pad(easterMonday.getUTCMonth() + 1)}-${pad(easterMonday.getUTCDate())}`
  holidays.push({
    date: emStr,
    name: 'Easter Monday',
    isWeekday: true,
  })

  // 3. Movable Islamic Holidays
  const islamicHolidays = ISLAMIC_HOLIDAYS_MAP[year] || []
  for (const ih of islamicHolidays) {
    holidays.push({
      date: ih.date,
      name: ih.name,
      isWeekday: checkWeekday(ih.date),
    })
  }

  // Sort chronologically
  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Computes expected school days between two dates.
 * Only weekdays (Mon-Fri) that do NOT fall on a Tanzanian public holiday are counted.
 */
export function calculateExpectedSchoolDays(
  startDateStr: string,
  endDateStr: string
): ExpectedSchoolDaysResult {
  const start = new Date(startDateStr + 'T00:00:00Z')
  const end = new Date(endDateStr + 'T00:00:00Z')

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return {
      totalCalendarDays: 0,
      totalWeekdays: 0,
      expectedSchoolDays: 0,
      expectedDates: [],
      weekdayHolidays: [],
      allHolidaysInPeriod: [],
    }
  }

  // Determine all years spanned by this period
  const startYear = start.getUTCFullYear()
  const endYear = end.getUTCFullYear()
  const holidayMap = new Map<string, HolidayItem>()

  for (let yr = startYear; yr <= endYear; yr++) {
    for (const h of getTanzaniaHolidays(yr)) {
      holidayMap.set(h.date, h)
    }
  }

  let totalCalendarDays = 0
  let totalWeekdays = 0
  const expectedDates: string[] = []
  const weekdayHolidays: HolidayItem[] = []
  const allHolidaysInPeriod: HolidayItem[] = []

  const pad = (n: number) => String(n).padStart(2, '0')
  const current = new Date(start)

  while (current <= end) {
    totalCalendarDays++
    const curISO = `${current.getUTCFullYear()}-${pad(current.getUTCMonth() + 1)}-${pad(current.getUTCDate())}`
    const dayOfWeek = current.getUTCDay() // 0 = Sun, 1 = Mon ... 5 = Fri, 6 = Sat
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

    const holiday = holidayMap.get(curISO)
    if (holiday) {
      allHolidaysInPeriod.push(holiday)
    }

    if (isWeekday) {
      totalWeekdays++
      if (holiday) {
        weekdayHolidays.push(holiday)
      } else {
        expectedDates.push(curISO)
      }
    }

    // Step to next day
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return {
    totalCalendarDays,
    totalWeekdays,
    expectedSchoolDays: expectedDates.length,
    expectedDates,
    weekdayHolidays,
    allHolidaysInPeriod,
  }
}
