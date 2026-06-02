import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { flattenVersions, loadCatalog } from '../data/loadCatalog'
import { sdkBrowsePath } from '../utils/apiRoutes'
import type { ApiCatalog, ApiCatalogProduct } from '../types/product'
import '../App.css'

function ProductCard({ product }: { product: ApiCatalogProduct }) {
  const versions = flattenVersions(product)
  const available = versions.filter((v) => v.status === 'available')
  const planned = versions.filter((v) => v.status === 'planned')

  return (
    <article
      className="product-card product-card--hub"
      style={{ '--product-accent': product.accent } as CSSProperties}
    >
      <h3 className="product-card__name">{product.name}</h3>
      {product.vendor && <p className="product-card__vendor">{product.vendor}</p>}
      {product.description && <p className="product-card__desc">{product.description}</p>}

      {available.length > 0 && (
        <ul className="product-versions">
          {available.map((v) => (
            <li key={v.id}>
              <Link to={sdkBrowsePath(product.id, v.id)} className="product-version product-version--available">
                <span className="product-version__label">{v.displayName}</span>
                <span className="product-version__meta">
                  {[v.platform, `v${v.id}`].filter(Boolean).join(' · ')}
                </span>
                <span className="product-version__action">进入 →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {planned.length > 0 && (
        <ul className="product-versions product-versions--planned">
          {planned.map((v) => (
            <li key={v.id}>
              <div className="product-version product-version--planned">
                <span className="product-version__label">{v.displayName}</span>
                <span className="product-version__meta">
                  {[v.platform, `v${v.id}`, '规划中'].filter(Boolean).join(' · ')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export function HomePage() {
  const [catalog, setCatalog] = useState<ApiCatalog | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '加载目录失败')
      })
  }, [])

  if (error) {
    return (
      <div className="home-page home-page--loading">
        <p>{error}</p>
        <p className="home-page__hint">在 web 目录运行：<code>npm run scan:catalog</code></p>
      </div>
    )
  }

  if (!catalog) {
    return (
      <div className="home-page home-page--loading">
        <p>正在扫描 API 目录…</p>
      </div>
    )
  }

  if (catalog.products.length === 0) {
    return (
      <div className="home-page home-page--loading">
        <p>未找到 API 数据。</p>
        <p className="home-page__hint">
          请将数据放入 <code>public/data/&#123;产品&#125;/&#123;版本&#125;/api-graph.json</code> 后运行{' '}
          <code>npm run scan:catalog</code>
        </p>
      </div>
    )
  }

  return (
    <div className="home-page">
      <header className="home-hero home-hero--hub">
        <div className="home-hero__inner home-hero__inner--wide">
          <h1 className="home-hero__title">API 文档中心</h1>
          <p className="home-hero__desc">
            自动扫描 <code>public/data/</code> 下的产品与版本目录。选择版本进入 API 浏览器。
          </p>
          <p className="home-hero__stats">
            {catalog.products.length} 产品 ·{' '}
            {catalog.products.reduce((n, p) => n + p.versions.length, 0)} 版本 · 更新于{' '}
            {new Date(catalog.generatedAt).toLocaleString()}
          </p>
        </div>
      </header>

      <section className="home-section home-section--wide">
        <div className="product-grid">
          {catalog.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}
