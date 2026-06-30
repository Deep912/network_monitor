import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProviders, createProvider, updateProvider, deleteProvider } from '@/api/client'
import { PageHeader, Table, SearchInput, Modal, Field, EmptyState } from '@/components/ui'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, ExternalLink } from 'lucide-react'
import type { Provider } from '@/types'

const EMPTY = { name: '', support_phone: '', noc_phone: '', support_email: '', account_manager: '', notes: '', portal_url: '' }

export default function Providers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Provider | null>(null)
  const [form, setForm] = useState<any>(EMPTY)

  const { data, isLoading } = useQuery({
    queryKey: ['providers', search],
    queryFn: () => getProviders({ search }),
  })

  const createMut = useMutation({
    mutationFn: createProvider,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['providers'] }); close_(); toast.success('Provider created') },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => updateProvider(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['providers'] }); close_(); toast.success('Provider updated') },
  })
  const deleteMut = useMutation({
    mutationFn: deleteProvider,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['providers'] }); toast.success('Deleted') },
  })

  const close_ = () => { setShowModal(false); setEditing(null); setForm(EMPTY) }
  const openCreate = () => { setForm(EMPTY); setEditing(null); setShowModal(true) }
  const openEdit = (p: Provider) => { setForm({ ...p }); setEditing(p); setShowModal(true) }
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const providers: Provider[] = data?.data?.items ?? []

  const columns = [
    { key: 'name', label: 'Name', render: (r: Provider) => <span className="font-medium text-gray-100">{r.name}</span> },
    { key: 'support_phone', label: 'Support Phone', render: (r: Provider) => <span className="font-mono text-xs text-gray-400">{r.support_phone ?? '—'}</span> },
    { key: 'noc_phone', label: 'NOC Phone', render: (r: Provider) => <span className="font-mono text-xs text-gray-400">{r.noc_phone ?? '—'}</span> },
    { key: 'support_email', label: 'Email', render: (r: Provider) => <span className="text-sm text-gray-400">{r.support_email ?? '—'}</span> },
    { key: 'link_count', label: 'Links', render: (r: Provider) => <span className="text-gray-400">{r.link_count ?? 0}</span> },
    {
      key: 'portal_url', label: 'Portal',
      render: (r: Provider) => r.portal_url ? (
        <a href={r.portal_url} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs"
          onClick={e => e.stopPropagation()}>
          Open <ExternalLink size={10} />
        </a>
      ) : <span className="text-gray-600">—</span>,
    },
    {
      key: 'actions', label: '',
      render: (r: Provider) => (
        <div className="flex items-center gap-1.5 opacity-100">
          <button className="btn-ghost px-2 py-1 text-xs" onClick={e => { e.stopPropagation(); openEdit(r) }}><Edit2 size={12} /></button>
          <button className="btn-danger px-2 py-1 text-xs" onClick={e => { e.stopPropagation(); if (confirm('Delete?')) deleteMut.mutate(r.id) }}><Trash2 size={12} /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Providers"
        subtitle={`${data?.data?.total ?? 0} ISPs and carriers`}
        action={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Provider</button>}
      />
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search providers…" /></div>
      <div className="card [&_tr]:group">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
        ) : (
          <Table columns={columns} data={providers} emptyMessage="No providers yet." />
        )}
      </div>

      <Modal open={showModal} onClose={close_} title={editing ? 'Edit Provider' : 'Add Provider'}
        footer={
          <>
            <button className="btn-ghost" onClick={close_}>Cancel</button>
            <button className="btn-primary"
              onClick={() => editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form)}
              disabled={!form.name}>
              {editing ? 'Save' : 'Create'}
            </button>
          </>
        }>
        <div className="space-y-4">
          <Field label="Provider Name" required>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Comcast Business" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Support Phone">
              <input className="input" value={form.support_phone ?? ''} onChange={e => set('support_phone', e.target.value)} />
            </Field>
            <Field label="NOC Phone">
              <input className="input" value={form.noc_phone ?? ''} onChange={e => set('noc_phone', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Support Email">
              <input type="email" className="input" value={form.support_email ?? ''} onChange={e => set('support_email', e.target.value)} />
            </Field>
            <Field label="Account Manager">
              <input className="input" value={form.account_manager ?? ''} onChange={e => set('account_manager', e.target.value)} />
            </Field>
          </div>
          <Field label="Portal URL">
            <input type="url" className="input" value={form.portal_url ?? ''} onChange={e => set('portal_url', e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Notes">
            <textarea className="input" rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
