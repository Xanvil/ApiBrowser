import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { findSdk, getDefaultSdk, loadCatalog } from '../data/loadCatalog'
import { findDefaultTypeId, loadApiGraphForSdk } from '../data/loadGraph'
import { NamespaceTree } from '../components/NamespaceTree'
import { MemberGrid } from '../components/MemberGrid'
import { DetailPanel } from '../components/DetailPanel'
import { getReferencedTypeId } from '../utils/visibleGraph'
import { findNode, getTypeMembers, resolveSelectionFromFullName } from '../utils/treeModel'
import { HOME_PATH, legacySdkRedirectPath, sdkBrowsePath } from '../utils/apiRoutes'
import type { ApiGraph, ApiNode, Locale } from '../types/api'
import type { ApiCatalog, ApiSdkRef } from '../types/product'
import '../App.css'

const LOCALE_KEY = 'api-browser-locale'

function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_KEY)
    if (v === 'zh' || v === 'en') return v
  } catch {
    // ignore
  }
  return 'zh'
}

export function ApiBrowserPage() {
  const { productId = '', versionId = '' } = useParams<{ productId: string; versionId: string }>()
  const [catalog, setCatalog] = useState<ApiCatalog | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const sdk = useMemo(
    () => (catalog ? findSdk(catalog, productId, versionId) : undefined),
    [catalog, productId, versionId],
  )

  const [graph, setGraph] = useState<ApiGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const [locale, setLocale] = useState<Locale>(readStoredLocale)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const fqn = searchParams.get('fqn')

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch((err: unknown) => {
        setCatalogError(err instanceof Error ? err.message : '加载目录失败')
      })
  }, [])

  useEffect(() => {
    if (!sdk || sdk.version.status !== 'available' || !sdk.version.graphUrl) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)

    loadApiGraphForSdk(sdk)
      .then((loaded) => {
        if (!cancelled) setGraph(loaded)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sdk])

  useEffect(() => {
    if (!graph) return

    if (fqn) {
      const selection = resolveSelectionFromFullName(graph, fqn)
      if (selection) {
        setSelectedTypeId(selection.typeId)
        setSelectedMemberId(selection.memberId)
        return
      }
    }

    setSelectedTypeId(findDefaultTypeId(graph))
    setSelectedMemberId(null)
  }, [graph, fqn])

  const syncUrl = useCallback(
    (typeId: string | null, memberId: string | null) => {
      if (!graph || !typeId) return
      const node = memberId ? findNode(graph, memberId) : findNode(graph, typeId)
      if (!node) return
      const params = new URLSearchParams({ fqn: node.fullName })
      const next = params.toString()
      if (next !== searchParams.toString()) {
        setSearchParams(params, { replace: true })
      }
    },
    [graph, searchParams, setSearchParams],
  )

  const handleLocaleChange = useCallback((next: Locale) => {
    setLocale(next)
    try {
      localStorage.setItem(LOCALE_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  const selectedType = useMemo(
    () => (graph && selectedTypeId ? findNode(graph, selectedTypeId) ?? null : null),
    [graph, selectedTypeId],
  )

  const members = useMemo(
    () =>
      graph && selectedTypeId
        ? getTypeMembers(graph, selectedTypeId)
        : { properties: [], methods: [], events: [] },
    [graph, selectedTypeId],
  )

  const detailNode = useMemo(() => {
    if (!graph) return null
    if (selectedMemberId) return findNode(graph, selectedMemberId) ?? null
    return selectedType
  }, [graph, selectedMemberId, selectedType])

  const typeTargetId = graph && detailNode ? getReferencedTypeId(graph, detailNode.id) : null

  const handleSelectType = useCallback(
    (type: ApiNode) => {
      setSelectedTypeId(type.id)
      setSelectedMemberId(null)
      syncUrl(type.id, null)
    },
    [syncUrl],
  )

  const handleSelectMember = useCallback(
    (member: ApiNode) => {
      setSelectedMemberId(member.id)
      if (selectedTypeId) syncUrl(selectedTypeId, member.id)
    },
    [selectedTypeId, syncUrl],
  )

  const handleNavigateToType = useCallback(
    (typeId: string) => {
      if (!graph) return
      const target = findNode(graph, typeId)
      if (!target) return
      setSelectedTypeId(typeId)
      setSelectedMemberId(null)
      syncUrl(typeId, null)
    },
    [graph, syncUrl],
  )

  if (catalogError) {
    return (
      <div className="app-shell app-shell--loading">
        <p>{catalogError}</p>
        <Link to={HOME_PATH}>返回首页</Link>
      </div>
    )
  }

  if (!catalog) {
    return (
      <div className="app-shell app-shell--loading">
        <p>正在加载目录…</p>
      </div>
    )
  }

  if (!sdk) {
    return (
      <div className="app-shell app-shell--loading">
        <p>
          未找到 {productId}/{versionId}
        </p>
        <Link to={HOME_PATH}>返回首页</Link>
      </div>
    )
  }

  if (sdk.version.status !== 'available') {
    return (
      <div className="app-shell app-shell--loading">
        <p>{sdk.version.displayName} 尚未上线。</p>
        <Link to={HOME_PATH}>返回首页</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app-shell app-shell--loading">
        <p>正在加载 {sdk.version.displayName}…</p>
      </div>
    )
  }

  if (loadError || !graph) {
    return (
      <div className="app-shell app-shell--loading">
        <p>加载失败：{loadError ?? '未知错误'}</p>
        <Link to={HOME_PATH}>返回首页</Link>
      </div>
    )
  }

  return (
    <ProductBrowser
      sdk={sdk}
      graph={graph}
      locale={locale}
      onLocaleChange={handleLocaleChange}
      selectedTypeId={selectedTypeId}
      selectedType={selectedType}
      members={members}
      selectedMemberId={selectedMemberId}
      detailNode={detailNode}
      typeTargetId={typeTargetId}
      onSelectType={handleSelectType}
      onSelectMember={handleSelectMember}
      onNavigateToType={handleNavigateToType}
    />
  )
}

function ProductBrowser({
  sdk,
  graph,
  locale,
  onLocaleChange,
  selectedTypeId,
  selectedType,
  members,
  selectedMemberId,
  detailNode,
  typeTargetId,
  onSelectType,
  onSelectMember,
  onNavigateToType,
}: {
  sdk: ApiSdkRef
  graph: ApiGraph
  locale: Locale
  onLocaleChange: (l: Locale) => void
  selectedTypeId: string | null
  selectedType: ApiNode | null
  members: ReturnType<typeof getTypeMembers>
  selectedMemberId: string | null
  detailNode: ApiNode | null
  typeTargetId: string | null
  onSelectType: (t: ApiNode) => void
  onSelectMember: (m: ApiNode) => void
  onNavigateToType: (id: string) => void
}) {
  return (
    <div className="app-shell">
      <NamespaceTree
        graph={graph}
        selectedTypeId={selectedTypeId}
        onSelectType={onSelectType}
        locale={locale}
        hasZh={!!graph.hasZhAnnotations}
        onLocaleChange={onLocaleChange}
        homePath={HOME_PATH}
        productTitle={sdk.product.name}
        productSubtitle={`${sdk.version.displayName} · v${sdk.versionId}`}
      />

      <MemberGrid
        typeNode={selectedType}
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={onSelectMember}
        locale={locale}
      />

      <DetailPanel
        node={detailNode}
        typeTargetId={typeTargetId}
        onNavigateToType={onNavigateToType}
        locale={locale}
      />
    </div>
  )
}

/** 旧路径 /browse → 默认 SDK */
export function LegacyBrowseRedirect() {
  const [searchParams] = useSearchParams()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    loadCatalog()
      .then((catalog) => {
        const def = getDefaultSdk(catalog)
        if (!def) {
          setTarget(HOME_PATH)
          return
        }
        const qs = searchParams.toString()
        setTarget(`${sdkBrowsePath(def.productId, def.versionId)}${qs ? `?${qs}` : ''}`)
      })
      .catch(() => setTarget(HOME_PATH))
  }, [searchParams])

  if (!target) {
    return (
      <div className="app-shell app-shell--loading">
        <p>正在跳转…</p>
      </div>
    )
  }

  return <Navigate to={target} replace />
}

/** 旧路径 /sdk/autocad-2021/browse → /sdk/autocad/2021/browse */
export function LegacySdkRedirect() {
  const { sdkId = '' } = useParams<{ sdkId: string }>()
  const [searchParams] = useSearchParams()
  const qs = searchParams.toString()
  const target = legacySdkRedirectPath(sdkId, qs)
  if (!target) return <Navigate to={HOME_PATH} replace />
  return <Navigate to={target} replace />
}
