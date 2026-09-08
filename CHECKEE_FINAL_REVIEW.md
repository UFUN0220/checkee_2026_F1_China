# Checkee 最终产品级审查

审查日期：2026-09-08
审查方式：只读代码、配置、迁移与静态数据审查
本轮未修改现有源码、CSS、API、数据库或路由；仅新增本审查文档。

## 总结

当前项目已经具备完整的公开展示、用户提交、Admin 审核和静态发布链路。公开页面读取构建期 JSON，用户输入通过服务端 API 写入 Supabase，Admin 使用独立签名 cookie，审核通过后再由导出脚本生成 Hall 静态数据。这条边界清晰，是当前项目最重要的工程资产。

没有从仓库静态审查中确认 Critical 级问题，但存在两个上线前必须确认的 High 级安全项：Admin 登录没有速率限制，以及 `case_submissions` 的生产 RLS/权限状态没有在当前迁移目录中体现。后者不能仅凭仓库推断为安全或不安全，必须核对实际 Supabase 项目。

建议后续只处理 High 及以上，或会直接影响用户理解、数据一致性和无障碍的 Medium 问题，避免重新打开大范围视觉重构。

---

## 1. 项目整体状态

### 已完成能力

- `/`：名人堂，展示静态 Hall 数据，分为 Top 3、4–10 和 11+ 档案列表。
- `/view`：五城统计、月度趋势、分位数、城市案例明细和移动端案例列表。
- `/about`：个人资料、GitHub 入口和轻量动画交互。
- 用户投稿：前端 RHF + Zod，服务端再次校验后写入 `case_submissions`。
- 用户反馈：更新请求写入 `case_update_requests`，Admin 可推进状态并保存管理员备注。
- Admin：密码登录、投稿审核、修改反馈、统计、最近活动、Hall release 查看和 release diff。
- 发布边界：Supabase 审核池不直接作为公开页面数据源，需经过导出、校验、release 和部署。
- 工程质量：当前 `pnpm lint`、`pnpm typecheck`、`pnpm build` 和 `git diff --check` 均通过。

### 当前数据快照观察

只读运行 `python scripts/verify-hall-data.py` 通过，当前 release 为 `20260907-v005`，包含 98 条 legacy Hall 记录，当前 `published-submissions=0`。校验器保留并提示 3 条 legacy 异常：完成状态记录缺少结束日期但仍有 `waitingDays`。这属于历史数据质量问题，不应在本轮通过前端或数据库逻辑静默修正。

#### 问题：历史数据存在等待天数与结束日期不一致的记录

影响：部分已完成案例的等待时长无法由当前字段完整复算，可能影响用户对数据可信度的判断，也可能影响排序和分位数解释。

严重程度：Medium

建议方向：在下一次数据运营审核中逐条核对原始来源；保留校验器 warning，避免直接用当前日期或猜测值覆盖历史事实。

是否必须修复：建议修复，但必须先核对来源数据。

### 当前架构判断

整体架构适合当前单管理员、静态公开展示的产品形态。Server-only Supabase client、短期签名 session cookie、服务端输入校验和静态发布文件边界均已建立。

### 风险总览

#### 问题：Admin 登录没有速率限制或失败锁定

影响：`ADMIN_PASSWORD` 是单一共享凭据；如果 `/api/admin/login` 暴露在公网，攻击者可以持续尝试密码。HMAC cookie 只保护登录后的 session，不能降低登录入口本身的爆破风险。

严重程度：High

建议方向：在部署层或 API 层增加按 IP/设备/时间窗口的登录限速、失败退避和告警；同时确保线上使用独立的 `ADMIN_SESSION_SECRET`，不要回退到管理员密码。

是否必须修复：是，公网开放 Admin 前必须处理或由可信网关明确承担。

#### 问题：`case_submissions` 的生产 RLS 状态无法从仓库确认

