/**
 * Safely formats a date string (ISO or YYYY-MM-DD) into DD/MM/YYYY
 * without timezone or locale hydration mismatches between client and server.
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A'
  
  let dateStr = ''
  if (typeof dateInput === 'string') {
    dateStr = dateInput
  } else if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return 'N/A'
    dateStr = dateInput.toISOString()
  } else {
    return 'N/A'
  }
  
  // Matches YYYY-MM-DD pattern from the beginning of the string
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) {
    // Fallback to basic Date parsing if string format is different
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'N/A'
    const day = date.getUTCDate().toString().padStart(2, '0')
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${day}/${month}/${year}`
  }
  
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}
