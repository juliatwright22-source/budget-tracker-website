// Average-cost method: every buy blends into one running cost basis per holding;
// every sell removes a proportional slice of that basis and realizes the difference.

export function applyBuy(holding, trade) {
  const shares = Number(holding?.shares ?? 0) + Number(trade.shares)
  const costBasisTotal = Number(holding?.cost_basis_total ?? 0) + (Number(trade.shares) * Number(trade.price_per_share) + Number(trade.fees ?? 0))
  return { shares, cost_basis_total: costBasisTotal }
}

export function applySell(holding, trade) {
  const priorShares = Number(holding?.shares ?? 0)
  const priorCostBasis = Number(holding?.cost_basis_total ?? 0)
  const avgCostPerShare = priorShares > 0 ? priorCostBasis / priorShares : 0
  const costBasisRemoved = avgCostPerShare * Number(trade.shares)
  const proceeds = Number(trade.shares) * Number(trade.price_per_share) - Number(trade.fees ?? 0)
  const realizedGain = proceeds - costBasisRemoved

  return {
    shares: priorShares - Number(trade.shares),
    cost_basis_total: priorCostBasis - costBasisRemoved,
    realizedGain,
    costBasisAtSale: costBasisRemoved,
  }
}

export function unrealizedGain(holding, currentPrice) {
  const shares = Number(holding.shares)
  const costBasisTotal = Number(holding.cost_basis_total)
  const marketValue = currentPrice != null ? shares * currentPrice : null
  if (marketValue == null) return { marketValue: null, dollar: null, percent: null }
  const dollar = marketValue - costBasisTotal
  const percent = costBasisTotal > 0 ? (dollar / costBasisTotal) * 100 : 0
  return { marketValue, dollar, percent }
}
