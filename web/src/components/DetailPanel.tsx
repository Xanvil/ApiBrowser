import type { ApiNode, Locale } from '../types/api'
import { getNodeSummary } from '../utils/summary'

interface DetailPanelProps {
  node: ApiNode | null
  typeTargetId?: string | null
  onNavigateToType?: (typeId: string) => void
  locale: Locale
}

const kindTitle: Record<string, string> = {
  type: '类',
  interface: '接口',
  method: '方法',
  property: '属性',
  event: '事件',
}

export function DetailPanel({ node, typeTargetId, onNavigateToType, locale }: DetailPanelProps) {
  if (!node) {
    return (
      <aside className="detail-panel detail-panel--empty">
        <h2>详情</h2>
        <p>选择左侧的类，或点击中间的属性 / 方法 / 事件查看说明。</p>
        <div className="detail-hint">
          <strong>布局</strong>
          <p>左：命名空间树 · 中：成员标签 · 右：详细信息</p>
        </div>
      </aside>
    )
  }

  const canNavigate = typeTargetId && onNavigateToType
  const summary = getNodeSummary(node, locale)

  return (
    <aside className="detail-panel">
      <div className="detail-panel__kind">{kindTitle[node.kind] ?? node.kind}</div>
      <h2 className="detail-panel__name">{node.name}</h2>
      <div className="detail-panel__fullname">{node.fullName}</div>

      {node.propertyType && (
        <section className="detail-section">
          <h3>类型</h3>
          {canNavigate ? (
            <button
              type="button"
              className="detail-type-link"
              onClick={() => onNavigateToType(typeTargetId)}
            >
              {node.propertyType}
            </button>
          ) : (
            <code>{node.propertyType}</code>
          )}
        </section>
      )}

      {node.returnType && node.returnType !== 'void' && (
        <section className="detail-section">
          <h3>返回类型</h3>
          {canNavigate ? (
            <button
              type="button"
              className="detail-type-link"
              onClick={() => onNavigateToType(typeTargetId)}
            >
              {node.returnType}
            </button>
          ) : (
            <code>{node.returnType}</code>
          )}
        </section>
      )}

      {node.namespace && (
        <section className="detail-section">
          <h3>命名空间</h3>
          <code>{node.namespace}</code>
        </section>
      )}

      {summary && (
        <section className="detail-section">
          <h3>说明</h3>
          <p>{summary}</p>
        </section>
      )}

      {node.signature && (
        <section className="detail-section">
          <h3>签名</h3>
          <pre className="detail-code">{node.signature}</pre>
        </section>
      )}

      {node.modifiers && node.modifiers.length > 0 && (
        <section className="detail-section">
          <h3>修饰符</h3>
          <div className="detail-modifiers">
            {node.modifiers.map((m) => (
              <span key={m} className="detail-modifier">
                {m}
              </span>
            ))}
          </div>
        </section>
      )}

      {node.examples && node.examples.length > 0 && (
        <section className="detail-section">
          <h3>示例</h3>
          {node.examples.map((ex, i) => (
            <pre key={i} className="detail-code detail-code--example">
              {ex}
            </pre>
          ))}
        </section>
      )}
    </aside>
  )
}
