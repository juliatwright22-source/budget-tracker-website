export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-navy">{label}</label>}
      <input
        className={`w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white text-navy placeholder-navy/40
          focus:outline-none focus:ring-2 focus:ring-blue/40 focus:border-blue transition font-sans text-sm ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-orange">{error}</p>}
    </div>
  )
}
