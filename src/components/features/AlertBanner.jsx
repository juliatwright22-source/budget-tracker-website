import { useBudget } from '../../context/BudgetContext'
import { useFormat } from '../../context/PreferencesContext'
import { alertTier, alertKey, TIER_LABELS } from '../../lib/alerts'
import { currentMonthKey } from '../../lib/utils'

const TIER_STYLES = {
  warning: 'border-navy/20 bg-navy/5 text-navy',
  exceeded: 'border-orange/40 bg-orange/5 text-orange',
  critical: 'border-orange/60 bg-orange/10 text-orange',
}

export default function AlertBanner() {
  const { budgetGoals, categories, monthlyTx, dismissedAlerts, dismissAlert } = useBudget()
  const { formatCurrency } = useFormat()
  const monthKey = currentMonthKey()
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const dismissedKeys = new Set(dismissedAlerts.map(d => d.alert_key))

  const alerts = budgetGoals.map(goal => {
    const spent = monthlyTx
      .filter(t => t.type === 'expense' && t.category_id === goal.category_id)
      .reduce((s, t) => s + Number(t.amount), 0)
    const tier = alertTier(spent, Number(goal.monthly_limit), goal)
    if (!tier) return null
    const key = alertKey(goal.category_id, monthKey, tier)
    if (dismissedKeys.has(key)) return null
    return { key, tier, goal, spent, cat: catMap[goal.category_id] }
  }).filter(Boolean)

  if (alerts.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mb-6">
      {alerts.map(a => (
        <div key={a.key} className={`rounded-xl border p-4 flex items-center justify-between ${TIER_STYLES[a.tier]}`}>
          <p className="text-sm font-sans">
            <span className="font-medium">{TIER_LABELS[a.tier]}:</span>{' '}
            {a.cat?.emoji} {a.cat?.name ?? 'Category'} — {formatCurrency(a.spent)} of {formatCurrency(a.goal.monthly_limit)}
          </p>
          <button onClick={() => dismissAlert(a.key)} className="text-xs font-sans opacity-60 hover:opacity-100 transition-opacity">Dismiss</button>
        </div>
      ))}
    </div>
  )
}
