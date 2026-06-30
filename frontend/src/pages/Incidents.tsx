import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getIncidents, updateIncident, deleteIncident } from '@/api/client'
import { PageHeader, Table, SearchInput, SeverityBadge, StatusBadge, Modal, Field } from '@/components/ui'
import { formatDate, formatRelative } from '@/lib/utils'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Trash2 } from 'lucide-react'
import type { Incident } from '@/types'

export default function Incidents() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [resolveModal, setResolveModal] = useState<Incident | null>(null)
  const [notes, setNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['incidents', statusFilter, severityFilter],
    queryFn: () => getIncidents({ status: statusFilter || undefined, severity: severityFilter || undefined }),
    refetchInterval: 30_000,
  })

  const resolveMut = useMutation({
    mutationFn: ({ id, notes }: any) => updateIncident(id, { status: 'resolved', resolution_notes: notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }); setResolveModal(null); toast.success('Incident resolved') },
  })
  const closeMut = useMutation({
    mutationFn: (id: number) => updateIncident(id, { status: 'closed' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }); toast.success('Incident closed') },
  })
  const deleteMut = useMutation({
    mutationFn: deleteIncident,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }); toast.success('Deleted') },
  })

  const incidents: Incident[] = data?.data?.items ?? []

  const columns = [
    {
      key: 'severity', label: 'Severity',
      render: (r: Incident) => <SeverityBadge severity={r.severity} />,
    },
    {
      key: 'title', label: 'Title',
      render: (r: Incident) => <span className="font-medium text-gray-100">{r.title}</span>,
    },
    { key: 'link_name', label: 'Link', render: (r: Incident) => <span className="text-gray-400">{r.link_name ?? '—'}</span> },
    {
      key: 'status', label: 'Status',
      render: (r: Incident) => (
        <span className={`badge ${r.status === 'open' ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30' : r.status === 'resolved' ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-gray-500/15 text-gray-400 ring-1 ring-gray-500/30'}`}>
          {r.status}
        </span>
      ),
    },
    { key: 'start_time', label: 'Started', render: (r: Incident) => <span className="text-xs text-gray-400">{formatRelative(r.start_time)}</span> },
    { key: 'end_time', label: 'Resolved', render: (r: Incident) => <span className="text-xs text-gray-400">{r.end_time ? formatRelative(r.end_time) : '—'}</span> },
    {
      key: 'duration', label: 'Duration',
      render: (r: Incident) => {
        if (!r.start_time) return '—'
        const end = r.end_time ? new Date(r.end_time) : new Date()
        const ms = end.getTime() - new Date(r.start_time).getTime()
        const m = Math.floor(ms / 60000)
        if (m < 60) return <span className="text-xs text-gray-500">{m}m</span>
        return <span className="text-xs text-gray-500">{Math.floor(m / 60)}h {m % 60}m</span>
      },
    },
    {
      key: 'actions', label: '',
      render: (r: Incident) => (
        <div className="flex gap-1.5">
          {r.status === 'open' && (
            <button className="btn-ghost px-2 py-1 text-xs text-emerald-400 flex items-center gap-1"
              onClick={e => { e.stopPropagation(); setResolveModal(r); setNotes('') }}>
              <CheckCircle size={12} /> Resolve
            </button>
          )}
          {r.status === 'resolved' && (
            <button className="btn-ghost px-2 py-1 text-xs text-gray-400 flex items-center gap-1"
              onClick={e => { e.stopPropagation(); if (confirm('Close this incident?')) closeMut.mutate(r.id) }}>
              <XCircle size={12} /> Close
            </button>
          )}
          <button className="btn-danger px-2 py-1 text-xs"
            onClick={e => { e.stopPropagation(); if (confirm('Delete incident?')) deleteMut.mutate(r.id) }}>
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ]

  const open = incidents.filter(i => i.status === 'open').length
  const total = incidents.length

  return (
    <div className="p-6">
      <PageHeader
        title="Incidents"
        subtitle={`${open} open · ${total} total`}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
        <select className="input w-auto" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="card [&_tr]:group">
        {isLoading ? <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
          : <Table columns={columns} data={incidents} emptyMessage="No incidents found." />}
      </div>

      {/* Resolve Modal */}
      <Modal open={!!resolveModal} onClose={() => setResolveModal(null)} title="Resolve Incident"
        footer={<>
          <button className="btn-ghost" onClick={() => setResolveModal(null)}>Cancel</button>
          <button className="btn-primary bg-emerald-600 hover:bg-emerald-500"
            onClick={() => resolveMut.mutate({ id: resolveModal!.id, notes })}
            disabled={resolveMut.isPending}>
            {resolveMut.isPending ? 'Resolving…' : 'Mark Resolved'}
          </button>
        </>}>
        <div className="space-y-4">
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="text-sm font-medium text-gray-100">{resolveModal?.title}</div>
            <div className="text-xs text-gray-500 mt-1">Started {formatDate(resolveModal?.start_time)}</div>
          </div>
          <Field label="Resolution Notes">
            <textarea className="input" rows={4} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Describe what was done to resolve this incident…" />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
