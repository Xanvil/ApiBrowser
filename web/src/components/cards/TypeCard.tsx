import type { ApiNode } from '../../types/api'
import './cardStyles.css'

const kindLabel: Record<string, string> = {
  type: '类',
  interface: '接口',
}

interface TypeCardProps {
  node: ApiNode
  selected?: boolean
  expanded?: boolean
}

export function TypeCard({ node, selected, expanded }: TypeCardProps) {
  const tagKind = node.kind === 'interface' ? 'interface' : 'type'
  const tag = (
    <span className={`api-tag api-tag--${tagKind}${selected ? ' selected' : ''}`}>{node.name}</span>
  )

  if (!expanded) return tag

  const badgeClass =
    node.kind === 'interface' ? 'api-card__badge--interface' : 'api-card__badge--type'

  return (
    <div className="api-node-expanded">
      {tag}
      <div className={`api-card api-card--detail${selected ? ' selected' : ''}`}>
        <div className="api-card__header">
          <span className={`api-card__badge ${badgeClass}`}>{kindLabel[node.kind] ?? '类型'}</span>
          <span className="api-card__name">{node.name}</span>
        </div>
        <div className="api-card__body">
          {node.namespace && <div className="api-card__namespace">{node.namespace}</div>}
          {node.summary && <div className="api-card__summary">{node.summary}</div>}
          {node.modifiers && node.modifiers.length > 0 && (
            <div className="api-card__modifiers">
              {node.modifiers.map((m) => (
                <span key={m} className="api-card__modifier">
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
