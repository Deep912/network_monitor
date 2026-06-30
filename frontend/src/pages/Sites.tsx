import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSites, createSite, updateSite, deleteSite } from '@/api/client'
import { PageHeader, Table, SearchInput, Modal, Field } from '@/components/ui'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import type { Site } from '@/types'

const EMPTY = { name: '', address: '', region: '', latitude: '', longitude: '', description: '' }

export default function Sites() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Site | null>(null)
  const [form, setForm] = useState<any>(EMPTY)

  const { data, isLoading } = useQuery({ queryKey: ['sites', search], queryFn: () => getSites({ search }) })

  const createMut = useMutation({ mutationFn: createSite, onSuccess: () => { qc.invalidateQueries({ queryKey: ['sites'] }); close_(); toast.success('Site created') } })
  const updateMut = useMutation({ mutationFn: ({ id, data }: any) => updateSite(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['sites'] }); close_(); toast.success('Site updated') } })
  const deleteMut = useMutation({ mutationFn: deleteSite, onSuccess: () => { qc.invalidateQueries({ queryKey: ['sites'] }); toast.success('Deleted') } })

  const close_ = () => { setShowModal(false); setEditing(null); setForm(EMPTY) }
  const openCreate = () => { setForm(EMPTY); setEditing(null); setShowModal(true) }
  const openEdit = (s: Site) => { setForm({ ...s }); setEditing(s); setShowModal(true) }
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const sites: Site[] = data?.data?.items ?? []

  const columns = [
    { key: 'name', label: 'Site', render: (r: Site) => <span className="font-medium text-gray-100">{r.name}</span> },
    { key: 'region', label: 'Region', render: (r: Site) => <span className="badge bg-gray-700/50 text-gray-300">{r.region ?? '—'}</span> },
    { key: 'address', label: 'Address', render: (r: Site) => <span className="text-sm text-gray-400 truncate max-w-xs block">{r.address ?? '—'}</span> },
    { key: 'link_count', label: 'Links', render: (r: Site) => <span className="text-gray-400">{r.link_count ?? 0}</span> },
    { key: 'asset_count', label: 'Assets', render: (r: Site) => <span className="text-gray-400">{r.asset_count ?? 0}</span> },
    {
      key: 'coords', label: 'Coordinates',
      render: (r: Site) => r.latitude ? (
        <span className="font-mono text-xs text-gray-500">{r.latitude.toFixed(4)}, {r.longitude?.toFixed(4)}</span>
      ) : <span className="text-gray-600">—</span>,
    },
    {
      key: 'actions', label: '',
      render: (r: Site) => (
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100">
          <button className="btn-ghost px-2 py-1 text-xs" onClick={e => { e.stopPropagation(); openEdit(r) }}><Edit2 size={12} /></button>
          <button className="btn-danger px-2 py-1 text-xs" onClick={e => { e.stopPropagation(); if (confirm('Delete?')) deleteMut.mutate(r.id) }}><Trash2 size={12} /></button>
        </div>
      ),
    },
  ]

  const buildPayload = () => ({
  name: form.name,
  address: form.address || null,
  region: form.region || null,
  latitude: form.latitude === '' ? null : Number(form.latitude),
  longitude: form.longitude === '' ? null : Number(form.longitude),
  description: form.description || null,
})

  return (
    <div className="p-6">
      <PageHeader title="Sites" subtitle={`${data?.data?.total ?? 0} locations`}
        action={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Site</button>} />
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search sites…" /></div>
      <div className="card [&_tr]:group">
        {isLoading ? <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
          : <Table columns={columns} data={sites} emptyMessage="No sites yet." />}
      </div>

      <Modal open={showModal} onClose={close_} title={editing ? 'Edit Site' : 'Add Site'}
        footer={<>
          <button className="btn-ghost" onClick={close_}>Cancel</button>
          <button className="btn-primary" disabled={!form.name}
            onClick={() =>
  editing
    ? updateMut.mutate({ id: editing.id, data: buildPayload() })
    : createMut.mutate(buildPayload())
}>
            {editing ? 'Save' : 'Create'}
          </button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Site Name" required>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="HQ New York" />
            </Field>
            <Field label="Region">
              <input className="input" value={form.region} onChange={e => set('region', e.target.value)} placeholder="US-East" />
            </Field>
          </div>
          <Field label="Address">
            <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="100 Main St, New York, NY" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude">
              <input type="number" className="input" value={form.latitude} onChange={e => set('latitude', e.target.value)} step="0.0001" />
            </Field>
            <Field label="Longitude">
              <input type="number" className="input" value={form.longitude} onChange={e => set('longitude', e.target.value)} step="0.0001" />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
