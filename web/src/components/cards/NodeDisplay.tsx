import type { ApiNode } from '../../types/api'
import './cardStyles.css'

const kindLabel: Record<string, string> = {
  type: '类',
  interface: '接口',
  method: '方法',
  property: '属性',
  event: '事件',
}

interface NodeTagProps {
  node: ApiNode
  selected?: boolean
}

export function NodeTag({ node, selected }: NodeTagProps) {
  const kindClass =
    node.kind === 'interface'
      ? 'interface'
      : node.kind === 'method'
        ? 'method'
        : node.kind === 'property'
          ? 'property'
          : node.kind === 'event'
            ? 'event'
            : 'type'

  return (
    <span className={`api-tag api-tag--${kindClass}${selected ? ' selected' : ''}`}>
      {node.name}
    </span>
  )
}

interface TypeLinkProps {
  label: string
  typeName: string
  onNavigate?: () => void
}

function TypeLink({ label, typeName, onNavigate }: TypeLinkProps) {
  if (!onNavigate) {
    return (
      <div className="api-card__namespace">
        {label} → {typeName}
      </div>
    )
  }
  return (
    <button type="button" className="api-type-link" onClick={onNavigate}>
      {label} → <span className="api-type-link__name">{typeName}</span>
    </button>
  )
}

interface DetailCardProps {
  node: ApiNode
  selected?: boolean
  typeTargetId?: string | null
  onNavigateToType?: (typeId: string) => void
}

export function DetailCard({ node, selected, typeTargetId, onNavigateToType }: DetailCardProps) {
  const badgeClass =
    node.kind === 'interface'
      ? 'api-card__badge--interface'
      : node.kind === 'method'
        ? 'api-card__badge--method'
        : node.kind === 'property'
          ? 'api-card__badge--property'
          : node.kind === 'event'
            ? 'api-card__badge--event'
            : 'api-card__badge--type'

  const navigate =
    typeTargetId && onNavigateToType ? () => onNavigateToType(typeTargetId) : undefined

  return (
    <div className={`api-card api-card--detail${selected ? ' selected' : ''}`}>
      <div className="api-card__header">
        <span className={`api-card__badge ${badgeClass}`}>{kindLabel[node.kind] ?? node.kind}</span>
        <span className="api-card__name">{node.name}</span>
      </div>
      <div className="api-card__body">
        {node.namespace && <div className="api-card__namespace">{node.namespace}</div>}
        {node.summary && <div className="api-card__summary">{node.summary}</div>}
        {node.signature && <div className="api-card__signature">{node.signature}</div>}
        {node.propertyType && (
          <TypeLink
            label="类型"
            typeName={node.propertyType}
            onNavigate={node.kind === 'property' ? navigate : undefined}
          />
        )}
        {node.returnType && node.returnType !== 'void' && (
          <TypeLink
            label="返回"
            typeName={node.returnType}
            onNavigate={node.kind === 'method' ? navigate : undefined}
          />
        )}
        {node.modifiers && node.modifiers.length > 0 && (
          <div className="api-card__modifiers">
            {node.modifiers.map((m) => (
              <span key={m} className="api-card__modifier">
                {m}
              </span>
            ))}
          </div>
        )}
        {node.examples?.map((ex, i) => (
          <pre key={i} className="api-card__example">
            {ex}
          </pre>
        ))}
      </div>
    </div>
  )
}
