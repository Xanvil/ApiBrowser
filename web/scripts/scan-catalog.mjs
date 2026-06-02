/**
 * 扫描 public/data/{product}/{version}/ 目录，生成 catalog.json。
 *
 * 约定：
 *   data/{product}/product.json     — 可选，产品元数据
 *   data/{product}/{version}/meta.json — 可选，版本元数据
 *   data/{product}/{version}/api-graph.json — 有则 status=available
 *   data/{product}/{version}/annotations.zh.json — 可选中文覆盖层
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '../public/data')

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function titleCase(id) {
  return id
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function scanVersion(productId, versionId) {
  const versionDir = path.join(dataDir, productId, versionId)
  const graphFile = path.join(versionDir, 'api-graph.json')
  const meta = readJson(path.join(versionDir, 'meta.json')) ?? {}
  const hasGraph = fs.existsSync(graphFile)

  if (!hasGraph && meta.status !== 'planned') return null

  const annotationsFile = path.join(versionDir, 'annotations.zh.json')
  const urlBase = `/data/${productId}/${versionId}`

  return {
    id: versionId,
    displayName: meta.displayName ?? `${titleCase(productId)} ${versionId}`,
    platform: meta.platform ?? '',
    description: meta.description ?? '',
    status: hasGraph ? 'available' : 'planned',
    graphUrl: hasGraph ? `${urlBase}/api-graph.json` : undefined,
    annotationsUrl: fs.existsSync(annotationsFile) ? `${urlBase}/annotations.zh.json` : undefined,
  }
}

function scanProduct(productId) {
  const productDir = path.join(dataDir, productId)
  const productMeta = readJson(path.join(productDir, 'product.json')) ?? {}

  const versions = []
  for (const entry of fs.readdirSync(productDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const version = scanVersion(productId, entry.name)
    if (version) versions.push(version)
  }

  if (versions.length === 0) return null

  versions.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))

  return {
    id: productId,
    name: productMeta.name ?? titleCase(productId),
    vendor: productMeta.vendor ?? '',
    accent: productMeta.accent ?? '#2563eb',
    description: productMeta.description ?? '',
    versions,
  }
}

function scanLegacyRoot() {
  const legacyGraph = path.join(dataDir, 'api-graph.json')
  if (!fs.existsSync(legacyGraph)) return null

  console.warn(
    '[scan-catalog] 检测到旧版 data/api-graph.json，请迁移到 data/{product}/{version}/',
  )

  const annotationsFile = path.join(dataDir, 'annotations.zh.json')
  return {
    id: 'autocad',
    name: 'AutoCAD',
    vendor: 'Autodesk',
    accent: '#c8102e',
    description: '（旧版根目录数据，建议迁移到 data/autocad/2021/）',
    versions: [
      {
        id: '2021',
        displayName: 'AutoCAD .NET 2021',
        platform: '.NET',
        description: '',
        status: 'available',
        graphUrl: '/data/api-graph.json',
        annotationsUrl: fs.existsSync(annotationsFile) ? '/data/annotations.zh.json' : undefined,
      },
    ],
  }
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const products = []

for (const entry of fs.readdirSync(dataDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  if (entry.name.startsWith('.')) continue
  const product = scanProduct(entry.name)
  if (product) products.push(product)
}

if (products.length === 0) {
  const legacy = scanLegacyRoot()
  if (legacy) products.push(legacy)
}

products.sort((a, b) => a.name.localeCompare(b.name))

const catalog = {
  generatedAt: new Date().toISOString(),
  products,
}

const outPath = path.join(dataDir, 'catalog.json')
fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2), 'utf8')

const versionCount = products.reduce((n, p) => n + p.versions.length, 0)
console.log(`[scan-catalog] ${outPath}`)
console.log(`[scan-catalog] ${products.length} 产品, ${versionCount} 版本`)
