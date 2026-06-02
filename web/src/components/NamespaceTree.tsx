import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ApiGraph, ApiNode, Locale } from '../types/api'
import { buildNamespaceTree, searchTypes } from '../utils/treeModel'
import { LanguageToggle } from './LanguageToggle'
import '../components/cards/cardStyles.css'

interface NamespaceTreeProps {
  graph: ApiGraph
  selectedTypeId: string | null
  onSelectType: (type: ApiNode) => void
  locale: Locale
  hasZh: boolean
  onLocaleChange: (locale: Locale) => void
  homePath?: string
  productTitle?: string
  productSubtitle?: string
}

export function NamespaceTree({
  graph,
  selectedTypeId,
  onSelectType,
  locale,
  hasZh,
  onLocaleChange,
  homePath = '/',
  productTitle,
  productSubtitle,
}: NamespaceTreeProps) {
  const [query, setQuery] = useState('')
  const [collapsedNs, setCollapsedNs] = useState<Set<string>>(() => new Set())

  const namespaces = useMemo(() => buildNamespaceTree(graph), [graph])
  const searchResults = useMemo(() => searchTypes(graph, query), [graph, query])

  const toggleNs = (nsId: string) => {
    setCollapsedNs((prev) => {
      const next = new Set(prev)
      if (next.has(nsId)) next.delete(nsId)
      else next.add(nsId)
      return next
    })
  }

  return (
    <aside className="tree-panel">
      <div className="tree-panel__header">
        <div className="tree-panel__header-row">
          <Link to={homePath} className="tree-panel__home" title="返回首页">
            ←
          </Link>
          <h1 className="tree-panel__title">{productTitle ?? 'API 浏览器'}</h1>
          <LanguageToggle locale={locale} hasZh={hasZh} onChange={onLocaleChange} />
        </div>
        <p className="tree-panel__subtitle">{productSubtitle ?? graph.displayName}</p>
      </div>

      <div className="tree-panel__search">
        <input
          type="search"
          className="tree-panel__input"
          placeholder="搜索类…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && searchResults.length > 0 && (
          <ul className="tree-panel__results">
            {searchResults.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`tree-item tree-item--type${selectedTypeId === t.id ? ' selected' : ''}`}
                  onClick={() => {
                    onSelectType(t)
                    setQuery('')
                  }}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <nav className="tree-panel__tree" aria-label="命名空间与类">
        {namespaces.map((ns) => {
          const collapsed = collapsedNs.has(ns.id)
          return (
            <div key={ns.id} className="tree-ns">
              <button
                type="button"
                className="tree-ns__header"
                onClick={() => toggleNs(ns.id)}
                aria-expanded={!collapsed}
              >
                <span className="tree-ns__chevron">{collapsed ? '▸' : '▾'}</span>
                <span className="tree-ns__name" title={ns.name}>
                  {ns.shortName}
                </span>
                <span className="tree-ns__count">{ns.types.length}</span>
              </button>
              {!collapsed && (
                <ul className="tree-ns__types">
                  {ns.types.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`tree-item tree-item--type${selectedTypeId === t.id ? ' selected' : ''}`}
                        onClick={() => onSelectType(t)}
                      >
                        <span className="tree-item__icon">{t.kind === 'interface' ? '◇' : '◆'}</span>
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
