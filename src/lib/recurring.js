export function addInterval(dateStr, frequency) {
  const d = new Date(dateStr + 'T00:00:00')
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'biweekly': d.setDate(d.getDate() + 14); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'annually': d.setFullYear(d.getFullYear() + 1); break
    default: throw new Error(`Unknown recurring frequency: ${frequency}`)
  }
  return d.toISOString().split('T')[0]
}

// Returns the occurrence dates due between rule.next_occurrence and todayStr (inclusive),
// respecting an optional end_date, plus the next_occurrence the rule should advance to.
export function occurrencesDue(rule, todayStr) {
  const limit = rule.end_date && rule.end_date < todayStr ? rule.end_date : todayStr
  const dates = []
  let cursor = rule.next_occurrence
  let iterations = 0
  while (cursor <= limit && iterations < 500) {
    dates.push(cursor)
    cursor = addInterval(cursor, rule.frequency)
    iterations++
  }
  return { dates, nextOccurrence: cursor }
}
