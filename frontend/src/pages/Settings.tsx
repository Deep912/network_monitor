import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAlertConfig, updateAlertConfig } from '@/api/client'
import { PageHeader, Field } from '@/components/ui'
import toast from 'react-hot-toast'
import { Save, Bell, Shield } from 'lucide-react'

export default function Settings() {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(null)

  const { data } = useQuery({ queryKey: ['alert-config'], queryFn: getAlertConfig })

  useEffect(() => {
    if (data?.data) setForm({ ...data.data, smtp_pass: '' })
  }, [data])

  const saveMut = useMutation({
    mutationFn: updateAlertConfig,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alert-config'] }); toast.success('Settings saved') },
    onError: () => toast.error('Failed to save'),
  })

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  if (!form) return <div className="p-6 text-gray-500 text-sm">Loading…</div>

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Alert configuration and monitoring settings" />

      {/* Alert Toggles */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell size={16} className="text-gray-400" />
          <h2 className="text-sm font-medium text-gray-300">Alert Rules</h2>
        </div>
        <div className="space-y-4">
          {[
            { key: 'alert_on_link_down', label: 'Alert on Link Down', desc: 'Send email when a link becomes unreachable' },
            { key: 'alert_on_link_recovered', label: 'Alert on Link Recovery', desc: 'Send email when a link comes back online' },
            { key: 'alert_on_high_latency', label: 'Alert on High Latency', desc: 'Send email when latency exceeds threshold' },
            { key: 'alert_on_high_packet_loss', label: 'Alert on Packet Loss', desc: 'Send email when packet loss exceeds threshold' },
            { key: 'enabled', label: 'Enable Email Alerts', desc: 'Master toggle for all email notifications' },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-start justify-between gap-4 cursor-pointer group">
              <div>
                <div className="text-sm font-medium text-gray-200 group-hover:text-gray-100">{label}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
              <div className="relative flex-shrink-0 mt-0.5">
                <input type="checkbox" className="sr-only" checked={!!form[key]} onChange={e => set(key, e.target.checked)} />
                <div className={`w-10 h-5 rounded-full transition-colors ${form[key] ? 'bg-blue-600' : 'bg-gray-700'}`} onClick={() => set(key, !form[key])}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Thresholds */}
        <div className="mt-6 pt-6 border-t border-gray-800 grid grid-cols-2 gap-4">
          <Field label="Latency Threshold (ms)">
            <input type="number" className="input" value={form.latency_threshold_ms}
              onChange={e => set('latency_threshold_ms', Number(e.target.value))} min={10} max={5000} />
          </Field>
          <Field label="Packet Loss Threshold (%)">
            <input type="number" className="input" value={form.packet_loss_threshold}
              onChange={e => set('packet_loss_threshold', Number(e.target.value))} min={0} max={100} step={0.5} />
          </Field>
        </div>
      </div>

      {/* SMTP */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Shield size={16} className="text-gray-400" />
          <h2 className="text-sm font-medium text-gray-300">SMTP Configuration</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Field label="SMTP Host">
                <input className="input" value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
              </Field>
            </div>
            <Field label="Port">
              <input type="number" className="input" value={form.smtp_port} onChange={e => set('smtp_port', Number(e.target.value))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SMTP Username">
              <input className="input" value={form.smtp_user} onChange={e => set('smtp_user', e.target.value)} />
            </Field>
            <Field label="SMTP Password" hint="Leave blank to keep existing">
              <input type="password" className="input" value={form.smtp_pass} onChange={e => set('smtp_pass', e.target.value)} placeholder="••••••••" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="From Address">
              <input type="email" className="input" value={form.smtp_from} onChange={e => set('smtp_from', e.target.value)} placeholder="netops@company.com" />
            </Field>
            <Field label="Alert Email">
              <input type="email" className="input" value={form.alert_email} onChange={e => set('alert_email', e.target.value)} placeholder="oncall@company.com" />
            </Field>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button className="btn-primary px-6 py-2.5" onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
          <Save size={15} /> {saveMut.isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>• Monitoring runs every 60 seconds for all links with a monitoring target configured.</p>
        <p>• Default admin credentials: <span className="font-mono">admin / admin</span> — change these in production.</p>
        <p>• ICMP ping requires root/CAP_NET_RAW. Falls back to TCP port 80 if unavailable.</p>
      </div>
    </div>
  )
}
