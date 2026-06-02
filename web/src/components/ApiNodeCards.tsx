import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ColumnEdge } from './ColumnEdge'
import { NodeTag, DetailCard } from './cards/NodeDisplay'
import type { CardNodeData } from '../types/api'

function TagHandles({ column }: { column?: number }) {
  return (
    <>
      <Handle type="target" position={Position.Left} className="api-handle" id="in" />
      {(column === 1 || column === 3) && (
        <Handle type="source" position={Position.Right} className="api-handle" id="out" />
      )}
    </>
  )
}

function readData(data: CardNodeData) {
  return {
    node: data,
    selected: data.selected,
    column: data.column,
    typeTargetId: data.typeTargetId,
  }
}

const TagNode = memo(function TagNode({ data, selected }: NodeProps) {
  const { node, column } = readData(data as CardNodeData)
  return (
    <div className="api-node-wrap api-node-wrap--tag">
      <TagHandles column={column} />
      <NodeTag node={node} selected={selected} />
    </div>
  )
})

const DetailNode = memo(function DetailNode({
  data,
  selected,
  onNavigateToType,
}: NodeProps & { onNavigateToType?: (typeId: string) => void }) {
  const { node, typeTargetId } = readData(data as CardNodeData)
  return (
    <div className="api-node-wrap api-node-wrap--detail">
      <DetailCard
        node={node}
        selected={selected}
        typeTargetId={typeTargetId}
        onNavigateToType={onNavigateToType}
      />
    </div>
  )
})

export function createNodeTypes(onNavigateToType?: (typeId: string) => void) {
  const DetailWithNav = (props: NodeProps) => (
    <DetailNode {...props} onNavigateToType={onNavigateToType} />
  )
  return {
    typeCard: TagNode,
    methodCard: TagNode,
    propertyCard: TagNode,
    eventCard: TagNode,
    detailCard: DetailWithNav,
  }
}

export const edgeTypes = {
  column: ColumnEdge,
}
