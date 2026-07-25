// Billing and Term comparison utilities

/**
 * Compares if a specific year and term is current or in the past relative to the active year/term.
 */
export function isCurrentOrPast(year: string, term: string, currentYear: string, currentTerm: string): boolean {
  if (!year || !currentYear) return false
  
  const yrStart = parseInt(year.split('-')[0])
  const currYrStart = parseInt(currentYear.split('-')[0])
  
  if (yrStart < currYrStart) return true
  if (yrStart > currYrStart) return false
  
  // Same academic year, compare term numbers (e.g. Term 1 <= Term 2)
  const getTermNum = (t: string) => {
    const m = (t || '').match(/\d+/)
    return m ? parseInt(m[0]) : 0
  }
  
  return getTermNum(term) <= getTermNum(currentTerm)
}
