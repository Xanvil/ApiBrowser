import type { AnnotationsFile } from '../types/api'

export async function loadAnnotations(url = '/data/annotations.zh.json'): Promise<AnnotationsFile | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) return null

    const raw = (await res.json()) as {
      entries?: Record<string, { summary: string; summaryEn?: string }>
      Entries?: Record<string, { summary: string; summaryEn?: string }>
    }

    const entries = raw.entries ?? raw.Entries
    if (!entries || Object.keys(entries).length === 0) return null

    return { version: 1, entries }
  } catch {
    return null
  }
}
