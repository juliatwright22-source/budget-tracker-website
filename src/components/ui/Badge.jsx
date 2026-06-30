export default function Badge({ type }) {
  const styles = {
    income:  'bg-blue/10 text-blue',
    expense: 'bg-orange/10 text-orange',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${styles[type] ?? ''}`}>
      {type}
    </span>
  )
}
