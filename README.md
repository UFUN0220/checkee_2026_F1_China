# UFUN

个人博客与知识库，使用 Next.js App Router 构建。文章以 MDX 管理，首页包含天气、世界时钟、阅读量和 Urge 等功能。

## Tech Stack

- Next.js 16、React 19、TypeScript
- Tailwind CSS 4、Lucide React
- Contentlayer2、MDX、Remark/Rehype
- Supabase、Upstash Redis
- QWeather（中国城市）与 OpenWeather（海外城市）

## Development

```bash
pnpm install
pnpm dev
```

开发服务器运行在 <http://localhost:3435>。

## Environment Variables

复制 `.env.example` 为 `.env.local`，再填写 Giscus、Supabase、Upstash Redis、天气服务和 Umami 配置。不要将真实密钥提交到仓库。

## Build

```bash
pnpm build
pnpm start
```

构建会生成 Contentlayer 内容、搜索索引和 RSS 文件。

## Content

博客文章位于 `data/blog/`，使用 MDX 编写；作者内容位于 `data/authors/`。
