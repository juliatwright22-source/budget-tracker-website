export function effectiveTarget(goal, avgMonthlyExpenses) {
  if (goal.target_basis === 'n_months_expenses') {
    return Number(goal.target_months_expenses ?? 0) * Number(avgMonthlyExpenses ?? 0)
  }
  return Number(goal.target_amount ?? 0)
}

// accountsById: { [accountId]: account } — pass useAccounts().accounts keyed by id.
export function goalProgress(goal, accountsById) {
  if (goal.linked_account_id) {
    return Number(accountsById[goal.linked_account_id]?.current_balance ?? 0)
  }
  return Number(goal.current_amount ?? 0)
}
