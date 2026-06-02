# ApiBrowser

多产品 API 文档浏览器（Vite + React）。数据按 **产品 / 版本** 分目录存放，启动时自动扫描生成目录索引。

## 数据目录约定

```
web/public/data/
  catalog.json              ← npm run scan:catalog 自动生成
  autocad/
    product.json            ← 可选：产品名、厂商、主题色
    2021/
      meta.json             ← 可选：版本显示名、平台、描述
      api-graph.json        ← 有则「可用」
      annotations.zh.json   ← 可选：中文覆盖层
    2024/                   ← 新版本：再加子目录即可
      meta.json
      api-graph.json
  coreldraw/
    product.json
    2024/
      meta.json             ← status: "planned" 且无 api-graph → 显示「规划中」
```

扫描目录索引：`dotnet run --project ApiExtractor -- scan-catalog`（extract / translate 完成后也会自动刷新）

浏览路径：`/sdk/{产品}/{版本}/browse`（例 `/sdk/autocad/2021/browse`）

新增产品：在 `ApiExtractor/manifests/{product}/{version}.json` 添加提取清单，输出到 `public/data/{product}/{version}/`。

## 生成 API 文档数据

### 1. 还原 NuGet 包（首次）

```bash
dotnet restore Acad/Demo/Demo.csproj
```

### 2. 运行提取工具

```bash
cd Acad/ApiBrowser/web
npm run generate:api
```

默认输出：`public/data/autocad/2021/api-graph.json`

或直接：

```bash
dotnet run --project Acad/ApiBrowser/ApiExtractor -- \
  --product autocad --version 2021
```

> 生成的 JSON 体积较大，可按需加入 `.gitignore`；未生成时浏览器自动使用演示 mock 数据。

### 3. （可选）大模型翻译中文说明

使用 OpenAI 兼容接口（OpenAI / DeepSeek / Azure / 自建等）批量翻译 `summary`：

```bash
dotnet run --project Acad/ApiBrowser/ApiExtractor -- translate \
  --product autocad --version 2021 \
  --api-url https://aiproxy.bja.sealos.run/v1/chat/completions \
  --api-key %API_EXTRACTOR_LLM_KEY% \
  --model glm-4-flash \
  --rpm 600 \
  --batch-size 10
```

`--rpm 1800` 表示每秒最多发起 **1800/60 = 30** 次请求；HTTP 不设超时，单批耗时可任意长。

**并发 = 同时 in-flight 的 HTTP 请求数**（每批 1 次请求）。省略 `--concurrency` 时，按本机逻辑核数与可用内存自动估算（约 `核数×64`，并按内存上限裁剪，范围 64–8192）。

| 参数 | 说明 |
|------|------|
| `--rpm` | 每分钟最大请求数；实际限速 = RPM/60 次/秒 |
| `--concurrency`, `-j` | 最大并发请求数；省略则本机自动 |
| `--api-key` | API 密钥；也可用环境变量 `API_EXTRACTOR_LLM_KEY` |
| `--model` | 模型名称 |
| `--batch-size` | 每批条数（默认 15） |
| `--max-items` | 限制条数，测试时可设 `30` |
| `--no-skip-existing` | 默认跳过已翻译条目，支持断点续翻 |

输出：`public/data/autocad/2021/annotations.zh.json`

若出现 **429 速率限制**，程序会自动退避重试并临时降速。仍频繁 429 时可降低 `--rpm`（如 `600`）或 `--concurrency`（如 `100`）。

### 4. 启动浏览器

```bash
cd Acad/ApiBrowser/web
npm run dev
```

浏览器从 `public/data/catalog.json` 加载产品列表；进入某版本后加载对应 `api-graph.json`。

## ApiExtractor 说明

| 输入 | 说明 |
|------|------|
| `AcCoreMgd.dll` | AutoCAD.NET.Core 24.0.0 |
| `AcDbMgd.dll` | AutoCAD.NET.Model 24.0.0 |
| `AcMgd.dll` | AutoCAD.NET 24.0.0 |
| `*.xml` | 程序集配套的英文 `<summary>` 文档 |

配置见 `ApiExtractor/manifests/autocad/2021.json`（或根目录 `manifest.json` 兼容旧用法）：

- `namespacePrefixes`：只提取 `Autodesk.AutoCAD.*` 命名空间
- `assemblies`：程序集与 NuGet 包映射

### 选项

```
--product <id>   --version <id>   输出到 data/{product}/{version}/
-m, --manifest   提取清单路径
-o, --output     覆盖 api-graph.json 路径
scan-catalog     扫描 data/ 生成 catalog.json
-h, --help       帮助
```

## 输出格式

与 `web/src/types/api.ts` 中的 `ApiGraph` 一致：

- **nodes**：类型、属性、方法、事件
- **edges**：`contains` / `inherits` / `implements` / `usesType` / `returns`

## 部署到 Cloudflare Pages

前端为纯静态站点（Vite build → `web/dist`），可直接部署到 [Cloudflare Pages](https://pages.cloudflare.com/)。

### 通过 GitHub 连接（推荐）

1. 将本仓库推送到 GitHub（见下方「仓库」说明）。
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
3. 构建配置：

| 项 | 值 |
|---|---|
| **Root directory** | `web` |
| **Build command** | `npm ci && npm run build` |
| **Build output directory** | `dist` |
| **Node.js version** | `22`（或设置环境变量 `NODE_VERSION=22`） |

4. 保存并部署。SPA 路由已通过 `web/public/_redirects` 配置（所有路径回退到 `index.html`）。

> `npm run build` 的 `prebuild` 会用 Node 脚本生成 `catalog.json`，**不需要**在 Cloudflare 上安装 .NET。本地仍可用 `npm run scan:catalog:dotnet` 调用 ApiExtractor。

### 通过 Wrangler CLI 手动部署

```bash
cd web
npm ci
npm run build
npx wrangler pages deploy dist --project-name=apibrowser
```

## 仓库

GitHub 仓库：[ApiBrowser](https://github.com/Xanvil/ApiBrowser)（`web/` 为 Pages 根目录）

## 后续扩展

- 合并 `cad-api-annotated.md` 中文说明（annotations 覆盖层）
- 按命名空间分片输出，减小单次加载体积
