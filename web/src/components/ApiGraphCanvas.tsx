import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo } from 'react'
import { createNodeTypes, edgeTypes } from './ApiNodeCards'
import type { ApiGraph, ApiNode, CardNodeData } from '../types/api'
import { layoutColumnGraph } from '../utils/columnLayout'
import { getReferencedTypeId } from '../utils/visibleGraph'
import { EDGE_STYLES, LEGEND_EDGE_KINDS } from '../utils/edgeStyles'

interface ApiGraphCanvasProps {
  graph: ApiGraph
  fullGraph: ApiGraph
  rootTypeIds: string[]
  selectedId: string | null
  expandedCardIds: ReadonlySet<string>
  expandedTypeIds: ReadonlySet<string>
  onNodeClick: (node: ApiNode) => void
  onNodeDoubleClick: (node: ApiNode) => void
  onNavigateToType: (typeId: string) => void
  onPaneClick: () => void
  focusId?: string | null
}

export function ApiGraphCanvas({
  graph,
  fullGraph,
  rootTypeIds,
  selectedId,
  expandedCardIds,
  expandedTypeIds,
  onNodeClick,
  onNodeDoubleClick,
  onNavigateToType,
  onPaneClick,
  focusId,
}: ApiGraphCanvasProps) {
  const nodeTypes = useMemo(() => createNodeTypes(onNavigateToType), [onNavigateToType])

  const { nodes: layoutNodes, edges } = useMemo(
    () =>
      layoutColumnGraph(graph, {
        rootTypeIds,
        expandedTypeIds,
        expandedCardIds,
        selectedId,
      }),
    [graph, rootTypeIds, expandedTypeIds, expandedCardIds, selectedId],
  )

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<CardNodeData>) => {
      const data = node.data as CardNodeData
      if (data.isDetailPanel) return
      onNodeClick(data as ApiNode)
    },
    [onNodeClick],
  )

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node<CardNodeData>) => {
      const data = node.data as CardNodeData
      if (data.isDetailPanel) return
      onNodeDoubleClick(data as ApiNode)
    },
    [onNodeDoubleClick],
  )

  const nodes = useMemo(
    () =>
      layoutNodes.map((n) => {
        const data = n.data as CardNodeData
        const typeTargetId = data.isDetailPanel ? null : getReferencedTypeId(fullGraph, data.id)
        return {
          ...n,
          selected: n.id === selectedId || n.id === `detail:${selectedId}`,
          data: {
            ...data,
            selected: n.id === selectedId || n.id === `detail:${selectedId}`,
            typeTargetId: data.isDetailPanel
              ? getReferencedTypeId(fullGraph, data.id)
              : typeTargetId,
          },
        }
      }),
    [layoutNodes, selectedId, fullGraph],
  )

  return (
    <div className="graph-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.12, maxZoom: 1.2 }}
        minZoom={0.25}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        elevateNodesOnSelect
      >
        <Background gap={16} size={1} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'detailCard') return '#e2e8f0'
            const kind = (n.data as unknown as ApiNode)?.kind
            if (kind === 'method') return '#86efac'
            if (kind === 'property') return '#fde68a'
            if (kind === 'event') return '#f0abfc'
            return '#93c5fd'
          }}
          maskColor="rgba(248, 250, 252, 0.75)"
        />
        <Panel position="top-left" className="graph-legend">
          <span className="legend-item">属性/方法双击 → 跳转到类型</span>
          <span className="legend-item">详情中点击类型链接亦可跳转</span>
          {LEGEND_EDGE_KINDS.map((kind) => {
            const s = EDGE_STYLES[kind]
            return (
              <span key={kind} className="legend-item">
                <span
                  className="legend-line"
                  style={{
                    borderColor: s.stroke,
                    borderStyle: s.strokeDasharray ? 'dashed' : 'solid',
                  }}
                />
                {s.legendLabel}
              </span>
            )
          })}
        </Panel>
        {focusId && <FocusNode id={focusId} />}
      </ReactFlow>
    </div>
  )
}

function FocusNode({ id }: { id: string }) {
  const { getNode, setCenter } = useReactFlow()

  useEffect(() => {
    const node = getNode(id) ?? getNode(`detail:${id}`)
    if (!node) return
    setCenter(node.position.x + 80, node.position.y + 20, { zoom: 0.9, duration: 400 })
  }, [id, getNode, setCenter])

  return null
}
