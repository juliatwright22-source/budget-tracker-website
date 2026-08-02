export function effectiveTarget(goal, avgMonthlyExpenses) {
  if (goal.target_basis === 'n_months_expenses') {
    return Number(goal.target_months_expenses ?? 0) * Number(avgMonthlyExpenses ?? 0)
  }
  return Number(goal.target_amount ?? 0)
}

// accountsById: { [accountId]: account } — pass useAccounts().accounts keyed by id.
// A debt-linked goal's balance moves the "wrong" way (down = progress), so progress is
// inverted: how much of the original target has been paid off, not the raw balance.
export function goalProgress(goal, accountsById) {
  if (goal.linked_account_id) {
    const account = accountsById[goal.linked_account_id]
    if (!account) return 0
    if (account.account_class === 'debt') {
      return Math.max(Number(goal.target_amount ?? 0) - Number(account.current_balance), 0)
    }
    return Number(account.current_balance)
  }
  return Number(goal.current_amount ?? 0)
}

export function isDebtLinkedGoal(goal, accountsById) {
  return goal.linked_account_id != null && accountsById[goal.linked_account_id]?.account_class === 'debt'
}
