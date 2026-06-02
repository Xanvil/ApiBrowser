import type { ApiNode } from '../../types/api'
import './cardStyles.css'

interface PropertyCardProps {
  node: ApiNode
  selected?: boolean
  expanded?: boolean
}

export function PropertyCard({ node, selected, expanded }: PropertyCardProps) {
  const tag = (
    <span className={`api-tag api-tag--property${selected ? ' selected' : ''}`}>{node.name}</span>
  )

  if (!expanded) return tag

  return (
    <div className="api-node-expanded">
      {tag}
      <div className={`api-card api-card--detail${selected ? ' selected' : ''}`}>
        <div className="api-card__header">
          <span className="api-card__badge api-card__badge--property">属性</span>
          <span className="api-card__name">{node.name}</span>
        </div>
        <div className="api-card__body">
          {node.propertyType && (
            <div className="api-card__namespace">类型 → {node.propertyType}</div>
          )}
          {node.signature && <div className="api-card__signature">{node.signature}</div>}
        </div>
      </div>
    </div>
  )
}
