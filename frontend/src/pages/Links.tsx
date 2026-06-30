import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getLinks, createLink, deleteLink, getSites, getProviders } from '@/api/client'
import { PageHeader, Table, StatusBadge, LinkTypeBadge, HealthBar, SearchInput, Modal, Field, EmptyState } from '@/components/ui'
import { formatLatency, formatPacketLoss, formatRelative } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import type { Link } from '@/types'

const LINK_TYPES = ['internet', 'mpls', 'p2p', 'vpn', 'sdwan']
const STATUSES = ['healthy', 'warning', 'down', 'unknown']

const EMPTY_FORM = {
  name: '', description: '', link_type: 'internet', provider_id: '', site_id: '',
  circuit_id: '', circuit_number: '', bandwidth: '', primary_ip: '', secondary_ip: '',
  monitoring_target: '', priority: 1, notes: '',
}

export default function Links() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['links', search, statusFilter, typeFilter],
    queryFn: () => getLinks({ search, status: statusFilter || undefined, link_type: typeFilter || undefined }),
    refetchInterval: 30_000,
  })

  const { data: sitesData } = useQuery({ queryKey: ['sites-list'], queryFn: () => getSites({ per_page: 100 }) })
  const { data: provsData } = useQuery({ queryKey: ['providers-list'], queryFn: () => getProviders({ per_page: 100 }) })

  const createMut = useMutation({
    mutationFn: createLink,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['links'] }); setShowModal(false); setForm(EMPTY_FORM); toast.success('Link created') },
    onError: () => toast.error('Failed to create link'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteLink,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['links'] }); toast.success('Link deleted') },
    onError: () => toast.error('Failed to delete link'),
  })

  const links: Link[] = data?.data?.items ?? []

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (row: Link) => <span className="font-medium text-gray-100">{row.name}</span>,
    },
    { key: 'link_type', label: 'Type', render: (row: Link) => <LinkTypeBadge type={row.link_type} /> },
    { key: 'status', label: 'Status', render: (row: Link) => <StatusBadge status={row.status} /> },
    {
      key: 'health_score', label: 'Health',
      render: (row: Link) => <div className="w-24"><HealthBar score={row.health_score} /></div>,
    },
    { key: 'latency', label: 'Latency', render: (row: Link) => <span className="font-mono text-xs">{formatLatency(row.latency)}</span> },
    { key: 'packet_loss', label: 'Pkt Loss', render: (row: Link) => <span className="font-mono text-xs">{formatPacketLoss(row.packet_loss)}</span> },
    { key: 'provider_name', label: 'Provider', render: (row: Link) => <span className="text-gray-400">{row.provider_name ?? '—'}</span> },
    { key: 'site_name', label: 'Site', render: (row: Link) => <span className="text-gray-400">{row.site_name ?? '—'}</span> },
    { key: 'last_checked', label: 'Last Check', render: (row: Link) => <span className="text-gray-500 text-xs">{formatRelative(row.last_checked)}</span> },
    {
      key: 'actions', label: '',
      render: (row: Link) => (
        <button
          className="btn-danger px-2 py-1 text-xs opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); if (confirm('Delete this link?')) deleteMut.mutate(row.id) }}
        >
          <Trash2 size={12} />
        </button>
      ),
    },
  ]

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const sites = sitesData?.data?.items ?? []
  const providers = provsData?.data?.items ?? []

  return (
    <div className="p-6">
      <PageHeader
        title="Links"
        subtitle={`${data?.data?.total ?? 0} circuits monitored`}
        action={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Link
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search links…" />
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {LINK_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : (
          <div className="[&_tr]:group">
            <Table
              columns={columns}
              data={links}
              onRowClick={(row) => navigate(`/links/${row.id}`)}
              emptyMessage="No links found. Add your first link to start monitoring."
            />
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Link"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => createMut.mutate(form)} disabled={!form.name || createMut.isPending}>
              {createMut.isPending ? 'Creating…' : 'Create Link'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" required>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="HQ Primary Internet" />
            </Field>
            <Field label="Type" required>
              <select className="input" value={form.link_type} onChange={e => set('link_type', e.target.value)}>
                {LINK_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Provider">
              <select className="input" value={form.provider_id} onChange={e => set('provider_id', e.target.value || null)}>
                <option value="">None</option>
                {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Site">
              <select className="input" value={form.site_id} onChange={e => set('site_id', e.target.value || null)}>
                <option value="">None</option>
                {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Circuit ID">
              <input className="input" value={form.circuit_id} onChange={e => set('circuit_id', e.target.value)} />
            </Field>
            <Field label="Bandwidth">
              <input className="input" value={form.bandwidth} onChange={e => set('bandwidth', e.target.value)} placeholder="1 Gbps" />
            </Field>
          </div>
          <Field label="Monitoring Target" hint="IP, hostname, or URL to ping/check">
            <input className="input font-mono" value={form.monitoring_target} onChange={e => set('monitoring_target', e.target.value)} placeholder="8.8.8.8 or https://example.com" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Primary IP">
              <input className="input font-mono" value={form.primary_ip} onChange={e => set('primary_ip', e.target.value)} />
            </Field>
            <Field label="Priority">
              <input type="number" className="input" value={form.priority} onChange={e => set('priority', Number(e.target.value))} min={1} max={5} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
