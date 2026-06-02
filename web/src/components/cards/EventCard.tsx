import type { ApiNode } from '../../types/api'
import './cardStyles.css'

interface EventCardProps {
  node: ApiNode
  selected?: boolean
  expanded?: boolean
}

export function EventCard({ node, selected, expanded }: EventCardProps) {
  const tag = (
    <span className={`api-tag api-tag--event${selected ? ' selected' : ''}`}>{node.name}</span>
  )

  if (!expanded) return tag

  return (
    <div className="api-node-expanded">
      {tag}
      <div className={`api-card api-card--detail${selected ? ' selected' : ''}`}>
        <div className="api-card__header">
          <span className="api-card__badge api-card__badge--event">事件</span>
          <span className="api-card__name">{node.name}</span>
        </div>
        {node.summary && (
          <div className="api-card__body">
            <div className="api-card__summary">{node.summary}</div>
          </div>
        )}
      </div>
    </div>
  )
}
