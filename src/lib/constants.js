export const DEFAULT_CATEGORIES = [
  { name: 'Rent/Mortgage',       emoji: '🏠', color: '#004E72' },
  { name: 'Water',               emoji: '🚰', color: '#004E72' },
  { name: 'Utilities',           emoji: '💡', color: '#004E72' },
  { name: 'Auto Insurance',      emoji: '🚗', color: '#004E72' },
  { name: "Renter's/Home Insurance", emoji: '🛡️', color: '#004E72' },
  { name: 'Health/Dental/Vision', emoji: '🩺', color: '#004E72' },
  { name: 'Gas',                 emoji: '⛽', color: '#092634' },
  { name: 'Groceries',           emoji: '🛒', color: '#092634' },
  { name: 'Dining Out',          emoji: '🍽️', color: '#FF6E42' },
  { name: 'Entertainment',       emoji: '🎉', color: '#FF6E42' },
]

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'CAD', symbol: '$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: '$', label: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
]

export const LOCALES = [
  { code: 'en-US', label: 'English (United States)' },
  { code: 'en-GB', label: 'English (United Kingdom)' },
  { code: 'de-DE', label: 'German (Germany)' },
  { code: 'fr-FR', label: 'French (France)' },
  { code: 'ja-JP', label: 'Japanese (Japan)' },
]

export const ACCOUNT_CLASSES = [
  { value: 'cash',       label: 'Cash',       emoji: '💵' },
  { value: 'investment', label: 'Investment', emoji: '📈' },
  { value: 'debt',       label: 'Debt',       emoji: '💳' },
]

export const ACCOUNT_TYPES = [
  { value: 'checking',        label: 'Checking',              class: 'cash' },
  { value: 'savings',         label: 'Savings',                class: 'cash' },
  { value: 'money_market',    label: 'Money Market',           class: 'cash' },
  { value: 'hysa',            label: 'High-Yield Savings',     class: 'cash' },
  { value: 'brokerage',       label: 'Brokerage',              class: 'investment' },
  { value: 'ira_traditional', label: 'Traditional IRA',        class: 'investment' },
  { value: 'ira_roth',        label: 'Roth IRA',                class: 'investment' },
  { value: '401k',            label: '401(k)',                  class: 'investment' },
  { value: '403b',            label: '403(b)',                  class: 'investment' },
  { value: 'hsa_invested',    label: 'HSA (invested)',          class: 'investment' },
  { value: 'hsa_cash',        label: 'HSA (cash)',              class: 'investment' },
  { value: '529',             label: '529 Plan',                class: 'investment' },
  { value: 'crypto',          label: 'Crypto Wallet',           class: 'investment' },
  { value: 'credit_card',     label: 'Credit Card',             class: 'debt' },
  { value: 'loan',            label: 'Loan',                    class: 'debt' },
  { value: 'student_loan',    label: 'Student Loan',            class: 'debt' },
  { value: 'custom',          label: 'Custom…',                 class: null },
]

export const ONBOARDING_PERSONAS = [
  {
    key: 'student', label: 'Student', emoji: '🎓',
    description: 'Tight budget, just starting out',
    suggestedCategories: ['Groceries', 'Dining Out', 'Entertainment', 'Utilities', 'Gas'],
    suggestedGoalTemplate: 'emergency_fund',
  },
  {
    key: 'young_professional', label: 'Young Professional', emoji: '💼',
    description: 'Building savings, maybe paying down debt',
    suggestedCategories: ['Rent/Mortgage', 'Groceries', 'Dining Out', 'Entertainment', 'Utilities', 'Gas', 'Auto Insurance'],
    suggestedGoalTemplate: 'emergency_fund',
  },
  {
    key: 'family', label: 'Family with Kids', emoji: '👨‍👩‍👧',
    description: 'Managing a household budget',
    suggestedCategories: ['Rent/Mortgage', 'Groceries', 'Utilities', 'Health/Dental/Vision', 'Auto Insurance', "Renter's/Home Insurance", 'Gas'],
    suggestedGoalTemplate: 'home_down_payment',
  },
  {
    key: 'near_retirement', label: 'Near Retirement', emoji: '🌅',
    description: 'Focused on preserving and growing savings',
    suggestedCategories: ['Rent/Mortgage', 'Health/Dental/Vision', 'Groceries', 'Utilities', "Renter's/Home Insurance", 'Gas'],
    suggestedGoalTemplate: 'emergency_fund',
  },
  {
    key: 'self_employed', label: 'Self-Employed / Variable Income', emoji: '📊',
    description: 'Income that changes month to month',
    suggestedCategories: ['Rent/Mortgage', 'Groceries', 'Utilities', 'Auto Insurance', 'Health/Dental/Vision', 'Gas', 'Dining Out'],
    suggestedGoalTemplate: 'emergency_fund',
  },
  {
    key: 'custom', label: "I'll set it up myself", emoji: '🧭',
    description: 'Skip suggestions, start from scratch',
    suggestedCategories: [],
    suggestedGoalTemplate: null,
  },
]

export const GOAL_TEMPLATES = [
  { key: 'emergency_fund',    label: 'Emergency Fund',     emoji: '🛟', target_basis: 'n_months_expenses', target_months_expenses: 3 },
  { key: 'vacation',          label: 'Vacation Fund',      emoji: '✈️', target_basis: 'fixed_amount' },
  { key: 'car_down_payment',  label: 'Car Down Payment',   emoji: '🚗', target_basis: 'fixed_amount' },
  { key: 'home_down_payment', label: 'Home Down Payment',  emoji: '🏡', target_basis: 'fixed_amount' },
  { key: 'wedding',           label: 'Wedding',            emoji: '💍', target_basis: 'fixed_amount' },
  { key: 'debt_payoff',       label: 'Debt Payoff',        emoji: '📉', target_basis: 'fixed_amount' },
  { key: 'custom',            label: 'Custom',             emoji: '🎯', target_basis: 'fixed_amount' },
]
