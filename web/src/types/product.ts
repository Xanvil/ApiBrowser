export type ApiProductStatus = 'available' | 'planned'

export interface ApiCatalogVersion {
  id: string
  displayName: string
  platform: string
  description: string
  status: ApiProductStatus
  graphUrl?: string
  annotationsUrl?: string
}

export interface ApiCatalogProduct {
  id: string
  name: string
  vendor: string
  accent: string
  description: string
  versions: ApiCatalogVersion[]
}

export interface ApiCatalog {
  generatedAt: string
  products: ApiCatalogProduct[]
}

/** 扁平 SDK 标识，便于路由与查找。 */
export interface ApiSdkRef {
  productId: string
  versionId: string
  product: ApiCatalogProduct
  version: ApiCatalogVersion
}
