import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAssets, createAsset, updateAsset, deleteAsset, getSites, getLinks, createDependency, deleteDependency } from '@/api/client'
import { PageHeader, Table, SearchInput, Modal, Field, SeverityBadge } from '@/components/ui'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, Link2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Asset } from '@/types'

const ASSET_TYPES = ['server', 'firewall', 'router', 'switch', 'storage', 'application']
const SEVERITIES = ['low', 'medium', 'high', 'critical']
const EMPTY = { name: '', hostname: '', ip_address: '', asset_type: 'server', site_id: '', owner: '', description: '', criticality: 'medium' }

const ASSET_ICON: Record<string, string> = {
  server: '🖥️', firewall: '🔥', router: '📡', switch: '🔀', storage: '💾', application: '⚙️'
}

export default function Assets() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [form, setForm] = useState<any>(EMPTY)
  const [linkModal, setLinkModal] = useState<Asset | null>(null)
  const [selectedLinkId, setSelectedLinkId] = useState('')
  const [assetDeps, setAssetDeps] = useState<any[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['assets', search, typeFilter],
    queryFn: () => getAssets({ search, asset_type: typeFilter || undefined }),
  })
  const { data: sitesData } = useQuery({ queryKey: ['sites-list'], queryFn: () => getSites({ per_page: 100 }) })

  const { data: linksData } = useQuery({ queryKey: ['links-list'], queryFn: () => getLinks({ per_page: 100 }) })
  const links = linksData?.data?.items ?? []

  const addLinkMut = useMutation({
    mutationFn: (data: any) => createDependency(data),
    onSuccess: (res: any) => {
      setAssetDeps((prev: any[]) => [...prev, res.data])
      setSelectedLinkId('')
      toast.success('Linked to network link')
    }
  })
  const removeLinkMut = useMutation({
    mutationFn: (id: number) => deleteDependency(id),
    onSuccess: (_: any, id: number) => {
      setAssetDeps((prev: any[]) => prev.filter((d: any) => d.id !== id))
      toast.success('Link removed')
    }
  })

  const openLinkModal = async (a: Asset) => {
    setLinkModal(a)
    setSelectedLinkId('')
    // fetch existing deps for this asset
    try {
      const res = await getLinks({ per_page: 1 }) // reuse api to get auth, then fetch deps
      const r2 = await fetch('/api/dependencies', { credentials: 'include' })
      const depsAll = await r2.json()
      const myDeps = (depsAll.items ?? depsAll).filter((d: any) => d.source_type === 'asset' && d.source_id === a.id)
      setAssetDeps(myDeps)
    } catch { setAssetDeps([]) }
  }

  const createMut = useMutation({ mutationFn: createAsset, onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); close_(); toast.success('Asset created') } })
  const updateMut = useMutation({ mutationFn: ({ id, data }: any) => updateAsset(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); close_(); toast.success('Updated') } })
  const deleteMut = useMutation({ mutationFn: deleteAsset, onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); toast.success('Deleted') } })

  const close_ = () => { setShowModal(false); setEditing(null); setForm(EMPTY) }
  const openCreate = () => { setForm(EMPTY); setEditing(null); setShowModal(true) }
  const openEdit = (a: Asset) => { setForm({ ...a }); setEditing(a); setShowModal(true) }
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const assets: Asset[] = data?.data?.items ?? []
  const sites = sitesData?.data?.items ?? []

  const columns = [
    {
      key: 'name', label: 'Asset',
      render: (r: Asset) => (
        <div className="flex items-center gap-2">
          <span className="text-base">{ASSET_ICON[r.asset_type] ?? '📦'}</span>
          <div>
            <div className="font-medium text-gray-100">{r.name}</div>
            {r.hostname && <div className="text-xs text-gray-500 font-mono">{r.hostname}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'asset_type', label: 'Type',
      render: (r: Asset) => <span className="badge bg-gray-700/50 text-gray-300">{r.asset_type}</span>,
    },
    { key: 'ip_address', label: 'IP', render: (r: Asset) => <span className="font-mono text-xs text-gray-400">{r.ip_address ?? '—'}</span> },
    { key: 'site_name', label: 'Site', render: (r: Asset) => <span className="text-gray-400">{r.site_name ?? '—'}</span> },
    { key: 'owner', label: 'Owner', render: (r: Asset) => <span className="text-gray-400">{r.owner ?? '—'}</span> },
    { key: 'criticality', label: 'Criticality', render: (r: Asset) => <SeverityBadge severity={r.criticality} /> },
    {
      key: 'actions', label: '',
      render: (r: Asset) => (
        <div className="flex gap-1.5">
          <button className="btn-ghost px-2 py-1 text-xs" title="Link to network link" onClick={e => { e.stopPropagation(); openLinkModal(r) }}><Link2 size={12} /></button>
          <button className="btn-ghost px-2 py-1 text-xs" onClick={e => { e.stopPropagation(); openEdit(r) }}><Edit2 size={12} /></button>
          <button className="btn-danger px-2 py-1 text-xs" onClick={e => { e.stopPropagation(); if (confirm('Delete this asset?')) deleteMut.mutate(r.id) }}><Trash2 size={12} /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6">
      <PageHeader title="Assets" subtitle={`${data?.data?.total ?? 0} infrastructure components`}
        action={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Asset</button>} />
      <div className="flex gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search assets…" />
        <select className="input w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="card [&_tr]:group">
        {isLoading ? <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
          : <Table columns={columns} data={assets} emptyMessage="No assets yet." />}
      </div>

      <Modal open={showModal} onClose={close_} title={editing ? 'Edit Asset' : 'Add Asset'}
        footer={<>
          <button className="btn-ghost" onClick={close_}>Cancel</button>
          <button className="btn-primary" disabled={!form.name}
            onClick={() => editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form)}>
            {editing ? 'Save' : 'Create'}
          </button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" required>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="HQ-FW-01" />
            </Field>
            <Field label="Type" required>
              <select className="input" value={form.asset_type} onChange={e => set('asset_type', e.target.value)}>
                {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Hostname">
              <input className="input font-mono" value={form.hostname} onChange={e => set('hostname', e.target.value)} placeholder="hq-fw-01.corp" />
            </Field>
            <Field label="IP Address">
              <input className="input font-mono" value={form.ip_address} onChange={e => set('ip_address', e.target.value)} placeholder="10.0.0.1" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Site">
              <select className="input" value={form.site_id} onChange={e => set('site_id', e.target.value || null)}>
                <option value="">None</option>
                {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Criticality">
              <select className="input" value={form.criticality} onChange={e => set('criticality', e.target.value)}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Owner">
            <input className="input" value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="NetOps Team" />
          </Field>
          <Field label="Description">
            <textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>
        </div>
      </Modal>

      {/* Link to Network Link Modal */}
      <Modal open={!!linkModal} onClose={() => setLinkModal(null)} title={`Link "${linkModal?.name}" to Network Link`}
        footer={<button className="btn-ghost" onClick={() => setLinkModal(null)}>Done</button>}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <select className="input flex-1" value={selectedLinkId} onChange={e => setSelectedLinkId(e.target.value)}>
              <option value="">Select a network link…</option>
              {links.filter((l: any) => !assetDeps.some((d: any) => d.target_id === l.id)).map((l: any) => (
                <option key={l.id} value={l.id}>{l.name} ({l.link_type})</option>
              ))}
            </select>
            <button className="btn-primary" disabled={!selectedLinkId || addLinkMut.isPending}
              onClick={() => addLinkMut.mutate({ source_type: 'asset', source_id: linkModal!.id, target_type: 'link', target_id: parseInt(selectedLinkId), label: 'depends on' })}>
              Add
            </button>
          </div>
          {assetDeps.length === 0
            ? <p className="text-sm text-gray-500">No network links associated yet.</p>
            : <div className="space-y-2">
                {assetDeps.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Link2 size={12} className="text-blue-400" />
                      <span className="text-sm text-gray-200">{links.find((l: any) => l.id === d.target_id)?.name ?? `Link #${d.target_id}`}</span>
                    </div>
                    <button className="text-gray-500 hover:text-red-400" onClick={() => removeLinkMut.mutate(d.id)}><X size={14} /></button>
                  </div>
                ))}
              </div>
          }
        </div>
      </Modal>
    </div>
  )
}
