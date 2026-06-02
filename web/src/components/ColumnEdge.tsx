import { BaseEdge, type EdgeProps } from '@xyflow/react'
import { COL2_CENTER } from '../utils/columnLayout'

/** 连线经过第 2 列中心：源 → 列中 → 目标 */
export function ColumnEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
}: EdgeProps) {
  const midX = COL2_CENTER
  const path = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`

  return <BaseEdge path={path} style={style} markerEnd={markerEnd} interactionWidth={20} />
}
