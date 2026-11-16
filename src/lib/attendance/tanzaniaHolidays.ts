/**
 * Tanzanian Public Holidays & Expected School Days Utility
 * Excludes weekends (Saturday/Sunday) and official Tanzanian public holidays.
 */

export interface HolidayItem {
  date: string // YYYY-MM-DD
  name: string
  isWeekday: boolean
}

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
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

const ISLAMIC_HOLIDAYS_MAP: Record<number, Array<{ date: string; name: string }>> = {
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
    { date: '2028-02-27', name: 'Eid al-Fitr (Day 1)' },
    { date: '2028-02-28', name: 'Eid al-Fitr (Day 2)' },
    { date: '2028-05-05', name: 'Eid al-Adha' },
    { date: '2028-08-03', name: "Maulid Day (Prophet's Birthday)" },
  ],
}

export function getTanzanianHolidaysForYear(year: number): HolidayItem[] {
  const holidays: HolidayItem[] = []
  const fixed: Array<{ month: number; day: number; name: string }> = [
    { month: 1, day: 1, name: "New Year's Day" },
    { month: 1, day: 12, name: 'Zanzibar Revolution Day' },
    { month: 4, day: 7, name: 'Karume Day' },
    { month: 4, day: 26, name: 'Union Day' },
    { month: 5, day: 1, name: "Worker's Day (Labour Day)" },
    { month: 7, day: 7, name: 'Saba Saba (Industry Day)' },
    { month: 8, day: 8, name: "Nane Nane (Farmers' Day)" },
    { month: 10, day: 14, name: 'Mwalimu Nyerere Day' },
    { month: 12, day: 9, name: 'Independence and Republic Day' },
    { month: 12, day: 25, name: 'Christmas Day' },
    { month: 12, day: 26, name: 'Boxing Day' },
  ]

  for (const f of fixed) {
    const iso = `${year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`
    const dayOfWeek = new Date(iso + 'T00:00:00').getDay()
    holidays.push({
      date: iso,
      name: f.name,
      isWeekday: dayOfWeek >= 1 && dayOfWeek <= 5,
    })
  }

  const easter = getEasterSunday(year)
  const easterDate = new Date(year, easter.month - 1, easter.day)

  const goodFriday = new Date(easterDate)
  goodFriday.setDate(easterDate.getDate() - 2)
  holidays.push({
    date: `${year}-${String(goodFriday.getMonth() + 1).padStart(2, '0')}-${String(goodFriday.getDate()).padStart(2, '0')}`,
    name: 'Good Friday',
    isWeekday: true,
  })

  const easterMonday = new Date(easterDate)
  easterMonday.setDate(easterDate.getDate() + 1)
  holidays.push({
    date: `${year}-${String(easterMonday.getMonth() + 1).padStart(2, '0')}-${String(easterMonday.getDate()).padStart(2, '0')}`,
    name: 'Easter Monday',
    isWeekday: true,
  })

  for (const h of ISLAMIC_HOLIDAYS_MAP[year] || []) {
    const dayOfWeek = new Date(h.date + 'T00:00:00').getDay()
    holidays.push({
      date: h.date,
      name: h.name,
      isWeekday: dayOfWeek >= 1 && dayOfWeek <= 5,
    })
  }

  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

export function getHolidayForDate(isoDate: string): HolidayItem | null {
  const year = Number(isoDate.slice(0, 4))
  if (!year || Number.isNaN(year)) return null
  return getTanzanianHolidaysForYear(year).find(h => h.date === isoDate) || null
}

export function isSchoolDay(isoDate: string): boolean {
  const d = new Date(isoDate + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return false
  const day = d.getDay()
  if (day === 0 || day === 6) return false
  return !getHolidayForDate(isoDate)
}

export function getExpectedSchoolDates(startIso: string, endIso: string): string[] {
  const start = new Date(startIso + 'T00:00:00')
  const end = new Date(endIso + 'T00:00:00')
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return []
  }

  const years = new Set<number>()
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    years.add(y)
  }
  const holidaySet = new Set<string>()
  for (const y of years) {
    for (const h of getTanzanianHolidaysForYear(y)) {
      holidaySet.add(h.date)
    }
  }

  const dates: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    if (day >= 1 && day <= 5 && !holidaySet.has(iso)) {
      dates.push(iso)
    }
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}
