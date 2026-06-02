import type { ApiGraph } from '../types/api'
import type { ApiSdkRef } from '../types/product'
import { demoGraph } from './demoGraph'
import { loadAnnotations } from './loadAnnotations'

function applyAnnotations(graph: ApiGraph, entries: Record<string, { summary: string }>) {
  let applied = 0
  for (const node of graph.nodes) {
    const entry = entries[node.fullName]
    if (entry?.summary) {
      node.summaryZh = entry.summary
      applied++
    }
  }
  graph.hasZhAnnotations = applied > 0
}

/** 按 catalog 中的 SDK 条目加载 API 图。 */
export async function loadApiGraphForSdk(sdk: ApiSdkRef): Promise<ApiGraph> {
  const graphUrl = sdk.version.graphUrl
  if (!graphUrl) throw new Error(`版本 ${sdk.productId}/${sdk.versionId} 无 api-graph.json`)

  try {
    const annotationsUrl = sdk.version.annotationsUrl
    const [graphRes, annotations] = await Promise.all([
      fetch(graphUrl, { cache: 'no-cache' }),
      annotationsUrl ? loadAnnotations(annotationsUrl) : Promise.resolve(null),
    ])

    const fallback = {
      ...demoGraph,
      sdkId: `${sdk.productId}-${sdk.versionId}`,
      displayName: sdk.version.displayName,
    }

    if (!graphRes.ok) return fallback
    const graph = (await graphRes.json()) as ApiGraph
    if (!graph.nodes?.length) return fallback

    graph.sdkId = `${sdk.productId}-${sdk.versionId}`
    graph.displayName = sdk.version.displayName

    if (annotations?.entries) applyAnnotations(graph, annotations.entries)
    return graph
  } catch {
    return {
      ...demoGraph,
      sdkId: `${sdk.productId}-${sdk.versionId}`,
      displayName: sdk.version.displayName,
    }
  }
}

export function findDefaultTypeId(graph: ApiGraph): string | null {
  const preferred = graph.nodes.find(
    (n) =>
      (n.kind === 'type' || n.kind === 'interface') &&
      n.name === 'Application' &&
      n.namespace?.includes('ApplicationServices'),
  )
  if (preferred) return preferred.id

  const first = graph.nodes.find((n) => n.kind === 'type' || n.kind === 'interface')
  return first?.id ?? null
}
