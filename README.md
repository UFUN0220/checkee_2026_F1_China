# UFUN · Checkmate

面向 F-1 签证 Check 公开案例的个人信息展示与数据观察网站。项目使用 Next.js App Router 构建，提供名人堂、五城统计、个人主页和案例提交入口。

> 页面中的统计来自已纳入项目的公开样本，仅用于观察样本趋势；它不代表官方处理时间、完整人群或任何个人结果。

## 功能一览

- **名人堂（`/`）**：从精选案例主数据中仅展示已发布记录，按等待时长展示 2026 年公开案例，包含 Top 3、后续排名、备注展开与分页。
- **五城数据统计（`/view`）**：展示北京、上海、广州、沈阳、武汉的样本量与 Q1 / Median / Q3；可切换城市，查看月度趋势和最新案例。
- **个人主页（`/about`）**：个人资料与联系入口。
- **案例提交**：在名人堂打开表单后，可提交面签地点、学位、专业、状态、日期和可选备注；前端与服务端都会校验必填项、状态和日期先后关系。
- **主题与体验**：支持浅色 / 深色主题、响应式布局、站点地图与 robots 元数据，以及可选 Umami 访问统计。

## 路由

| 路径 | 页面 | 主要内容 |
| --- | --- | --- |
| `/` | 名人堂 | 公开案例排名、详情备注、分页与案例提交入口 |
| `/view` | F-1 数据统计 | 五城分位数、月度趋势、按城市筛选的案例列表 |
| `/about` | 个人主页 | 个人资料与联系入口 |
| `/api/submissions` | 案例提交接口 | 接收并校验表单数据，然后写入 Supabase |

## 技术栈

- Node.js 24、Next.js 16、React 19、TypeScript
- Tailwind CSS 4 与 CSS Modules
- Headless UI、Lucide React、next-themes
- Supabase（仅服务端案例提交写入）
- Umami、Vercel Analytics、Vercel Speed Insights（可选分析能力）

## 本地开发

### 前置条件

- Node.js `>=24 <25`
- pnpm

安装依赖并启动开发服务器：

```bash
pnpm install
pnpm dev
```

开发服务器默认运行在 <http://localhost:3436>。

## 环境变量

先复制 `.env.example` 为 `.env.local`，再按所需功能填写变量。

