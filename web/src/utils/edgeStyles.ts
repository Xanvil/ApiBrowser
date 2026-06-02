import type { ApiEdgeKind } from '../types/api'

export interface EdgeVisualStyle {
  stroke: string
  strokeDasharray?: string
  legendLabel: string
}

export const EDGE_STYLES: Record<ApiEdgeKind, EdgeVisualStyle> = {
  inherits: { stroke: '#6366f1', legendLabel: '继承' },
  implements: { stroke: '#8b5cf6', strokeDasharray: '6 3', legendLabel: '实现' },
  contains: { stroke: '#94a3b8', legendLabel: '包含' },
  usesType: { stroke: '#f59e0b', strokeDasharray: '5 4', legendLabel: '引用' },
  returns: { stroke: '#22c55e', strokeDasharray: '5 4', legendLabel: '返回' },
  parameterOf: { stroke: '#64748b', strokeDasharray: '5 4', legendLabel: '参数' },
}

export const LEGEND_EDGE_KINDS: ApiEdgeKind[] = ['contains', 'usesType', 'inherits']
