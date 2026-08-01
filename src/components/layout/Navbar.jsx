import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { label: 'Dashboard',    path: '/dashboard',    icon: '⊞' },
  { label: 'Transactions', path: '/transactions', icon: '↕' },
  { label: 'Categories',   path: '/categories',   icon: '⊟' },
  { label: 'Budget',       path: '/budget',       icon: '◎' },
  { label: 'Savings',      path: '/savings',      icon: '★' },
  { label: 'Accounts',     path: '/accounts',     icon: '🏦' },
  { label: 'Settings',     path: '/settings',     icon: '⚙' },
]

// Bottom tab bar for mobile
export function BottomNav() {
  const { pathname } = useLocation()
  const mobileItems = navItems.slice(0, 5)
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-navy flex md:hidden border-t border-white/10">
      {mobileItems.map(item => {
        const active = pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-sans transition-colors
              ${active ? 'text-orange' : 'text-white/50 hover:text-white/80'}`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// Sidebar for desktop
export function Sidebar() {
  const { pathname } = useLocation()
  const { profile, signOut } = useAuth()

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 bg-navy min-h-screen sticky top-0">
      <div className="px-6 py-7">
        <span className="font-serif text-2xl text-white tracking-tight">Yachty</span>
        <p className="text-white/40 text-xs mt-1 font-sans">Set sail on your finances.</p>
      </div>

      <nav className="flex-1 px-3">
        {navItems.map(item => {
          const active = pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-sans transition-all
                ${active ? 'bg-blue text-white font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-5 border-t border-white/10">
        <p className="text-white/50 text-xs font-sans mb-2 truncate">{profile?.display_name}</p>
        <button
          onClick={signOut}
          className="text-white/40 hover:text-orange text-xs font-sans transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
