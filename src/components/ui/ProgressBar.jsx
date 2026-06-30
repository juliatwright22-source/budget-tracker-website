export default function ProgressBar({ value, max, className = '' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className={`h-2.5 rounded-full bg-blue/15 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-orange transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