影响：当前仓库只包含对 `case_submissions` 的增量迁移，没有创建表、启用 RLS 或显式 revoke/grant 的完整基线。服务端使用高权限 Secret Key，若生产 Data API 权限或 RLS 配置不符合预期，可能扩大数据暴露面。

严重程度：High（条件性）

建议方向：在真实 Supabase 项目中核对表是否启用 RLS、`anon`/`authenticated` 是否无不必要权限、`service_role` 是否仅由服务端使用，并核对 Data API 暴露设置。

是否必须修复：是，必须确认；若实际已启用正确 RLS，则保留核验记录即可。

---

## 2. 用户端体验审查

### Hall `/`

当前首访弹窗解释了“用户提交、整理后匿名展示、不代表官方预测”，并给出查看、提交和反馈三个方向；Top 3、精选区和完整列表的层级也清晰。名人堂控制入口保持为投稿和“更新/说明”两个，符合产品克制原则。

#### 问题：关闭首访说明后，页面标题本身不能独立解释数据来源和参与方式

影响：标题“2026年度白宫严选中国硕博”有品牌感，但对第一次回访、禁用 localStorage 或使用辅助技术的用户来说，网站用途、数据性质和如何参与不够直接。数据说明入口存在，但不是所有用户都会主动打开。

严重程度：Medium

建议方向：在不增加复杂 UI 的前提下，确保首屏固定保留一句简短的数据来源/非官方说明，并让投稿入口的文案独立表达“审核后匿名展示”。

是否必须修复：建议修复，属于首次理解成本问题。

#### 状态：Top 3 视觉层级和移动端布局符合当前设计决策

证据：Top 3 使用独立 CSS module，冠军通过位置提升而不是放大；移动端在 `max-width: 760px` 和 `max-width: 390px` 中单独处理排列、间距和按钮区域。

### View `/view`

五城卡片使用独立 CSS module 和独立数据视图；桌面端为五列，移动端为北京居中、其他城市两列排列。趋势表和案例列表在移动端切换为纵向/可滚动结构。页面提供数据说明、更新时间、样本数和分位数，可信度表达比单纯展示一个数字更完整。

#### 问题：数据新鲜度依赖手工生成和部署，页面没有显式区分“采集时间”和“部署时间"

影响：静态 snapshot、Hall master 和 release 都是发布产物；用户看到的是最近一次构建数据，不一定是最近一次 Supabase 审核数据。Admin 已有提示，但公开 `/view` 和 Hall 的数据更新边界仍可能被理解为实时数据。

严重程度：Medium

建议方向：继续保留更新时间和样本范围，并明确使用“最近整理/快照时间”而不是让用户推断为实时统计。

是否必须修复：建议在下一次内容收口时处理；不需要重构数据链路。

#### 状态：五城卡片未被全局 Button/token 规则污染

证据：城市卡片使用 `.cityCard` / `.cityCardActive` 的 module 样式；全局通用交互规则已经排除 `.feature` 内控件。城市卡片仍保留自身的环境光、选中态和响应式布局。

### About `/about`

个人资料卡、头像、动画状态和 GitHub 入口均存在，移动端使用单卡片缩放策略，符合当前单一视觉主体的设计意图。

#### 问题：GitHub 入口的第一次点击不是打开 GitHub，而是先进入过渡文案状态

影响：按钮初始文案“抄似我”与实际 GitHub 行为之间存在两步交互，用户需要第二次点击才会打开外部仓库；对于不熟悉该彩蛋的用户，入口职责不够确定。

严重程度：Low

建议方向：如果该交互不是明确的产品彩蛋，可考虑让按钮第一次点击就表达或打开 GitHub；不建议为此重新设计 ProfileCard。

是否必须修复：否。

---

## 3. 用户提交流程审查

### 提交案例链路

当前链路为：

