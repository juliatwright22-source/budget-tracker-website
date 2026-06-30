export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount ?? 0)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getMonthName(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return d.toLocaleString('en-US', { month: 'long' })
}

export function isFirstDayOfMonth() {
  return new Date().getDate() === 1
}

export function lastMonthKey() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${d.getMonth() + 1}`
}

export function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

export function lastMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
  return { start, end }
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const now = new Date()
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  return diff
}

export function parseVoiceInput(text) {
  const lower = text.toLowerCase()
  const result = { type: null, amount: null, categoryHint: null, note: text }

  // Detect type
  if (/\b(spent|paid|bought|purchased|cost|expense)\b/.test(lower)) result.type = 'expense'
  else if (/\b(earned|received|income|got paid|salary|made)\b/.test(lower)) result.type = 'income'

  // Detect amount
  const amountMatch = lower.match(/(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|\$)?/)
  if (amountMatch) result.amount = parseFloat(amountMatch[1])

  // Detect category hints
  const categoryMap = {
    'groceries': 'Groceries',
    'grocery': 'Groceries',
    'food': 'Groceries',
    'rent': 'Rent',
    'transport': 'Transport',
    'uber': 'Transport',
    'lyft': 'Transport',
    'bus': 'Transport',
    'subway': 'Transport',
    'subscription': 'Subscriptions',
    'netflix': 'Subscriptions',
    'spotify': 'Subscriptions',
    'going out': 'Going Out',
    'bar': 'Going Out',
    'restaurant': 'Going Out',
    'dinner': 'Going Out',
    'lunch': 'Going Out',
    'savings': 'Savings',
  }
  for (const [keyword, cat] of Object.entries(categoryMap)) {
    if (lower.includes(keyword)) { result.categoryHint = cat; break }
  }

  return result
}
