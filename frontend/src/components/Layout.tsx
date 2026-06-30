import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Link2, Building2, MapPin, Server,
  GitBranch, AlertTriangle, Settings, Radio, LogOut
} from 'lucide-react'
import { getStats, logout } from '@/api/client'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/links', icon: Link2, label: 'Links' },
  { to: '/providers', icon: Building2, label: 'Providers' },
  { to: '/sites', icon: MapPin, label: 'Sites' },
  { to: '/assets', icon: Server, label: 'Assets' },
  { to: '/dependencies', icon: GitBranch, label: 'Dependencies' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function Sidebar() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['stats'], queryFn: () => getStats(), refetchInterval: 30_000 })
  const stats = data?.data

  const handleLogout = async () => {
    await logout()
    qc.clear()
    window.location.href = '/login'
  }

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-gray-925 border-r border-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
          <Radio size={16} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-50">NetOps</div>
          <div className="text-xs text-gray-500">Platform</div>
        </div>
      </div>

      {/* Status pill */}
      {stats && stats.down_links > 0 && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs text-red-400 font-medium">{stats.down_links} link{stats.down_links > 1 ? 's' : ''} down</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-blue-600/15 text-blue-400 font-medium'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-blue-400' : 'text-gray-500'} />
                {label}
                {label === 'Incidents' && stats?.active_incidents ? (
                  <span className="ml-auto text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                    {stats.active_incidents}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
