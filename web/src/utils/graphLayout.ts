import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'
import type { ApiGraph, ApiNode, CardNodeData } from '../types/api'
import { EDGE_STYLES } from './edgeStyles'

export const CARD_WIDTH = 240
export const TAG_HEIGHT = 28
const TAG_CHAR_WIDTH = 7
const TAG_PADDING = 24

const EXPANDED_CARD_HEIGHT: Record<string, number> = {
  type: 120,
  interface: 120,
  method: 90,
  property: 80,
  event: 72,
}

export function tagWidth(name: string): number {
  return Math.max(52, Math.min(180, name.length * TAG_CHAR_WIDTH + TAG_PADDING))
}

/** 布局始终按标签尺寸计算，展开卡片向右延伸不挤占其他节点 */
export function layoutNodeSize(node: ApiNode): { width: number; height: number } {
  return { width: tagWidth(node.name), height: TAG_HEIGHT }
}

function cardNodeType(kind: ApiNode['kind']): string {
  if (kind === 'method') return 'methodCard'
  if (kind === 'property') return 'propertyCard'
  if (kind === 'event') return 'eventCard'
  return 'typeCard'
}

export interface GraphViewState {
  expandedCardIds: ReadonlySet<string>
  expandedTypeIds: ReadonlySet<string>
}

export function graphToFlow(
  graph: ApiGraph,
  viewState: GraphViewState,
): { nodes: Node<CardNodeData>[]; edges: Edge[] } {
  const { expandedCardIds } = viewState

  const nodes: Node<CardNodeData>[] = graph.nodes.map((n) => {
    const cardExpanded = expandedCardIds.has(n.id)
    return {
      id: n.id,
      type: cardNodeType(n.kind),
      data: {
        ...n,
        cardExpanded,
      },
      position: { x: 0, y: 0 },
      zIndex: cardExpanded ? 10 : 0,
    }
  })

  const edges: Edge[] = graph.edges.map((e) => {
    const style = EDGE_STYLES[e.kind] ?? EDGE_STYLES.contains
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'step',
      animated: false,
      style: {
        stroke: style.stroke,
        strokeWidth: 2,
        strokeDasharray: style.strokeDasharray,
      },
      markerEnd:
        e.kind === 'inherits' || e.kind === 'implements'
          ? { type: 'arrowclosed' as const, color: style.stroke }
          : undefined,
    }
  })

  return layoutWithDagre(nodes, edges)
}

function layoutWithDagre(
  nodes: Node<CardNodeData>[],
  edges: Edge[],
): { nodes: Node<CardNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 16, ranksep: 44, marginx: 16, marginy: 16 })

  nodes.forEach((node) => {
    const apiNode = node.data as ApiNode
    const { width, height } = layoutNodeSize(apiNode)
    g.setNode(node.id, { width, height })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id)
    const apiNode = node.data as ApiNode
    const { width, height } = layoutNodeSize(apiNode)
    return {
      ...node,
      position: { x: pos.x - width / 2, y: pos.y - height / 2 },
    }
  })

  return { nodes: layoutedNodes, edges }
}

export function expandedCardHeight(kind: ApiNode['kind']): number {
  return EXPANDED_CARD_HEIGHT[kind] ?? 100
}
