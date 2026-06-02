import type { ApiEdge, ApiGraph, ApiNode } from '../types/api'
import { applicationEdges, applicationNodes } from './members/application'
import { documentEdges, documentNodes } from './members/document'
import { documentManagerEdges, documentManagerNodes } from './members/documentManager'
import { inherits, usesType } from './helpers'

/** 关联类型（Database / Editor 等）— 供类型引用边使用 */
const relatedTypes = [
  {
    id: 'type:Database',
    kind: 'type' as const,
    name: 'Database',
    fullName: 'Autodesk.AutoCAD.DatabaseServices.Database',
    namespace: 'Autodesk.AutoCAD.DatabaseServices',
    summary: 'DWG 图元数据库；所有 Entity 的读写须通过 Transaction。',
    modifiers: ['public'],
  },
  {
    id: 'type:DBObject',
    kind: 'type' as const,
    name: 'DBObject',
    fullName: 'Autodesk.AutoCAD.DatabaseServices.DBObject',
    namespace: 'Autodesk.AutoCAD.DatabaseServices',
    summary: '数据库对象的基类；Entity、SymbolTable 等均继承此类。',
    modifiers: ['public', 'abstract'],
  },
  {
    id: 'type:Editor',
    kind: 'type' as const,
    name: 'Editor',
    fullName: 'Autodesk.AutoCAD.EditorInput.Editor',
    namespace: 'Autodesk.AutoCAD.EditorInput',
    summary: '命令行与用户拾取交互入口；WriteMessage、GetPoint、SelectImplied 等。',
    modifiers: ['public'],
  },
]

const relatedEdges = [inherits('type:Database', 'type:DBObject')]

/** 为带 propertyType 的属性自动补全 usesType 边（若尚未定义） */
function withPropertyTypeEdges(nodes: ApiNode[], edges: ApiEdge[]): ApiEdge[] {
  const result = [...edges]
  const edgeKey = new Set(edges.map((e) => `${e.source}|${e.target}|${e.kind}`))
  const typeByName = new Map(
    nodes.filter((n) => n.kind === 'type' || n.kind === 'interface').map((n) => [n.name, n.id]),
  )

  for (const node of nodes) {
    if (node.kind !== 'property' || !node.propertyType) continue
    const typeName = node.propertyType.replace(/\?$/, '')
    const targetId = typeByName.get(typeName)
    if (!targetId) continue
    const key = `${node.id}|${targetId}|usesType`
    if (edgeKey.has(key)) continue
    result.push(usesType(node, targetId))
    edgeKey.add(key)
  }
  return result
}

const allNodes = [
  ...applicationNodes,
  ...documentManagerNodes,
  ...documentNodes,
  ...relatedTypes,
]

const allEdges = withPropertyTypeEdges(allNodes, [
  ...applicationEdges,
  ...documentManagerEdges,
  ...documentEdges,
  ...relatedEdges,
])

/** AutoCAD ApplicationServices 演示图 — Application / DocumentManager / Document 完整成员 */
export const demoGraph: ApiGraph = {
  sdkId: 'autocad-2021',
  displayName: 'AutoCAD .NET 2021',
  nodes: allNodes,
  edges: allEdges,
}
