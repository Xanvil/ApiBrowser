import { useState } from 'react'
import type { ApiNode, Locale } from '../types/api'
import type { TypeMembers } from '../utils/treeModel'
import { getNodeSummary } from '../utils/summary'
import { NodeTag } from './cards/NodeDisplay'
import './cards/cardStyles.css'

export type MemberViewMode = 'grid' | 'list'
export type MemberSectionKey = 'properties' | 'methods' | 'events'
export type MemberListDetail = 'compact' | 'detailed'

interface MemberGridProps {
  typeNode: ApiNode | null
  members: TypeMembers
  selectedMemberId: string | null
  onSelectMember: (member: ApiNode) => void
  locale: Locale
}

interface MemberSectionProps {
  sectionKey: MemberSectionKey
  title: string
  items: ApiNode[]
  selectedId: string | null
  onSelect: (m: ApiNode) => void
  layout: MemberViewMode
  listDetail: MemberListDetail
  onListDetailChange: (key: MemberSectionKey, detail: MemberListDetail) => void
}

function memberKindClass(kind: ApiNode['kind']) {
  if (kind === 'interface') return 'interface'
  if (kind === 'method') return 'method'
  if (kind === 'property') return 'property'
  if (kind === 'event') return 'event'
  return 'type'
}

function MemberListRow({
  node,
  selected,
  detail,
  locale,
}: {
  node: ApiNode
  selected?: boolean
  detail: MemberListDetail
  locale: Locale
}) {
  const kindClass = memberKindClass(node.kind)
  const summary = getNodeSummary(node, locale)
  const title = [node.name, node.modifiers?.join(' '), summary].filter(Boolean).join(' · ')

  const modifiers =
    node.modifiers && node.modifiers.length > 0 ? (
      <span className="member-list-row__mods">
        {node.modifiers.map((m) => (
          <span key={m} className="member-list-row__mod">
            {m}
          </span>
        ))}
      </span>
    ) : null

  const propertyType =
    node.kind === 'property' && node.propertyType ? (
      <code className="member-list-row__type">{node.propertyType}</code>
    ) : null

  const returnType =
    node.kind === 'method' && node.returnType ? (
      <code className="member-list-row__type">{node.returnType}</code>
    ) : null

  const eventSig =
    node.kind === 'event' && node.signature ? (
      <code className="member-list-row__sig">{node.signature}</code>
    ) : null

  const mainLine = (
    <>
      <span className="member-list-row__name">{node.name}</span>
      {modifiers}

      {node.kind === 'property' && node.propertyType && (
        <>
          <span className="member-list-row__sep">·</span>
          {propertyType}
        </>
      )}

      {node.kind === 'method' && node.returnType && (
        <>
          <span className="member-list-row__sep">→</span>
          {returnType}
        </>
      )}

      {node.kind === 'event' && node.signature && (
        <>
          <span className="member-list-row__sep">·</span>
          {eventSig}
        </>
      )}
    </>
  )

  if (detail === 'detailed') {
    return (
      <div
        className={`member-list-row member-list-row--${kindClass} member-list-row--detailed${selected ? ' selected' : ''}`}
        title={title}
      >
        <div className="member-list-row__line1">{mainLine}</div>
        {summary && <p className="member-list-row__summary">{summary}</p>}
      </div>
    )
  }

  return (
    <div
      className={`member-list-row member-list-row--${kindClass} member-list-row--compact${selected ? ' selected' : ''}`}
      title={title}
    >
      {mainLine}
    </div>
  )
}

function MemberTagList({
  items,
  selectedId,
  onSelect,
  layout,
  listDetail,
  locale,
}: {
  items: ApiNode[]
  selectedId: string | null
  onSelect: (m: ApiNode) => void
  layout: MemberViewMode
  listDetail: MemberListDetail
  locale: Locale
}) {
  if (layout === 'list') {
    return (
      <div className="member-section__tags member-section__tags--list">
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`member-list-btn${selectedId === m.id ? ' selected' : ''}`}
            onClick={() => onSelect(m)}
          >
            <MemberListRow node={m} selected={selectedId === m.id} detail={listDetail} locale={locale} />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="member-section__tags member-section__tags--grid">
      {items.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`member-tag-btn${selectedId === m.id ? ' selected' : ''}`}
          onClick={() => onSelect(m)}
        >
          <NodeTag node={m} selected={selectedId === m.id} />
        </button>
      ))}
    </div>
  )
}

