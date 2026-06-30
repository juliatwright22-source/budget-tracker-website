export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white rounded-xl border border-navy/15 p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
