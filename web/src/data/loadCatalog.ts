import type { ApiCatalog, ApiCatalogProduct, ApiCatalogVersion, ApiSdkRef } from '../types/product'

export async function loadCatalog(): Promise<ApiCatalog> {
  const res = await fetch('/data/catalog.json', { cache: 'no-cache' })
  if (!res.ok) throw new Error('未找到 catalog.json，请运行 npm run scan:catalog')
  return (await res.json()) as ApiCatalog
}

export function findSdk(
  catalog: ApiCatalog,
  productId: string,
  versionId: string,
): ApiSdkRef | undefined {
  const product = catalog.products.find((p) => p.id === productId)
  if (!product) return undefined
  const version = product.versions.find((v) => v.id === versionId)
  if (!version) return undefined
  return { productId, versionId, product, version }
}

export function listAvailableSdks(catalog: ApiCatalog): ApiSdkRef[] {
  const result: ApiSdkRef[] = []
  for (const product of catalog.products) {
    for (const version of product.versions) {
      if (version.status === 'available' && version.graphUrl) {
        result.push({ productId: product.id, versionId: version.id, product, version })
      }
    }
  }
  return result
}

export function getDefaultSdk(catalog: ApiCatalog): ApiSdkRef | undefined {
  const available = listAvailableSdks(catalog)
  return (
    available.find((s) => s.productId === 'autocad' && s.versionId === '2021') ?? available[0]
  )
}

export function flattenVersions(product: ApiCatalogProduct): ApiCatalogVersion[] {
  return [...product.versions].sort((a, b) =>
    b.id.localeCompare(a.id, undefined, { numeric: true }),
  )
}