```text
用户填写
  → RHF
  → Zod
  → /api/submissions 服务端校验
  → service_role 写入 case_submissions
  → Admin 审核 visibility
  → 导出 published snapshot
  → hall-master.json / release
  → Hall 展示
```

前端 schema 校验地点、学位、专业、日期、状态、结束日期关系和备注长度；API 重新校验类型、日期真实性、状态白名单、长度和等待天数，服务端不会信任客户端派生值。这一部分完整度较好。

#### 问题：发布成功反馈容易被理解为已经立刻出现在 Hall

影响：Admin 投稿确认文案为“投稿已发布到 Hall”，但项目实际还需要导出、生成 release 并部署，公开 Hall 才会更新。用户或管理员可能把“Supabase visibility=published”和“公开页面已上线”混为一谈。

严重程度：Medium

建议方向：把审核成功、已进入待发布池、已公开展示三个状态在文案上明确区分；不需要改变现有 API 或发布架构。

是否必须修复：建议修复，避免对数据状态产生错误预期。

#### 问题：提交接口没有幂等键，网络不确定时可能产生重复投稿

影响：正常重复点击由 `isSubmitting` 阻止，但浏览器超时、用户刷新或客户端重试时，服务端没有请求级幂等标识或重复检测。相同案例可能进入多个 pending 记录，增加 Admin 清理成本。

严重程度：Medium

建议方向：上线规模扩大后考虑使用客户端生成的 submission idempotency key 或服务端重复窗口；当前不建议为此扩大数据模型改造。

是否必须修复：否，当前规模可先监控。

#### 状态：成功、失败和校验反馈基本完整

证据：提交成功有 `role=status` 和后续人工审核说明；失败保留表单内容并显示 `role=alert`；字段错误通过 `aria-describedby` 关联到错误信息。

### 更新数据链路

当前链路为：

```text
用户填写更新内容/邮箱
  → RHF + Zod
  → /api/update-requests 服务端校验
  → service_role 写入 case_update_requests
  → Admin pending → reviewing → completed/rejected
  → 管理员备注与 resolved_at
```

`case_update_requests` 迁移包含内容、邮箱、状态、管理员备注、时间戳和状态约束；服务端状态更新还通过旧状态条件限制了状态机，避免越级转换。

#### 问题：更新请求没有结构化关联到具体 Hall record

影响：Admin 主要依赖用户在自由文本中提供地点、学校、专业或日期来定位案例；如果用户描述不完整，管理员需要人工比对，可能出现反馈无法准确归属或处理错案例。

严重程度：Medium

建议方向：保留当前自由文本流程的同时，未来可提供可选案例标识或结构化定位字段；当前阶段不建议强行修改用户端表单。

是否必须修复：否，属于后续数据运营优化。

---

## 4. Admin 体验审查

### Dashboard

Dashboard 提供 Pending、Published、Rejected 统计、投稿待办、修改反馈待办、最近活动、最近发布和最近生成时间；入口能指向投稿审核、修改反馈和 Hall 发布控制中心。管理员可以知道当前待办数量和静态发布仍需人工生成。

#### 问题：最近活动对投稿只记录创建事件，不区分后续审核事件

影响：投稿被发布或拒绝后，最近活动仍可能显示为“新案例提交”，时间使用 `created_at`，管理员难以从 Dashboard 判断最近发生的是投稿、审核还是发布。

严重程度：Medium

建议方向：如果运营量增加，活动模型应记录审核动作和状态变化时间；当前单管理员规模可以先保留。

是否必须修复：否。

### Submissions

投稿页支持 Pending/Published/Rejected/All 筛选、详情展开、发布/拒绝二次确认、低饱和状态 Badge、移动端换行和提交中禁用。发布接口通过 `visibility=pending` 条件更新，能防止两个管理员同时处理同一条投稿。

#### 问题：审核后当前列表与筛选语义不完全一致

