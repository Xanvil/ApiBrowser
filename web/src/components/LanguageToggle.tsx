import type { Locale } from '../types/api'

interface LanguageToggleProps {
  locale: Locale
  hasZh: boolean
  onChange: (locale: Locale) => void
}

export function LanguageToggle({ locale, hasZh, onChange }: LanguageToggleProps) {
  return (
    <div className="language-toggle" role="group" aria-label="说明语言">
      <button
        type="button"
        className={`language-toggle__btn${locale === 'zh' ? ' active' : ''}`}
        onClick={() => onChange('zh')}
        title={hasZh ? '显示中文说明' : '中文数据未加载，将回退英文'}
      >
        中文
      </button>
      <button
        type="button"
        className={`language-toggle__btn${locale === 'en' ? ' active' : ''}`}
        onClick={() => onChange('en')}
        title="显示英文说明"
      >
        EN
      </button>
    </div>
  )
}
