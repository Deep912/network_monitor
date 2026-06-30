export type LinkType = 'internet' | 'mpls' | 'p2p' | 'vpn' | 'sdwan'
export type LinkStatus = 'healthy' | 'warning' | 'down' | 'unknown'
export type AssetType = 'server' | 'firewall' | 'router' | 'switch' | 'storage' | 'application'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'open' | 'resolved'

export interface Provider {
  id: number
  name: string
  support_phone?: string
  noc_phone?: string
  support_email?: string
  account_manager?: string
  notes?: string
  portal_url?: string
  created_at: string
  link_count?: number
}

export interface Site {
  id: number
  name: string
  address?: string
  region?: string
  latitude?: number
  longitude?: number
  description?: string
  created_at: string
  link_count?: number
  asset_count?: number
}

export interface Link {
  id: number
  name: string
  description?: string
  link_type: LinkType
  provider_id?: number
  provider_name?: string
  site_id?: number
  site_name?: string
  circuit_id?: string
  circuit_number?: string
  bandwidth?: string
  primary_ip?: string
  secondary_ip?: string
  monitoring_target?: string
  status: LinkStatus
  priority?: number
  notes?: string
  health_score?: number
  latency?: number
  packet_loss?: number
  last_checked?: string
  created_at: string
  incidents?: Incident[]
}

export interface Asset {
  id: number
  name: string
  hostname?: string
  ip_address?: string
  asset_type: AssetType
  site_id?: number
  site_name?: string
  owner?: string
  description?: string
  criticality?: Severity
  created_at: string
}

export interface Incident {
  id: number
  title: string
  description?: string
  severity: Severity
  status: IncidentStatus
  link_id?: number
  link_name?: string
  start_time: string
  end_time?: string
  resolution_notes?: string
}

export interface LinkCheck {
  id: number
  link_id: number
  checked_at: string
  status?: LinkStatus
  latency?: number
  packet_loss?: number
  response_time?: number
  health_score?: number
}

export interface DashboardStats {
  total_links: number
  healthy_links: number
  warning_links: number
  down_links: number
  unknown_links: number
  total_providers: number
  total_sites: number
  total_assets: number
  active_incidents: number
}

export interface Dependency {
  id: number
  source_type: string
  source_id: number
  target_type: string
  target_id: number
  label?: string
}

export interface GraphNode {
  id: string
  label: string
  type: 'link' | 'asset'
  status?: string
  link_type?: string
  asset_type?: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}