影响：投稿列表的客户端操作会直接从数组移除已处理投稿，因此 All 筛选下也会消失；如果未来需要在 All 视图继续查看刚处理的记录，当前行为会让管理员误以为记录未找到。页面也没有主动重新拉取最新状态。

严重程度：Low

建议方向：明确当前列表是“待处理队列”还是“结果浏览”；若支持 All，操作后应按当前筛选重新拉取或更新本地状态，而不是一律删除。

是否必须修复：否。

### Update Requests

修改反馈页展示请求 ID、邮箱、内容、状态、时间和管理员备注，状态流转通过确认 Dialog 完成，管理员备注单独保存；按钮层级和拒绝色彩符合“玉石工具台”定位。

#### 问题：状态更新后没有按当前筛选重新整理列表

影响：例如当前查看 `reviewing`，将请求标记为 `completed` 后，客户端会把同一行映射成 Completed，但它仍留在 Reviewing 筛选页；管理员需要刷新页面才能恢复筛选语义。

严重程度：Medium

建议方向：操作成功后按当前筛选移除不再匹配的行，或重新请求当前筛选结果；同时保留成功提示。

是否必须修复：建议修复，直接影响后台操作确定性。

#### 问题：空列表分支可能遮蔽操作反馈

影响：Update Requests 组件在 `requests.length === 0` 时提前返回，若未来操作后将本地列表移除到空数组，成功/失败提示不会和空状态一起渲染。

严重程度：Low

建议方向：让反馈区域先于空状态渲染；这是小范围状态展示修正，不需要改变业务逻辑。

是否必须修复：否。

---

## 5. Design System 审查

### Global Token

当前 jade ink、deep、control background/border/highlight、error 和 interaction shadow/inset 已集中在 `css/tailwind.css`，forms 与 Dialog 通过 token 使用；Checkmate 的 surface、accent、city tint、medal 等仍保留在 CSS module，避免把展厅材质误用到 Admin 或普通表单。

### Button 边界

- 统一 `Button`：Admin 审核动作、表单提交、Dialog 操作和通用应用级按钮。
- 独立样式：Navbar、Top3、五城卡片、Hall 分页、投稿/反馈展厅按钮。
- 全局交互规则已排除 `.form-button` 和 `.feature` 内控件，降低普通按钮样式污染特殊组件的风险。

#### 问题：`form-button` 命名仍把通用 Button 与 forms 目录耦合

影响：该组件已经承担 Admin、Dialog 和通用 Button 角色，但类名仍是 `form-button`；后续开发者可能误以为它只允许在表单使用，或者直接在 forms.css 中加入影响所有应用按钮的规则。

严重程度：Low

建议方向：下一次有明确组件系统迭代时再考虑命名分层；当前不建议为改名引入全站 class 迁移。

是否必须修复：否。

#### 状态：特殊组件视觉边界当前可确认

Checkmate module 内仍维护城市卡片、Top 3、行列表和展厅 Dialog 的独立状态；全局 token 仅作为通用交互语言，不替换这些组件自身的环境光和材质。

---

## 6. Responsive 审查

### 已覆盖尺寸

- 360/390：Navbar、Top 3、五城卡片、榜单行、Dialog 和提交表单均有 `max-width: 760px` 与 `max-width: 390px` 分支。
- 1366/1440：页面使用 `max-w-6xl`/独立 module grid，桌面端保留五城五列和 Hall 桌面层级。
- Dialog：移动端有 `max-height`、`overflow-y: auto` 和 safe-area padding。
- Form：输入控件 `min-width: 0`、`max-width: 100%`，移动端 textarea 不主动撑破容器。

#### 问题：About 移动端使用视觉 `scale`，布局占位与视觉占位不是同一模型

影响：ProfileCard 在移动端通过 `scale: 0.84` 缩小，布局尺寸仍按缩放前计算，可能造成上下留白不对称或点击/滚动区域与视觉边界理解不一致。

严重程度：Low

