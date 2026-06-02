import type { ApiGraph, ApiNode } from '../types/api'

export interface TreeNamespace {
  id: string
  name: string
  shortName: string
  types: ApiNode[]
}

export interface TypeMembers {
  properties: ApiNode[]
  methods: ApiNode[]
  events: ApiNode[]
}

export function buildNamespaceTree(graph: ApiGraph): TreeNamespace[] {
  const types = graph.nodes.filter((n) => n.kind === 'type' || n.kind === 'interface')
  const byNs = new Map<string, ApiNode[]>()

  for (const t of types) {
    const ns = t.namespace ?? '(global)'
    const list = byNs.get(ns) ?? []
    list.push(t)
    byNs.set(ns, list)
  }

  return [...byNs.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, nsTypes]) => ({
      id: `ns:${name}`,
      name,
      shortName: name.replace(/^Autodesk\.AutoCAD\./, ''),
      types: nsTypes.sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

export function getTypeMembers(graph: ApiGraph, typeId: string): TypeMembers {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const members = graph.edges
    .filter((e) => e.kind === 'contains' && e.source === typeId)
    .map((e) => nodeById.get(e.target))
    .filter((n): n is ApiNode => !!n)

  return {
    properties: members.filter((m) => m.kind === 'property').sort((a, b) => a.name.localeCompare(b.name)),
    methods: members.filter((m) => m.kind === 'method').sort((a, b) => a.name.localeCompare(b.name)),
    events: members.filter((m) => m.kind === 'event').sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export function findNode(graph: ApiGraph, id: string): ApiNode | undefined {
  return graph.nodes.find((n) => n.id === id)
}

export function findNodeByFullName(graph: ApiGraph, fullName: string): ApiNode | undefined {
  return graph.nodes.find((n) => n.fullName === fullName)
}

export function findParentTypeId(graph: ApiGraph, memberId: string): string | null {
  const edge = graph.edges.find((e) => e.kind === 'contains' && e.target === memberId)
  return edge?.source ?? null
}

export interface ApiSelection {
  typeId: string
  memberId: string | null
}

/** 根据 fullName 解析应选中的类型与成员。 */
export function resolveSelectionFromFullName(
  graph: ApiGraph,
  fullName: string,
): ApiSelection | null {
  const node = findNodeByFullName(graph, fullName)
  if (!node) return null

  if (node.kind === 'type' || node.kind === 'interface') {
    return { typeId: node.id, memberId: null }
  }

  const parentId = findParentTypeId(graph, node.id)
  if (!parentId) return null
  return { typeId: parentId, memberId: node.id }
}

export function searchTypes(graph: ApiGraph, query: string): ApiNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return graph.nodes.filter(
    (n) =>
      (n.kind === 'type' || n.kind === 'interface') &&
      (n.name.toLowerCase().includes(q) ||
        n.fullName.toLowerCase().includes(q) ||
        n.namespace?.toLowerCase().includes(q)),
  )
}

const kindRank: Record<string, number> = {
  type: 0,
  interface: 1,
  property: 2,
  method: 3,
  event: 4,
}

/** 首页全局搜索：类型优先，其次成员。 */
export function searchApiNodes(graph: ApiGraph, query: string, limit = 40): ApiNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const matches = graph.nodes.filter(
    (n) =>
      n.kind !== 'namespace' &&
      (n.name.toLowerCase().includes(q) ||
        n.fullName.toLowerCase().includes(q) ||
        n.namespace?.toLowerCase().includes(q)),
  )

  matches.sort((a, b) => {
    const rankA = kindRank[a.kind] ?? 9
    const rankB = kindRank[b.kind] ?? 9
    if (rankA !== rankB) return rankA - rankB
    return a.fullName.localeCompare(b.fullName)
  })

  return matches.slice(0, limit)
}
