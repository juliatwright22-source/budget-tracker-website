// Avalanche: highest interest rate paid off first. Snowball: smallest balance first.
// Both apply minimum payments to every debt each month, then roll all remaining
// "extra" budget into the first not-yet-paid-off debt in the order.
export function payoffOrder(debts, strategy) {
  const sorted = [...debts]
  if (strategy === 'snowball') {
    sorted.sort((a, b) => Number(a.balance) - Number(b.balance))
  } else {
    sorted.sort((a, b) => Number(b.interest_rate) - Number(a.interest_rate))
  }
  return sorted.map(d => d.id)
}

const MAX_MONTHS = 600 // 50-year runaway guard

export function simulatePayoff(debts, strategy, extraMonthlyPayment) {
  const order = payoffOrder(debts, strategy)
  const balances = Object.fromEntries(debts.map(d => [d.id, Number(d.balance)]))
  const minimums = Object.fromEntries(debts.map(d => [d.id, Number(d.minimum_payment)]))
  const monthlyRates = Object.fromEntries(debts.map(d => [d.id, Number(d.interest_rate) / 100 / 12]))
  const payoffMonths = {}
  let totalInterestPaid = 0
  const totalRemaining = () => Object.values(balances).reduce((s, b) => s + b, 0)
  const schedule = [{ month: 0, totalRemaining: totalRemaining() }]

  let month = 0
  while (totalRemaining() > 0.01 && month < MAX_MONTHS) {
    month++

    for (const id of order) {
      if (balances[id] <= 0) continue
      const interest = balances[id] * monthlyRates[id]
      totalInterestPaid += interest
      balances[id] += interest
      const payment = Math.min(minimums[id], balances[id])
      balances[id] -= payment
    }

    let extra = Number(extraMonthlyPayment)
    for (const id of order) {
      if (extra <= 0) break
      if (balances[id] <= 0) continue
      const payment = Math.min(extra, balances[id])
      balances[id] -= payment
      extra -= payment
    }

    for (const id of order) {
      if (balances[id] <= 0.01 && payoffMonths[id] === undefined) payoffMonths[id] = month
    }

    schedule.push({ month, totalRemaining: totalRemaining() })
  }

  return { schedule, payoffMonths, totalMonths: month, totalInterestPaid }
}
