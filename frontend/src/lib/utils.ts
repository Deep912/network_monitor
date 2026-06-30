import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { LinkStatus, Severity } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function statusColor(status?: string): string {
  switch (status) {
    case 'healthy': return 'text-emerald-400'
    case 'warning': return 'text-amber-400'
    case 'down': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

export function statusBg(status?: string): string {
  switch (status) {
    case 'healthy': return 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
    case 'warning': return 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
    case 'down': return 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
    default: return 'bg-gray-700/50 text-gray-400 ring-1 ring-gray-600/30'
  }
}

export function severityBg(severity?: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
    case 'high': return 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30'
    case 'medium': return 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
    case 'low': return 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
    default: return 'bg-gray-700/50 text-gray-400'
  }
}

export function linkTypeColor(type?: string): string {
  switch (type) {
    case 'internet': return 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
    case 'mpls': return 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30'
    case 'p2p': return 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30'
    case 'vpn': return 'bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30'
    case 'sdwan': return 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30'
    default: return 'bg-gray-700/50 text-gray-400'
  }
}

export function healthScoreColor(score?: number): string {
  if (!score && score !== 0) return 'text-gray-400'
  if (score >= 90) return 'text-emerald-400'
  if (score >= 70) return 'text-blue-400'
  if (score >= 50) return 'text-amber-400'
  if (score >= 20) return 'text-orange-400'
  return 'text-red-400'
}

export function formatLatency(ms?: number): string {
  if (!ms && ms !== 0) return '—'
  return `${ms.toFixed(1)} ms`
}

export function formatPacketLoss(pct?: number): string {
  if (!pct && pct !== 0) return '—'
  return `${pct.toFixed(1)}%`
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export function formatRelative(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
