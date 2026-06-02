import type { ApiNode } from '../../types/api'
import './cardStyles.css'

interface MethodCardProps {
  node: ApiNode
  selected?: boolean
  expanded?: boolean
}

export function MethodCard({ node, selected, expanded }: MethodCardProps) {
  const tag = (
    <span className={`api-tag api-tag--method${selected ? ' selected' : ''}`}>{node.name}</span>
  )

  if (!expanded) return tag

  return (
    <div className="api-node-expanded">
      {tag}
      <div className={`api-card api-card--detail${selected ? ' selected' : ''}`}>
        <div className="api-card__header">
          <span className="api-card__badge api-card__badge--method">方法</span>
          <span className="api-card__name">{node.name}</span>
        </div>
        <div className="api-card__body">
          {node.signature && <div className="api-card__signature">{node.signature}</div>}
          {node.returnType && (
            <div className="api-card__namespace">返回 → {node.returnType}</div>
          )}
        </div>
      </div>
    </div>
  )
}
