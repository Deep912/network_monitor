import { useQuery } from '@tanstack/react-query'
import { getStats, getLatencyTrends, getStatusDist, getRecentIncidents, getTopProblematic } from '@/api/client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { StatCard, StatusBadge, SeverityBadge, Skeleton, HealthBar } from '@/components/ui'
import { Link } from 'react-router-dom'
import { Link2, Building2, MapPin, Server, AlertTriangle, Activity, ChevronRight } from 'lucide-react'
import { formatLatency, formatRelative } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  healthy: '#10b981', warning: '#f59e0b', down: '#ef4444', unknown: '#52527a'
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: '#17171f', border: '1px solid #27273a', borderRadius: '8px', fontSize: 12 },
  labelStyle: { color: '#9494c0' },
}

export default function Dashboard() {
  const { data: statsData } = useQuery({ queryKey: ['stats'], queryFn: getStats, refetchInterval: 30_000 })
  const { data: trendsData } = useQuery({ queryKey: ['latency-trends'], queryFn: () => getLatencyTrends(24), refetchInterval: 60_000 })
  const { data: distData } = useQuery({ queryKey: ['status-dist'], queryFn: getStatusDist, refetchInterval: 30_000 })
  const { data: incidentsData } = useQuery({ queryKey: ['recent-incidents'], queryFn: getRecentIncidents, refetchInterval: 30_000 })
  const { data: topData } = useQuery({ queryKey: ['top-problematic'], queryFn: getTopProblematic, refetchInterval: 30_000 })

  const stats = statsData?.data
  const trends = trendsData?.data ?? []
  const dist = distData?.data ?? []
  const incidents = incidentsData?.data ?? []
  const topLinks = topData?.data ?? []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-50">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Network operations overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Live monitoring
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {!stats ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard label="Total Links" value={stats.total_links} icon={<Link2 size={20} />} />
            <StatCard label="Healthy" value={stats.healthy_links}
              color="text-emerald-400"
              sub={stats.total_links ? `${Math.round(stats.healthy_links / stats.total_links * 100)}% uptime` : undefined}
              icon={<Activity size={20} />} />
            <StatCard label="Warning" value={stats.warning_links} color="text-amber-400" icon={<AlertTriangle size={20} />} />
            <StatCard label="Down" value={stats.down_links} color="text-red-400"
              sub={stats.down_links > 0 ? 'Needs attention' : 'All clear'}
              icon={<AlertTriangle size={20} />} />
            <StatCard label="Providers" value={stats.total_providers} icon={<Building2 size={20} />} />
            <StatCard label="Sites" value={stats.total_sites} icon={<MapPin size={20} />} />
            <StatCard label="Assets" value={stats.total_assets} icon={<Server size={20} />} />
            <StatCard label="Active Incidents" value={stats.active_incidents}
              color={stats.active_incidents > 0 ? 'text-red-400' : 'text-gray-50'}
              icon={<AlertTriangle size={20} />} />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Latency Trend */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Latency Trend (24h)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#52527a' }}
                tickFormatter={(v) => new Date(v).getHours() + ':00'} />
              <YAxis tick={{ fontSize: 10, fill: '#52527a' }} unit="ms" width={40} />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: any) => [`${Number(v).toFixed(1)}ms`, 'Avg Latency']} />
              <Area type="monotone" dataKey="latency" stroke="#3b82f6" fill="url(#latGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={dist} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                dataKey="count" nameKey="status" paddingAngle={3}>
                {dist.map((entry: any) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#52527a'} />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: any, n: any) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {dist.map((d: any) => (
              <div key={d.status} className="flex items-center gap-1 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[d.status] }} />
                {d.status} ({d.count})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Problematic */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-300">Problematic Links</h2>
            <Link to="/links?status=down" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          {topLinks.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">All links healthy ✓</p>
          ) : (
            <div className="space-y-3">
              {topLinks.map((l: any) => (
                <Link key={l.id} to={`/links/${l.id}`} className="flex items-center gap-3 hover:bg-gray-800/40 -mx-2 px-2 py-2 rounded-lg transition-colors">
                  <StatusBadge status={l.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate">{l.name}</div>
                    <HealthBar score={l.health_score} />
                  </div>
                  <div className="text-xs text-gray-500 text-right whitespace-nowrap">
                    {l.latency ? formatLatency(l.latency) : '—'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Incidents */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-300">Recent Incidents</h2>
            <Link to="/incidents" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          {incidents.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No incidents</p>
          ) : (
            <div className="space-y-2">
              {incidents.map((i: any) => (
                <div key={i.id} className="flex items-start gap-3 py-2 border-b border-gray-800/50 last:border-0">
                  <SeverityBadge severity={i.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate">{i.title}</div>
                    <div className="text-xs text-gray-500">{i.link_name} · {formatRelative(i.start_time)}</div>
                  </div>
                  <StatusBadge status={i.status === 'open' ? 'down' : 'healthy'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