| 变量 | 是否必需 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_UMAMI_ID` | 否 | Umami 网站 ID。 |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | 否 | Umami 脚本地址。 |
| `SUPABASE_URL` | 提交案例时必需 | Supabase 项目 URL，仅由服务端读取。 |
| `SUPABASE_SECRET_KEY` | 提交案例时必需 | Supabase Secret Key（通常以 `sb_secret_` 开头），仅供服务端 API 使用。 |
| `BASE_PATH` | 否 | 部署在子路径时使用。 |
| `EXPORT` | 否 | 按部署需求启用静态导出。 |
| `UNOPTIMIZED` | 否 | 按部署需求关闭图片优化。 |
| `ADMIN_PASSWORD` | 使用 Admin 时必需 | `/admin` 管理员登录密码，仅由服务端读取。 |
| `ADMIN_SESSION_SECRET` | 否 | Admin session cookie 签名密钥；未设置时使用 `ADMIN_PASSWORD`，建议在线上单独设置。 |

`SUPABASE_SECRET_KEY` 具备高权限：不要使用 `NEXT_PUBLIC_` 前缀，不要提交到仓库，也不要在浏览器端使用。当前提交接口会把记录写入 `case_submissions` 表；该表需要支持以下字段：

`/admin` 是内部投稿审核入口，不加入公开导航或 sitemap。管理员通过 `ADMIN_PASSWORD` 登录后，可在 `/admin/submissions` 将 `pending` 投稿改为 `published` 或 `rejected`。审核操作只更新 Supabase 的 `visibility`，不直接编辑 `hall-master.json`；数据库 trigger 会在发布时写入 `published_at`。

`location`、`degree`、`major`、`interview_date`、`start_date`、`status`、`end_date`、`school`、`note`、`compact_note`、`detail_note`、`waiting_days`、`source`、`visibility`、`published_at`。

提交记录与页面内的静态展示样本是两条独立数据流：提交成功只会进入 Supabase 审核池，并以 `source=submission`、`visibility=pending` 保存，不会立即出现在名人堂或统计页面。审核通过后，管理员再将记录导出并发布到名人堂主数据。

表中的现有 `review_status` 继续表示投稿审核记录状态；`visibility` 表示该记录是否进入 Hall 主数据的发布状态，两者不互相替代。`visibility` 从 `pending` 变为 `published` 时，数据库触发器会写入 `published_at`。

## 数据与更新

网站展示使用构建时导入的 JSON 快照：

- `json/checkmate/checkee-static-snapshot.json`：五城统计、月度趋势和案例明细。
- `data/checkmate/published-submissions.json`：从 Supabase 导出的已审核发布投稿冻结快照，只包含 `visibility=published` 的记录。
- `data/checkmate/releases/`：每次正式发布的不可覆盖版本目录，保存 Hall、投稿快照和 `release-meta.json`，用于追踪、比较和恢复。
- `data/checkmate/hall-master.json`：名人堂唯一运行时数据源；页面只读取 `visibility=published` 的精选案例。这是由导出脚本生成的产物，不建议手工编辑，`dataVersion` 标识当前发布版本。
- `data/checkmate/hall_fame.xlsx`：当前 Hall legacy 生产输入源；旧的 `ufun_checkee_pure_processed.xlsx` 与对应 JSON 保留为历史核对参考。

`scripts/convert-checkee-data.py` 是开发期转换工具，可将符合既定表头的 Excel 快照转换为 Hall 记录。`scripts/export-hall-master.py --submissions <supabase-export.json>` 会先筛选并冻结 Supabase 中已发布的投稿到 `published-submissions.json`，再将当前 legacy Excel 与该快照合并生成 `hall-master.json`；不传 `--submissions` 时只读取已有快照，不重新读取 Supabase。历史记录使用 `source=legacy_excel`，用户投稿使用 `source=submission_user`。`scripts/verify-hall-data.py` 用于生成后检查新 Excel、JSON schema、字段、日期、来源、可见性、重复 ID、合并数量、release 完整性及与上一版 legacy 数据的 Added/Removed/Changed。生产构建和线上请求只读取生成后的 JSON，不会解析 Excel 文件。非 `Check` 且没有结束日期的记录，其 `waitingDays` 保持为空，避免用当前日期造成历史数据漂移。

当前正式发布链路为：

```text
Source Layer
legacy Excel + Supabase published submissions

Transform Layer
scripts/export-hall-master.py

Release Layer
data/checkmate/releases/YYYYMMDD-vXXX/

Serving Layer
data/checkmate/hall-master.json

Frontend
/
```

更新数据后，请核对快照日期、样本范围与页面的数据说明，再执行构建验证。

## 常用命令

```bash
# 启动开发服务器（端口 3436）
pnpm dev

# 生产构建
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint

# TypeScript 类型检查
pnpm typecheck

# Hall 数据验证
python scripts/verify-hall-data.py
```

## CI 质量门禁

GitHub Actions 会在推送到 `main` 或 Pull Request 创建、更新、重新打开时自动执行：

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
python scripts/verify-hall-data.py
```

CI 只负责质量检查，不会自动部署、发布 Release 或修改 Supabase 数据。Release 仍由人工审核和发布。

## 项目结构

```text
app/                    路由、页面、元数据与案例提交 API
components/checkmate/   名人堂、五城统计和案例提交界面
data/checkmate/         名称、类型、数据说明与名人堂样本
json/checkmate/         五城统计快照
lib/supabase/           服务端 Supabase 客户端
scripts/                数据转换辅助脚本
css/                    全局主题与样式
```

## 验证

每次修改后至少执行：

```bash
pnpm build
```

该命令会完成生产编译、TypeScript 检查与页面生成。
