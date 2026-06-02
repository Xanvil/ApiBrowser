import type { ApiGraph, ApiNode } from '../types/api'

/** 默认画布上可见的顶层类型（不含成员） */
export const DEFAULT_ROOT_TYPE_IDS = [
  'type:Application',
  'type:DocumentManager',
  'type:Document',
]

function isTypeKind(node: ApiNode | undefined): boolean {
  return node?.kind === 'type' || node?.kind === 'interface'
}

/**
 * 按层级计算可见子图，避免一次性渲染全部成员或沿 usesType 递归展开。
 *
 * 规则：
 * 1. 始终显示 root 类型节点
 * 2. expandedTypeIds 中的类型显示其 contains 直接成员
 * 3. 可见节点仅向外延伸一跳 type/interface 引用（inherits / usesType），不展开引用的类型的成员
 */
export function computeVisibleGraph(
  graph: ApiGraph,
  expandedTypeIds: ReadonlySet<string>,
  rootTypeIds: string[] = DEFAULT_ROOT_TYPE_IDS,
): ApiGraph {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const visibleIds = new Set<string>()

  for (const id of rootTypeIds) {
    if (nodeById.has(id)) visibleIds.add(id)
  }

  for (const typeId of expandedTypeIds) {
    visibleIds.add(typeId)
    for (const edge of graph.edges) {
      if (edge.kind === 'contains' && edge.source === typeId) {
        visibleIds.add(edge.target)
      }
    }
  }

  addOneHopTypeReferences(graph, visibleIds, nodeById)

  const nodes = graph.nodes.filter((n) => visibleIds.has(n.id))
  const edges = graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))

  return { ...graph, nodes, edges }
}

function addOneHopTypeReferences(
  graph: ApiGraph,
  visibleIds: Set<string>,
  nodeById: Map<string, ApiNode>,
): void {
  const pending = [...visibleIds]

  for (const id of pending) {
    for (const edge of graph.edges) {
      if (edge.source !== id) continue
      if (edge.kind !== 'inherits' && edge.kind !== 'implements' && edge.kind !== 'usesType') {
        continue
      }
      const target = nodeById.get(edge.target)
      if (isTypeKind(target)) visibleIds.add(edge.target)
    }
  }
}

/** 统计类型的直接成员数 */
export function countDirectMembers(graph: ApiGraph, typeId: string): number {
  return graph.edges.filter((e) => e.kind === 'contains' && e.source === typeId).length
}

/** 获取节点的 contains 父类型链（用于搜索定位时逐级展开） */
export function getAncestorTypeIds(graph: ApiGraph, nodeId: string): string[] {
  const parents = new Map<string, string>()
  for (const edge of graph.edges) {
    if (edge.kind === 'contains') parents.set(edge.target, edge.source)
  }

  const ancestors: string[] = []
  let current = parents.get(nodeId)
  while (current) {
    ancestors.unshift(current)
    current = parents.get(current)
  }
  return ancestors
}

const PRIMITIVE_TYPES = new Set([
  'void', 'bool', 'bool?', 'int', 'string', 'object', 'double', 'float',
  'IEnumerator', 'DocumentLock', 'DocumentLockMode', 'DocumentSaveFormat',
  'Version', 'WhoHasInfo', 'ResultBuffer', 'Point', 'Size',
])

/** 解析属性/方法引用的类型节点 id */
export function getReferencedTypeId(graph: ApiGraph, nodeId: string): string | null {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const node = nodeById.get(nodeId)
  if (!node) return null

  const refEdge = graph.edges.find(
    (e) => (e.kind === 'usesType' || e.kind === 'returns') && e.source === nodeId,
  )
  if (refEdge && nodeById.has(refEdge.target)) return refEdge.target

  const typeName = (node.propertyType ?? node.returnType)?.replace(/\?$/, '').trim()
  if (!typeName || PRIMITIVE_TYPES.has(typeName)) return null

  const exact = graph.nodes.find(
    (n) =>
      (n.kind === 'type' || n.kind === 'interface') &&
      (n.name === typeName || n.name === typeName.split('.').pop()),
  )
  return exact?.id ?? null
}

/** 跳转到类型前需展开的父类型链（沿 usesType 来源属性的 contains 链） */
export function getExpandIdsForTypeTarget(graph: ApiGraph, typeId: string): string[] {
  const expand = new Set<string>()
  for (const edge of graph.edges) {
    if (edge.target !== typeId || edge.kind !== 'usesType') continue
    for (const ancestorId of getAncestorTypeIds(graph, edge.source)) {
      expand.add(ancestorId)
    }
  }
  return [...expand]
}

export function filterGraphByNamespace(graph: ApiGraph, namespace: string | null): ApiGraph {
  if (!namespace) return graph

  const nodeIds = new Set<string>()
  for (const n of graph.nodes) {
    if (n.namespace === namespace) nodeIds.add(n.id)
  }
  for (const edge of graph.edges) {
    if (edge.kind === 'contains' && nodeIds.has(edge.source)) {
      nodeIds.add(edge.target)
    }
  }

  return {
    ...graph,
    nodes: graph.nodes.filter((n) => nodeIds.has(n.id)),
    edges: graph.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target)),
  }
}

export function searchNodes(graph: ApiGraph, query: string): ApiNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return graph.nodes.filter(
    (n) =>
      n.name.toLowerCase().includes(q) ||
      n.fullName.toLowerCase().includes(q) ||
      n.summary?.toLowerCase().includes(q),
  )
}