建议方向：继续观察 360px 和 390px 真机；如果没有实际溢出或点击问题，不建议为此重新拆分 ProfileCard 响应式布局。

是否必须修复：否。

#### 状态：移动端五城和 Top 3 没有发现明显的结构性溢出风险

CSS 对 grid、列表文本、案例详情滚动和长文本使用了 `min-width: 0`、`overflow-wrap`、ellipsis 或内部滚动；但最终上线前仍应在真实浏览器对 360px/390px 做一次人工点击检查。

---

## 7. Accessibility 审查

### 已完成项

- Headless UI Dialog/Popover 负责焦点管理和键盘关闭。
- 表单字段有 label 关联，错误信息通过 `aria-describedby` 和 `role=alert` 暴露。
- 提交状态使用 `aria-busy`、`role=status` 或 `aria-live`。
- 装饰性图标使用 `aria-hidden`，导航使用 `aria-label` / `aria-current`。
- Top 3 有备注时支持 Enter/Space 键操作。

#### 问题：Check 状态下隐藏的结束日期仍包含可聚焦输入控件

影响：提交表单将结束日期 Label 设置为 `aria-hidden` 并用 CSS 隐藏，但内部 input 没有同步 `disabled` 或从 tab 顺序移除。辅助技术可能遇到“隐藏父节点内仍可聚焦控件”，键盘用户也可能聚焦到不可见字段。

严重程度：Medium

建议方向：当状态为 Check 时同步禁用结束日期 input，并确保重新显示时恢复可用；不要只依赖 `aria-hidden` 和视觉隐藏。

是否必须修复：建议在上线前修复。

#### 问题：Admin 登录错误没有与密码输入建立显式描述关系

影响：错误文本使用 `role=alert`，但输入没有 `aria-describedby`/`aria-invalid`；读屏用户能听到告警，却不一定知道它对应密码字段。

严重程度：Low

建议方向：将错误节点 ID 关联到密码输入，并在有错误时设置 `aria-invalid`；同时可给登录按钮补充 `aria-busy`。

是否必须修复：否。

---

## 8. Performance 审查

### 当前观察

- `/` 和 `/view` 由同一个 client-side `CheckmateExperience` 载入静态 JSON，交互逻辑集中，维护简单。
- `checkee-static-snapshot.json` 约 416 KB，`hall-master.json` 约 45 KB；这些数据会随相关客户端组件进入页面资源。
- Checkmate CSS module 约 110 KB，包含大量桌面、移动、深色和历史状态规则。
- 公开目录包含约 8.6 MB 的完整 `HYBlackMythU.woff2`，当前 CSS 实际引用的是约 1.0 MB 的 subset 字体。
- Umami、Vercel Analytics、Vercel Speed Insights 均属于额外第三方运行时能力，其中 Umami 使用 `afterInteractive`。

#### 问题：公开页面客户端携带较大的静态数据与 CSS

影响：首屏可能下载并解析并非当前视图立即需要的案例/统计数据；移动端网络较慢时，JS hydration 和 CSS 解析成本会更明显。

严重程度：Medium

建议方向：若真实 RUM 或 Lighthouse 证明是瓶颈，再按页面拆分数据、延迟加载非首屏交互或压缩/拆分 CSS；目前不建议为了理论 bundle 风险重构主组件。

是否必须修复：否，先建立真实性能基线。

#### 问题：完整字体文件疑似未被引用

影响：`public/fonts/HYBlackMythU.woff2` 体积约 8.6 MB，而全局 CSS 引用 subset 版本；若确认没有其他外部引用，完整字体会增加仓库和部署资源负担。

严重程度：Low

建议方向：通过构建产物和线上资源引用确认后，再决定是否清理未使用字体；不要在没有确认引用关系前删除。

是否必须修复：否。

#### 状态：图片和第三方脚本风险可控但仍应依赖真实监控

