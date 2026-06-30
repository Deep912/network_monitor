import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLink, getLinkHistory, checkLinkNow, updateLink, deleteLink, getSites, getProviders } from '@/api/client'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import { StatusBadge, LinkTypeBadge, SeverityBadge, HealthBar, Modal, Field } from '@/components/ui'
import { formatLatency, formatPacketLoss, formatDate, formatRelative } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ArrowLeft, RefreshCw, Trash2, Edit2 } from 'lucide-react'

const CHART_STYLE = {
  contentStyle: { background: '#17171f', border: '1px solid #27273a', borderRadius: '8px', fontSize: 11 },
  labelStyle: { color: '#9494c0' },
}

const PERIODS = ['24h', '7d', '30d'] as const

export default function LinkDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h')
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState<any>(null)

  const { data: linkData, isLoading } = useQuery({
    queryKey: ['link', id],
    queryFn: () => getLink(Number(id)),
    refetchInterval: 30_000,
  })

  const { data: histData } = useQuery({
    queryKey: ['link-history', id, period],
    queryFn: () => getLinkHistory(Number(id), period),
  })

  const { data: sitesData } = useQuery({ queryKey: ['sites-list'], queryFn: () => getSites({ per_page: 100 }) })
  const { data: provsData } = useQuery({ queryKey: ['providers-list'], queryFn: () => getProviders({ per_page: 100 }) })

  const checkMut = useMutation({
    mutationFn: () => checkLinkNow(Number(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['link', id] }); toast.success('Check complete') },
    onError: () => toast.error('Check failed'),
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => updateLink(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['link', id] })
      setShowEdit(false)
      toast.success('Link updated')
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteLink(Number(id)),
    onSuccess: () => { navigate('/links'); toast.success('Link deleted') },
  })

  const link = linkData?.data
  const history = histData?.data ?? []
  const sites = sitesData?.data?.items ?? []
  const providers = provsData?.data?.items ?? []

  const openEdit = () => {
    if (!link) return
    setForm({
      name: link.name, description: link.description ?? '',
      link_type: link.link_type, provider_id: link.provider_id ?? '',
      site_id: link.site_id ?? '', circuit_id: link.circuit_id ?? '',
      bandwidth: link.bandwidth ?? '', primary_ip: link.primary_ip ?? '',
      monitoring_target: link.monitoring_target ?? '', priority: link.priority ?? 1,
      notes: link.notes ?? '',
    })
    setShowEdit(true)
  }

  if (isLoading) return (
    <div className="p-6">
      <div className="h-8 w-32 bg-gray-800 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  if (!link) return <div className="p-6 text-gray-500">Link not found</div>

  return (
    <div className="p-6 space-y-6">
      {/* Back + Header */}
      <div>
        <Link to="/links" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-4 w-fit">
          <ArrowLeft size={14} /> Back to Links
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-50">{link.name}</h1>
                <StatusBadge status={link.status} />
                <LinkTypeBadge type={link.link_type} />
              </div>
              {link.description && <p className="text-sm text-gray-500 mt-0.5">{link.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => checkMut.mutate()} disabled={checkMut.isPending}>
              <RefreshCw size={14} className={checkMut.isPending ? 'animate-spin' : ''} />
              Check Now
            </button>
            <button className="btn-ghost" onClick={openEdit}><Edit2 size={14} /> Edit</button>
            <button className="btn-danger" onClick={() => { if (confirm('Delete this link?')) deleteMut.mutate() }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Health Score</p>
          <p className="text-2xl font-bold text-gray-50 mt-1">{link.health_score?.toFixed(0) ?? '—'}</p>
          <div className="mt-2"><HealthBar score={link.health_score} /></div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Latency</p>
          <p className="text-2xl font-bold font-mono mt-1 text-blue-400">{formatLatency(link.latency)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Packet Loss</p>
          <p className="text-2xl font-bold font-mono mt-1 text-amber-400">{formatPacketLoss(link.packet_loss)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Last Checked</p>
          <p className="text-sm font-medium mt-1 text-gray-300">{formatRelative(link.last_checked)}</p>
          <p className="text-xs text-gray-500">{formatDate(link.last_checked)}</p>
        </div>
      </div>

      {/* Info + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-300">Circuit Details</h2>
          {[
            ['Provider', link.provider_name],
            ['Site', link.site_name],
            ['Circuit ID', link.circuit_id],
            ['Bandwidth', link.bandwidth],
            ['Primary IP', link.primary_ip],
            ['Monitoring Target', link.monitoring_target],
            ['Priority', link.priority],
          ].map(([label, value]) => value ? (
            <div key={label as string}>
              <div className="text-xs text-gray-500">{label}</div>
              <div className="text-sm text-gray-200 font-mono mt-0.5">{value}</div>
            </div>
          ) : null)}
        </div>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-4">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${period === p ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}>
                {p}
              </button>
            ))}
          </div>

          {/* Latency chart */}
          <div className="card p-4">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Latency</h3>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis tick={{ fontSize: 10, fill: '#52527a' }} unit="ms" width={40} />
                <Tooltip {...CHART_STYLE} formatter={(v: any) => [`${Number(v).toFixed(1)}ms`, 'Latency']} />
                <Area type="monotone" dataKey="latency" stroke="#3b82f6" fill="url(#lg1)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Packet loss chart */}
          <div className="card p-4">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Packet Loss</h3>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis tick={{ fontSize: 10, fill: '#52527a' }} unit="%" width={35} />
                <Tooltip {...CHART_STYLE} formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Packet Loss']} />
                <Area type="monotone" dataKey="packet_loss" stroke="#f59e0b" fill="url(#lg2)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Incidents */}
      {link.incidents && link.incidents.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Recent Incidents</h2>
          <div className="divide-y divide-gray-800">
            {link.incidents.map((i: any) => (
              <div key={i.id} className="py-3 flex items-center gap-3">
                <SeverityBadge severity={i.severity} />
                <div className="flex-1">
                  <div className="text-sm text-gray-200">{i.title}</div>
                  <div className="text-xs text-gray-500">{formatDate(i.start_time)}</div>
                </div>
                <StatusBadge status={i.status === 'open' ? 'down' : 'healthy'} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {form && (
        <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Link"
          footer={
            <>
              <button className="btn-ghost" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}>
                {updateMut.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Name" required>
              <input className="input" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Monitoring Target">
              <input className="input font-mono" value={form.monitoring_target}
                onChange={e => setForm((f: any) => ({ ...f, monitoring_target: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Provider">
                <select className="input" value={form.provider_id} onChange={e => setForm((f: any) => ({ ...f, provider_id: e.target.value || null }))}>
                  <option value="">None</option>
                  {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Site">
                <select className="input" value={form.site_id} onChange={e => setForm((f: any) => ({ ...f, site_id: e.target.value || null }))}>
                  <option value="">None</option>
                  {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea className="input" rows={3} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
