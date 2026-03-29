import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

const navItems = [
  {
    to: '/',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/spending',
    label: 'Spending',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <path d="M2 12L6 8L9 11L14 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/budgets',
    label: 'Budgets',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/investments',
    label: 'Investments',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <path d="M2 14V8M6 14V4M10 14V6M14 14V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

const secondaryItems = [
  {
    to: '/accounts',
    label: 'Accounts',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    to: '/goals',
    label: 'Goals',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="8" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

function NavItem({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-nav-active-bg text-nav-active-text font-medium'
            : 'text-gray-500 hover:bg-gray-50'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? 'opacity-100' : 'opacity-60'}>{icon}</span>
          {label}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore
    }
    logout()
    navigate('/login')
  }

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <aside className="w-sidebar bg-white border-r border-gray-100 flex flex-col py-6 px-4 gap-1">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-7 px-3">
        <span className="w-5 h-5 bg-primary rounded-md flex-shrink-0" />
        <span className="text-sm font-medium text-gray-900">My One Peace</span>
      </div>

      {/* Primary nav */}
      {navItems.map((item) => (
        <NavItem key={item.to} {...item} />
      ))}

      {/* Separator */}
      <div className="h-px bg-gray-100 my-3" />

      {/* Secondary nav */}
      {secondaryItems.map((item) => (
        <NavItem key={item.to} {...item} />
      ))}

      {/* User avatar at bottom */}
      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-nav-active-bg flex items-center justify-center text-xs font-medium text-nav-active-text flex-shrink-0">
            {initials}
          </div>
          <div className="text-left min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{user?.full_name ?? 'User'}</div>
            <div className="text-2xs text-gray-400 capitalize">{user?.plan ?? 'free'} plan</div>
          </div>
        </button>
      </div>
    </aside>
  )
}
