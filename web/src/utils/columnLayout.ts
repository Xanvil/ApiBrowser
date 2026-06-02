import type { Node, Edge } from '@xyflow/react'
import type { ApiGraph, ApiNode, CardNodeData } from '../types/api'
import { EDGE_STYLES } from './edgeStyles'

/** 四列布局：1=节点 2=连线/父详情 3=子节点 4=子详情 */
export const COL = {
  1: { x: 16, w: 150 },
  2: { x: 178, w: 228 },
  3: { x: 418, w: 170 },
  4: { x: 600, w: 250 },
} as const

export const COL2_CENTER = COL[2].x + COL[2].w / 2

export const TAG_H = 28
export const ROW_GAP = 8
export const GROUP_GAP = 20

export function tagWidth(name: string): number {
  return Math.max(52, Math.min(COL[1].w - 8, name.length * 7 + 24))
}

export interface ColumnLayoutState {
  rootTypeIds: string[]
  expandedTypeIds: ReadonlySet<string>
  expandedCardIds: ReadonlySet<string>
  selectedId: string | null
}

interface PlacedNode {
  id: string
  node: ApiNode
  column: 1 | 3
  y: number
  parentId?: string
}

export function layoutColumnGraph(
  graph: ApiGraph,
  state: ColumnLayoutState,
): { nodes: Node<CardNodeData>[]; edges: Edge[] } {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const rootSet = new Set(state.rootTypeIds.filter((id) => nodeById.has(id)))
  const placed: PlacedNode[] = []
  let cursorY = 16

  for (const rootId of state.rootTypeIds) {
    const root = nodeById.get(rootId)
    if (!root) continue

    const children = state.expandedTypeIds.has(rootId)
      ? graph.edges
          .filter((e) => e.kind === 'contains' && e.source === rootId)
          .map((e) => nodeById.get(e.target))
          .filter((n): n is ApiNode => !!n)
      : []

    placed.push({ id: rootId, node: root, column: 1, y: cursorY })

    children.forEach((child, i) => {
      placed.push({
        id: child.id,
        node: child,
        column: 3,
        y: cursorY + i * (TAG_H + ROW_GAP),
        parentId: rootId,
      })
    })

    const blockH =
      children.length > 0
        ? (children.length - 1) * (TAG_H + ROW_GAP) + TAG_H
        : TAG_H
    cursorY += blockH + GROUP_GAP
  }

  // 一跳引用的类型：非 root 的可见类型放到第 3 列（与引用源同行）
  const placedIds = new Set(placed.map((p) => p.id))
  for (const n of graph.nodes) {
    if (placedIds.has(n.id)) continue
    if (n.kind !== 'type' && n.kind !== 'interface') continue
    if (rootSet.has(n.id)) continue

    const refEdge = graph.edges.find(
      (e) =>
        (e.kind === 'usesType' || e.kind === 'inherits') &&
        e.target === n.id &&
        placedIds.has(e.source),
    )
    const sourcePlaced = refEdge ? placed.find((p) => p.id === refEdge.source) : undefined
    placed.push({
      id: n.id,
      node: n,
      column: 3,
      y: sourcePlaced?.y ?? cursorY,
    })
    placedIds.add(n.id)
    cursorY += TAG_H + GROUP_GAP
  }

  const flowNodes: Node<CardNodeData>[] = []

  for (const p of placed) {
    const isRoot = p.column === 1
    flowNodes.push({
      id: p.id,
      type: tagNodeType(p.node.kind),
      position: { x: COL[p.column].x, y: p.y },
      data: {
        ...p.node,
        column: p.column,
        cardExpanded: false,
        selected: p.id === state.selectedId,
      },
      draggable: false,
      selectable: true,
      zIndex: p.id === state.selectedId ? 10 : 1,
    })

    if (state.expandedCardIds.has(p.id)) {
      const detailCol = isRoot ? 2 : 4
      flowNodes.push({
        id: `detail:${p.id}`,
        type: 'detailCard',
        position: { x: COL[detailCol].x, y: p.y },
        data: {
          ...p.node,
          column: detailCol,
          isDetailPanel: true,
          cardExpanded: true,
          selected: p.id === state.selectedId,
        },
        draggable: false,
        selectable: false,
        zIndex: 15,
      })
    }
  }

  const placedMap = new Map(placed.map((p) => [p.id, p]))
  const flowEdges: Edge[] = []

  for (const e of graph.edges) {
    if (!placedMap.has(e.source) || !placedMap.has(e.target)) continue
    if (e.kind !== 'contains' && e.kind !== 'usesType' && e.kind !== 'inherits') continue

    const style = EDGE_STYLES[e.kind] ?? EDGE_STYLES.contains
    flowEdges.push({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'column',
      style: {
        stroke: style.stroke,
        strokeWidth: 2,
        strokeDasharray: style.strokeDasharray,
      },
      markerEnd:
        e.kind === 'inherits'
          ? { type: 'arrowclosed' as const, color: style.stroke }
          : undefined,
    })
  }

  return { nodes: flowNodes, edges: flowEdges }
}

function tagNodeType(kind: ApiNode['kind']): string {
  if (kind === 'method') return 'methodCard'
  if (kind === 'property') return 'propertyCard'
  if (kind === 'event') return 'eventCard'
  return 'typeCard'
}

export function isRootNode(nodeId: string, rootTypeIds: string[]): boolean {
  return rootTypeIds.includes(nodeId)
}