function DetailToggle({
  mode,
  onChange,
}: {
  mode: MemberListDetail
  onChange: (mode: MemberListDetail) => void
}) {
  return (
    <div className="member-detail-toggle" role="group" aria-label="列详细程度">
      <button
        type="button"
        className={`member-detail-toggle__btn${mode === 'compact' ? ' active' : ''}`}
        onClick={() => onChange('compact')}
        title="单行：仅显示成员信息"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <rect x="2" y="6" width="12" height="3" rx="1" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className={`member-detail-toggle__btn${mode === 'detailed' ? ' active' : ''}`}
        onClick={() => onChange('detailed')}
        title="双行：额外显示说明"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <rect x="2" y="3" width="12" height="3" rx="1" fill="currentColor" />
          <rect x="2" y="10" width="12" height="3" rx="1" fill="currentColor" />
        </svg>
      </button>
    </div>
  )
}

function MemberSection({
  sectionKey,
  title,
  items,
  selectedId,
  onSelect,
  layout,
  listDetail,
  onListDetailChange,
  locale,
}: MemberSectionProps & { locale: Locale }) {
  if (items.length === 0) return null

  return (
    <section className="member-section">
      <div className="member-section__header">
        <h3 className="member-section__title">
          {title}
          <span className="member-section__count">{items.length}</span>
        </h3>
        {layout === 'list' && (
          <DetailToggle
            mode={listDetail}
            onChange={(detail) => onListDetailChange(sectionKey, detail)}
          />
        )}
      </div>
      <MemberTagList
        items={items}
        selectedId={selectedId}
        onSelect={onSelect}
        layout={layout}
        listDetail={listDetail}
        locale={locale}
      />
    </section>
  )
}

function ViewToggle({
  mode,
  onChange,
}: {
  mode: MemberViewMode
  onChange: (mode: MemberViewMode) => void
}) {
  return (
    <div className="member-view-toggle" role="group" aria-label="成员视图">
      <button
        type="button"
        className={`member-view-toggle__btn${mode === 'grid' ? ' active' : ''}`}
        onClick={() => onChange('grid')}
        title="网格：标签从左到右换行"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" />
          <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" />
          <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" />
          <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
        </svg>
        <span>网格</span>
      </button>
      <button
        type="button"
        className={`member-view-toggle__btn${mode === 'list' ? ' active' : ''}`}
        onClick={() => onChange('list')}
        title="列：每行显示类型、返回值等详情"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <rect x="4" y="1" width="8" height="3" rx="1" fill="currentColor" />
          <rect x="4" y="6" width="8" height="3" rx="1" fill="currentColor" />
          <rect x="4" y="11" width="8" height="3" rx="1" fill="currentColor" />
        </svg>
        <span>列</span>
      </button>
    </div>
  )
}

export function MemberGrid({
  typeNode,
  members,
  selectedMemberId,
  onSelectMember,
  locale,
}: MemberGridProps) {
  const [viewMode, setViewMode] = useState<MemberViewMode>('grid')
  const [sectionDetails, setSectionDetails] = useState<Record<MemberSectionKey, MemberListDetail>>({
    properties: 'compact',
    methods: 'compact',
    events: 'compact',
  })

  const handleListDetailChange = (key: MemberSectionKey, detail: MemberListDetail) => {
    setSectionDetails((prev) => ({ ...prev, [key]: detail }))
  }

  if (!typeNode) {
    return (
      <main className="member-panel member-panel--empty">
        <p>请在左侧选择类或接口，查看其成员。</p>
      </main>
    )
  }

  const total =
    members.properties.length + members.methods.length + members.events.length

  const sections: { key: MemberSectionKey; title: string; items: ApiNode[] }[] = [
    { key: 'properties', title: '属性', items: members.properties },
    { key: 'methods', title: '方法', items: members.methods },
    { key: 'events', title: '事件', items: members.events },
  ]

  return (
    <main className="member-panel">
      <header className="member-panel__header">
        <div className="member-panel__header-row">
          <h2 className="member-panel__type">{typeNode.name}</h2>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
        {typeNode.namespace && (
          <p className="member-panel__ns">{typeNode.namespace}</p>
        )}
        <p className="member-panel__stats">
          {members.properties.length} 属性 · {members.methods.length} 方法 ·{' '}
          {members.events.length} 事件
        </p>
      </header>

      {total === 0 ? (
        <p className="member-panel__empty">此类暂无成员数据。</p>
      ) : (
        <div className="member-panel__scroll">
          {sections.map((s) => (
            <MemberSection
              key={s.key}
              sectionKey={s.key}
              title={s.title}
              items={s.items}
              selectedId={selectedMemberId}
              onSelect={onSelectMember}
              layout={viewMode}
              listDetail={sectionDetails[s.key]}
              onListDetailChange={handleListDetailChange}
              locale={locale}
            />
          ))}
        </div>
      )}
    </main>
  )
}
