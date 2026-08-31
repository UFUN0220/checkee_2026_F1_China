# yvon.dev

个人网站，基于 **Next.js 15 App Router** 打造。通过 Contentlayer2 管理 MDX 文章，配合 Upstash Redis 进行动态数据存储，并集成 Vercel 原生服务提供统计与监控。

## 功能亮点

- **Next.js 15 + React 19**：支持 React Server Components 与最新的并发渲染特性。
- **动态统计系统**：
  - **Vercel Analytics & Speed Insights**：原生集成，监控访问量与网页性能。
  - **Upstash Redis**：用于存储实时数据，如文章阅读量、互动计数等。
- **Contentlayer2 + MDX**：强大的内容系统，支持自动目录、阅读时长、RSS 订阅及标签。
- **全能工具集成**：Kbar 指令面板、Giscus 评论、Spotify 实时动态、多渠道邮件订阅。

## 技术栈

- **框架**：Next.js 15 (App Router)、React 19、TypeScript
- **样式**：Tailwind CSS、Framer Motion、Lucide Icons
- **内容**：Contentlayer2、MDX、Remark/Rehype 插件
- **数据/数据库**：
  - **KV 存储**: Upstash Redis (通过 `@upstash/redis` 调用)
  - **分析**: Vercel Analytics & Web Vital Speed Insights
- **工具链**：pnpm、ESBuild、Prettier、Husky

## 快速开始

1. **安装依赖**

   Bash

   ```
   pnpm install
   ```

2. **配置环境变量**

   Bash

   ```
   cp .env.example .env.local
   ```

   在 `.env.local` 中填入你的 Upstash Redis 凭证。

3. **启动开发服务器**

   Bash

   ```
   pnpm dev
   ```

   默认运行在 `http://localhost:3434`。

## 环境变量

### 基础 & 存储

- `UPSTASH_REDIS_REST_URL`：从 Upstash 控制台获取的 REST URL。
- `UPSTASH_REDIS_REST_TOKEN`：从 Upstash 控制台获取的 REST Token。

### 分析 & 统计 (Vercel)

- `NEXT_PUBLIC_VERCEL_ANALYTICS_ID`：Vercel 部署时自动注入，用于统计访问。

### 外部 API

- `GITHUB_API_TOKEN`：用于查询仓库信息。
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REFRESH_TOKEN`：用于展示“正在播放”。

## 常用脚本

| **命令**     | **说明**                                            |
| ------------ | --------------------------------------------------- |
| `pnpm dev`   | 本地开发，端口 3434                                 |
| `pnpm build` | 构建 Next.js 产物（含 Contentlayer 编译、RSS 生成） |
| `pnpm start` | 运行构建后的生产环境代码                            |

## 内容管理

- **文章存放在 `data/`**：Markdown/MDX 文件会被 Contentlayer2 编译为静态 JSON 供前端调用。
- **阅读量统计**：通过 `app/api/` 下的路由与 Upstash Redis 交互，实现阅读量实时更新。

## 部署 (Vercel)

1. **一键开启统计**：在 Vercel 项目面板的 **Analytics** 和 **Speed Insights** 选项卡中点击 "Enable"。
2. **连接 Redis**：在 Vercel 的 **Storage** 菜单中直接添加 Upstash Redis 集成，它会自动配置环境变量。
3. **构建配置**：Framework Preset 选择 `Next.js`，Build Command 为 `pnpm build`。
