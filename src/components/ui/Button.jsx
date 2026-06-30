export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center font-sans font-medium rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }
  const variants = {
    primary: 'bg-blue text-white hover:opacity-90',
    cta:     'bg-orange text-white hover:opacity-90',
    ghost:   'bg-transparent text-navy border border-navy/20 hover:bg-navy/5',
    danger:  'bg-orange/10 text-orange border border-orange/30 hover:bg-orange/20',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
