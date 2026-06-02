import { useEffect } from 'react'
import type { Locale } from '../types/api'

export const LOCALE_KEY = 'api-browser-locale'

export function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_KEY)
    if (v === 'zh' || v === 'en') return v
  } catch {
    // ignore
  }
  return 'zh'
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // ignore
  }
}

/** 将应用 locale 映射到 HTML lang（供浏览器、读屏、SEO 使用）。 */
export function localeToHtmlLang(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en'
}

export function applyDocumentLang(locale: Locale): void {
  document.documentElement.lang = localeToHtmlLang(locale)
}

/** 随 locale 变化同步更新 <html lang>。 */
export function useSyncDocumentLang(locale: Locale): void {
  useEffect(() => {
    applyDocumentLang(locale)
  }, [locale])
}
