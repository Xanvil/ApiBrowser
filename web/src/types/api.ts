export type Locale = 'zh' | 'en'

export type ApiNodeKind =
  | 'namespace'
  | 'type'
  | 'interface'
  | 'method'
  | 'property'
  | 'event'

export type ApiEdgeKind =
  | 'inherits'
  | 'implements'
  | 'contains'
  | 'returns'
  | 'usesType'
  | 'parameterOf'

export interface ApiNode {
  id: string
  kind: ApiNodeKind
  name: string
  fullName: string
  namespace?: string
  /** 英文说明（来自 api-graph.json） */
  summary?: string
  /** 中文说明（来自 annotations.zh.json） */
  summaryZh?: string
  signature?: string
  modifiers?: string[]
  returnType?: string
  propertyType?: string
  examples?: string[]
}

export interface ApiEdge {
  id: string
  kind: ApiEdgeKind
  source: string
  target: string
  label?: string
}

export interface ApiGraph {
  sdkId: string
  displayName: string
  nodes: ApiNode[]
  edges: ApiEdge[]
  /** 是否已加载中文覆盖层 */
  hasZhAnnotations?: boolean
}

export interface AnnotationEntry {
  summary: string
  summaryEn?: string
}

export interface AnnotationsFile {
  version?: number
  entries: Record<string, AnnotationEntry>
}

export interface CardNodeData extends ApiNode {
  column?: 1 | 2 | 3 | 4
  isDetailPanel?: boolean
  selected?: boolean
  cardExpanded?: boolean
  typeTargetId?: string | null
  [key: string]: unknown
}
