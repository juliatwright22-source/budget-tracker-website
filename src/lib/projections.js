export function defaultProjectionRates(account) {
  if (account.account_type === 'crypto') return { conservative: null, expected: null, optimistic: null }
  if (account.account_type === 'checking') return { conservative: 0, expected: 0, optimistic: 0 }
  if (account.account_class === 'cash') return { conservative: 3, expected: 4, optimistic: 5 }
  if (account.account_class === 'investment') return { conservative: 4, expected: 7, optimistic: 10 }
  return { conservative: null, expected: null, optimistic: null }
}

// Monthly compounding; returns one data point per year for charting, plus the final value.
// An optional one-time contribution (e.g. a bonus) lands at oneTimeMonth and keeps compounding after.
export function projectGrowth({ startingValue, monthlyContribution = 0, annualRatePercent, years, oneTimeContribution = 0, oneTimeMonth = null }) {
  if (annualRatePercent == null) return { finalValue: null, series: [] }
  const monthlyRate = annualRatePercent / 100 / 12
  const totalMonths = Math.round(years * 12)
  let value = Number(startingValue) || 0
  const series = [{ year: 0, value }]

  for (let month = 1; month <= totalMonths; month++) {
    value = value * (1 + monthlyRate) + Number(monthlyContribution)
    if (oneTimeMonth != null && month === Number(oneTimeMonth)) {
      value += Number(oneTimeContribution)
    }
    if (month % 12 === 0) {
      series.push({ year: month / 12, value })
    }
  }

  return { finalValue: value, series }
}
