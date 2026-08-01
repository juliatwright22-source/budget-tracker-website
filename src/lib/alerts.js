export function alertTier(spent, limit, goal) {
  if (!goal.alert_enabled || !limit || limit <= 0) return null
  const pct = (spent / limit) * 100
  if (pct >= goal.threshold_critical) return 'critical'
  if (pct >= goal.threshold_exceeded) return 'exceeded'
  if (pct >= goal.threshold_warning) return 'warning'
  return null
}

export function alertKey(categoryId, monthKey, tier) {
  return `budget:${categoryId}:${monthKey}:${tier}`
}

export const TIER_LABELS = {
  warning: 'Approaching budget',
  exceeded: 'Over budget',
  critical: 'Well over budget',
}
