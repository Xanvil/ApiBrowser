import type { ApiNode, Locale } from '../types/api'

/** 按当前语言返回节点说明；中文缺失时回退英文。 */
export function getNodeSummary(node: ApiNode, locale: Locale): string | undefined {
  if (locale === 'zh') return node.summaryZh ?? node.summary
  return node.summary ?? node.summaryZh
}
