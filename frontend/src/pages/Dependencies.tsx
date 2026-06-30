import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDependencies } from '@/api/client'
import ReactFlow, {
  Background, Controls, MiniMap,
  Node, Edge, useNodesState, useEdgesState,
  addEdge, Position, Handle,
  type NodeProps
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useEffect } from 'react'
import { PageHeader } from '@/components/ui'
import { cn } from '@/lib/utils'

const STATUS_COLOR: Record<string, string> = {
  healthy: '#10b981', warning: '#f59e0b', down: '#ef4444', unknown: '#52527a'
}

const ASSET_ICON: Record<string, string> = {
  firewall: '🔥', router: '📡', switch: '🔀', server: '🖥️',
  storage: '💾', application: '⚙️', link: '🔗',
}

function NetNode({ data }: NodeProps) {
  const color = STATUS_COLOR[data.status] ?? STATUS_COLOR.unknown
  const icon = ASSET_ICON[data.link_type ?? data.asset_type ?? data.type] ?? '📦'

  return (
    <div className={cn(
      'px-4 py-2.5 rounded-xl border text-xs font-medium shadow-lg min-w-[140px] text-center',
      'bg-gray-900 text-gray-100',
    )} style={{ borderColor: color + '60' }}>
      <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8, border: 'none' }} />
      <div className="text-xl mb-1">{icon}</div>
      <div style={{ color }} className="text-[10px] uppercase tracking-wider mb-0.5">
        {data.type === 'link' ? data.link_type : data.asset_type}
      </div>
      <div className="text-gray-100">{data.label}</div>
      <div className="flex items-center justify-center gap-1 mt-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span style={{ color }} className="text-[10px]">{data.status ?? 'unknown'}</span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8, border: 'none' }} />
    </div>
  )
}

const nodeTypes = { net: NetNode }

function buildLayout(rawNodes: any[], edges: any[]): Node[] {
  // Simple hierarchical layout
  const linkNodes = rawNodes.filter(n => n.type === 'link')
  const assetNodes = rawNodes.filter(n => n.type === 'asset')

  const placed: Node[] = []
  const cols = 4
  const xGap = 200, yGap = 160

  linkNodes.forEach((n, i) => {
    placed.push({
      id: n.id, type: 'net', position: { x: (i % cols) * xGap, y: Math.floor(i / cols) * yGap },
      data: n,
    })
  })

  const yOffset = Math.ceil(linkNodes.length / cols) * yGap + 60
  assetNodes.forEach((n, i) => {
    placed.push({
      id: n.id, type: 'net', position: { x: (i % cols) * xGap, y: yOffset + Math.floor(i / cols) * yGap },
      data: n,
    })
  })

  return placed
}

export default function Dependencies() {
  const { data, isLoading } = useQuery({ queryKey: ['dependencies'], queryFn: getDependencies })
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    const raw = data?.data
    if (!raw) return

    const laid = buildLayout(raw.nodes ?? [], raw.edges ?? [])
    setNodes(laid)

    const flowEdges: Edge[] = (raw.edges ?? []).map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || undefined,
      style: { stroke: '#3a3a52', strokeWidth: 2 },
      labelStyle: { fill: '#9494c0', fontSize: 10 },
      labelBgStyle: { fill: '#17171f' },
      animated: false,
    }))
    setEdges(flowEdges)
  }, [data])

  if (isLoading) return (
    <div className="p-6">
      <PageHeader title="Dependencies" subtitle="Network topology visualization" />
      <div className="h-[600px] card mt-4 flex items-center justify-center text-gray-500 text-sm">
        Loading topology…
      </div>
    </div>
  )

  const hasData = nodes.length > 0

  return (
    <div className="p-6 h-screen flex flex-col">
      <PageHeader title="Dependencies" subtitle="Interactive network dependency graph" />

      <div className="flex-1 card mt-4 overflow-hidden">
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-3">🕸️</div>
              <div className="text-sm">No dependency relationships defined yet.</div>
              <div className="text-xs text-gray-600 mt-1">Create links and assets, then add dependencies via the API.</div>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
          >
            <Background color="#27273a" gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(n) => STATUS_COLOR[(n.data as any)?.status] ?? '#27273a'}
              maskColor="rgba(10,10,15,0.8)"
            />
          </ReactFlow>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="font-medium text-gray-400">Status:</span>
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: c }} />
            <span className="capitalize">{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
