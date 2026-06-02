export const HOME_PATH = '/'

/** 某产品某版本的 API 浏览页。 */
export function sdkBrowsePath(productId: string, versionId: string): string {
  return `/sdk/${productId}/${versionId}/browse`
}

/** 深链接：直达具体 API 成员。 */
export function browseUrl(productId: string, versionId: string, fullName: string): string {
  return `${sdkBrowsePath(productId, versionId)}?${new URLSearchParams({ fqn: fullName }).toString()}`
}

export const LEGACY_BROWSE_PATH = '/browse'

/** 旧单段 SDK id（autocad-2021）→ 新路径 */
export function legacySdkRedirectPath(legacySdkId: string, query: string): string | null {
  const match = legacySdkId.match(/^(.+)-(\d{4})$/)
  if (!match) return null
  return `${sdkBrowsePath(match[1], match[2])}${query ? `?${query}` : ''}`
}
