# UFUN

个人主页与 Checkmate 信息展示网站，使用 Next.js App Router 构建。

## Tech Stack

- Node.js 24、Next.js 16、React 19、TypeScript
- Tailwind CSS 4、Lucide React
- Checkmate 静态数据与交互式统计页面

## Development

```bash
pnpm install
pnpm dev
```

开发服务器运行在 <http://localhost:3436>。

## Environment Variables

复制 `.env.example` 为 `.env.local`，按需填写 Umami 配置。不要将真实密钥提交到仓库。

## Build

```bash
pnpm build
pnpm start
```

构建会生成 Next.js 生产构建。
