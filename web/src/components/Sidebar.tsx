import { useMemo, useState } from 'react'
import type { ApiGraph, ApiNode } from '../types/api'
import { searchNodes } from '../utils/visibleGraph'

interface SidebarProps {
  graph: ApiGraph
  activeNamespace: string | null
  visibleNodeCount: number
  visibleEdgeCount: number
  onResetView: () => void
  onNamespaceChange: (ns: string | null) => void
  onSearchSelect: (node: ApiNode) => void
}

export function Sidebar({
  graph,
  activeNamespace,
  visibleNodeCount,
  visibleEdgeCount,
  onResetView,
  onNamespaceChange,
  onSearchSelect,
}: SidebarProps) {
  const [query, setQuery] = useState('')

  const namespaces = useMemo(() => {
    const set = new Set<string>()
    graph.nodes.forEach((n) => {
      if (n.namespace) set.add(n.namespace)
    })
    return Array.from(set).sort()
  }, [graph.nodes])

  const searchResults = useMemo(() => searchNodes(graph, query), [graph, query])

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h1 className="sidebar__title">API 浏览器</h1>
        <p className="sidebar__subtitle">{graph.displayName}</p>
      </div>

      <div className="sidebar__search">
        <input
          type="search"
          placeholder="搜索类、方法、属性…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sidebar__input"
        />
        {query && searchResults.length > 0 && (
          <ul className="sidebar__results">
            {searchResults.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="sidebar__result-btn"
                  onClick={() => {
                    onSearchSelect(n)
                    setQuery('')
                  }}
                >
                  <span className="sidebar__result-kind">{n.kind}</span>
                  {n.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <nav className="sidebar__nav">
        <h2>命名空间</h2>
        <button
          type="button"
          className={`sidebar__ns-btn${activeNamespace === null ? ' active' : ''}`}
          onClick={() => onNamespaceChange(null)}
        >
          全部（演示）
        </button>
        {namespaces.map((ns) => (
          <button
            key={ns}
            type="button"
            className={`sidebar__ns-btn${activeNamespace === ns ? ' active' : ''}`}
            onClick={() => onNamespaceChange(ns)}
          >
            {ns.replace('Autodesk.AutoCAD.', '')}
          </button>
        ))}
      </nav>

      <div className="sidebar__actions">
        <button type="button" className="sidebar__reset-btn" onClick={onResetView}>
          重置视图
        </button>
      </div>

      <div className="sidebar__stats">
        <span>可见 {visibleNodeCount} / {graph.nodes.length} 节点</span>
        <span>{visibleEdgeCount} 关系</span>
      </div>
    </aside>
  )
}
