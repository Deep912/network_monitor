import { cn, statusBg, severityBg, linkTypeColor } from '@/lib/utils'

// Status Badge
export function StatusBadge({ status }: { status?: string }) {
  return (
    <span className={cn('badge', statusBg(status))}>
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5',
        status === 'healthy' ? 'bg-emerald-400' :
        status === 'warning' ? 'bg-amber-400' :
        status === 'down' ? 'bg-red-400 animate-pulse' : 'bg-gray-500'
      )} />
      {status ?? 'unknown'}
    </span>
  )
}

// Severity Badge
export function SeverityBadge({ severity }: { severity?: string }) {
  return <span className={cn('badge', severityBg(severity))}>{severity ?? '—'}</span>
}

// Link Type Badge
export function LinkTypeBadge({ type }: { type?: string }) {
  return <span className={cn('badge', linkTypeColor(type))}>{type?.toUpperCase() ?? '—'}</span>
}

// Stat Card
interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  color?: string
  icon?: React.ReactNode
}
export function StatCard({ label, value, sub, color = 'text-gray-50', icon }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
          <p className={cn('text-3xl font-bold mt-1 tabular-nums', color)}>{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        {icon && <div className="text-gray-600">{icon}</div>}
      </div>
    </div>
  )
}

// Page Header
interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between px-6 pt-6 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-50">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// Table
interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function Table<T extends { id: number }>({ columns, data, onRowClick, emptyMessage }: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-sm">{emptyMessage ?? 'No data'}</p>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {columns.map((col) => (
              <th key={col.key} className={cn('text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider', col.className)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-gray-800/40')}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-gray-300', col.className)}>
                  {col.render ? col.render(row) : (row as any)[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Health Score Bar
export function HealthBar({ score }: { score?: number }) {
  const s = score ?? 0
  const color = s >= 90 ? 'bg-emerald-500' : s >= 70 ? 'bg-blue-500' : s >= 50 ? 'bg-amber-500' : s >= 20 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${s}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-400 w-8 text-right">{Math.round(s)}</span>
    </div>
  )
}

// Loading skeleton
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-800 rounded', className)} />
}

// Modal
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-gray-50">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">✕</button>
        </div>
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

// Form Field
interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}
export function Field({ label, required, children, hint }: FieldProps) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

// Empty state
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <span className="text-2xl">📡</span>
      </div>
      <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      {description && <p className="text-xs text-gray-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Search input
export function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
      <input
        className="input pl-8 w-64"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
      />
    </div>
  )
}