头像使用固定 CSS 尺寸，Logo 使用 Next Image；分析脚本为可选配置。当前没有 bundle analyzer 或真实 Web Vitals 记录，因此性能结论以静态审查为限。

---

## 9. Security 审查

### 已确认的正向设计

- Supabase Secret Key 只在 `server-only` 模块和服务端 API 使用，没有 `NEXT_PUBLIC_` 暴露路径。
- Admin cookie 为 `httpOnly`、`sameSite=strict`、生产环境 `secure`，session payload 使用 HMAC 签名并限制 8 小时有效期。
- Admin 写操作检查登录态和同源请求；投稿 visibility、反馈 status、ID 和文本长度均有白名单/边界校验。
- API 不把 Supabase 原始错误直接返回给用户。
- CSP、X-Frame-Options、nosniff、Referrer-Policy、HSTS 和 Permissions-Policy 已配置。
- `case_update_requests` 迁移启用 RLS，撤销 anon/authenticated 权限，并用 restrictive policy 拒绝公开访问；服务端通过 service role 写入。

#### 问题：公开投稿和反馈接口没有速率限制或反滥用控制

影响：`/api/submissions` 和 `/api/update-requests` 都允许匿名 POST。即使数据库权限正确，攻击者仍可制造大量垃圾投稿、反馈和服务端 Supabase 写入成本。

严重程度：Medium

建议方向：公网部署前至少设置边缘限速、请求体/来源监控和异常告警；如果出现明显滥用，再增加 CAPTCHA 或更强的人机校验。

是否必须修复：建议在正式公开运营前处理。

#### 问题：同源检查允许缺少 Origin 的请求继续通过

影响：`isSameOrigin` 在没有 Origin header 时返回 true。当前 `sameSite=strict` cookie 和服务端认证降低了实际 CSRF 风险，但该策略不是严格的来源证明，未来若修改 cookie 或新增敏感写接口，容易被误用。

严重程度：Low

建议方向：明确哪些请求必须要求 Origin/Referer，或在安全边界文档中记录“无 Origin 的服务端客户端兼容策略”；不要仅依赖该函数承担全部 CSRF 防护。

是否必须修复：否，需结合部署代理和客户端兼容性决定。

#### 问题：`case_submissions` 的表级权限基线不在当前仓库迁移中

影响：无法从迁移文件确认该表是否启用 RLS、是否撤销 anon/authenticated、是否存在过宽 policy。由于服务端使用高权限 Secret Key，这个核验缺口必须视为上线阻断项，而不是默认安全。

严重程度：High（条件性）

建议方向：直接在目标 Supabase 项目核对 RLS、policy、grant/revoke、Data API 暴露和 service role 使用范围，并保留审计结果。

是否必须修复：是，必须确认实际配置。

---

## 上线前优先级

### 必须处理或确认

1. 核对生产 `case_submissions` 的 RLS、policy 和 Data API 权限。
2. 给 Admin 登录增加速率限制/失败退避，或确认由可信网关承担。
3. 修复 Check 状态下隐藏结束日期的键盘/辅助技术状态。

### 建议尽快处理

1. 修正 Update Requests 操作后的当前筛选列表状态。
2. 明确“审核通过”和“公开 Hall 已更新”的文案边界。
3. 为公开 POST 接口增加基础限速与异常监控。

### 可以延后

1. About GitHub 入口的两步彩蛋交互。
2. 未使用完整字体资源的清理。
3. 客户端静态数据和 CSS 的进一步拆分，等待真实性能数据后再决定。

## 最终结论

Checkee 已达到“功能链路完整、可以进入上线前核验”的阶段，但还不宜把安全状态描述为已完全闭环。当前最重要的不是继续做视觉重构，而是完成生产 Supabase 权限核验、Admin 登录防爆破和一次真实设备/读屏检查。除这几个边界问题外，项目的页面体系、数据发布边界、表单架构和特殊组件样式隔离已经足够稳定，可以进入收尾阶段。
