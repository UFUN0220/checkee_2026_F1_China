# Checkee 表单与 Dialog 系统规格

> 目的：记录当前实现的实际行为，为未来迁移至 shadcn/ui、React Hook Form（RHF）与 Zod 做准备。本文件是规格，不改变现有实现。  
> 盘点日期：2026-09-08。

## 1. 范围与当前架构

本盘点覆盖所有会收集用户输入、提交数据或推进审核状态的页面与组件；纯展示 Dialog 也单列记录，以免迁移时改变其打开、关闭和首次访问行为。

| 流程 | 用户入口 / 组件 | 提交目标 | 当前持久化位置 |
| --- | --- | --- | --- |
| 公开投稿案例 | Hall 的“提交案例”按钮；`SubmitCaseDialogButton` | `POST /api/submissions` | `public.case_submissions` |
| 公开修改数据 | Hall 的“更新/说明”→“更新数据”；`ContactCaseDialogButton` | `POST /api/update-requests` | `public.case_update_requests` |
| 其他反馈 | Hall 的“更新/说明”→“其他反馈” | `mailto:fyou@wustl.edu` | 不在项目数据库持久化 |
| 数据说明 | `DataDescription` Popover；“更新/说明”→“数据说明” | 无 | 无 |
| 首次访问说明 | `HallWelcomeDialog` | 无 | 浏览器 `localStorage` |
| 后台登录 | `/admin`；`AdminLoginForm` | `POST /api/admin/login` | 签名、HttpOnly session cookie |
| 后台投稿审核 | `/admin/submissions`；`SubmissionList` | `PATCH /api/admin/submissions/:id` | `case_submissions.visibility` |
| 后台修改反馈处理 | `/admin/update-requests`；`UpdateRequestList` | `PATCH /api/admin/update-requests/:id` | `case_update_requests.status` / `admin_note` |

### 1.1 公开端投稿

```text
点击“提交案例”
  ↓（每次打开均重置草稿）
Dialog：idle / editing
  ↓（本地字段校验，标记 touched）
submitting
  ↓ POST /api/submissions
success ──→ 成功说明；可返回或关闭
error   ──→ 错误提示；保留填写内容，允许重试
```

### 1.2 公开端“更新/说明”

```text
点击“更新/说明”
  ↓（每次打开均清空内容）
menu
 ├─ 数据说明 → info（只读）→ 返回 menu
 ├─ 更新数据 → update → POST /api/update-requests → success
 └─ 其他反馈 → other → 生成 mailto 邮件草稿 → success
```

从 `update` / `other` 返回菜单时，当前实现只清除错误与成功标记，**不会清空已输入文本**；关闭 Dialog 或重新打开才会整体清空。

### 1.3 后台输入与审核

```text
管理员密码 → POST /api/admin/login → 签名 session cookie → 目标后台页

待审核投稿 → 确认框 → PATCH visibility=published | rejected
待处理修改反馈 → pending → reviewing → completed | rejected
                                      └→ PATCH admin_note（任意状态可保存）
```

后台审核是公开表单的后续生命周期，虽然不是本次公开表单 UI 重构的主要对象，但 API、状态机及数据字段必须保持兼容。

## 2. 字段定义与验证规则

### 2.1 公开投稿案例

组件本地状态位于 `components/checkmate/submit-case-dialog.tsx`；网络调用封装在 `components/checkmate/submit-case.ts`。前端使用受控字段和 `touched` 状态展示错误，服务端在 `app/api/submissions/route.ts` 再次校验，后者是最终准则。

| 字段 | 控件 / 类型 | 必填 | 默认值 | 前端规则 | 服务端规则与规范化 | 数据表映射 |
| --- | --- | --- | --- | --- | --- | --- |
| `location` | select / 五城枚举 | 是 | `''` | 非空 | 字符串、trim 后非空、最多 80 字符 | `location` |
| `degree` | select：Bachelor、Master、PhD | 是 | `''` | 非空 | 字符串、trim 后非空、最多 80 字符 | `degree` |
| `major` | text | 是 | `''` | trim 后非空 | trim 后非空、最多 120 字符 | `major` |
| `interviewDate` | date | 是 | `''` | 非空 | 必须为真实的 `YYYY-MM-DD` UTC 日期 | `interview_date`，并同步写入 `start_date` |
| `status` | select：Check、Approved、Issued、Refused | 是 | `''` | 非空 | trim 后必须为四个允许值之一 | `status` |
| `endDate` | date | 条件选填 | `''` | 非 `Check` 时如填写，不得早于面签日 | `Check` 时强制写 `null`；其他状态可为 `null`；如存在须为真实日期且不得早于面签日 | `end_date` |
| `school` | text | 否 | `''` | 无长度提示 | trim 后空值转 `null`，最多 160 字符 | `school` |
| `note` | textarea | 否 | `''` | 无长度提示 | trim 后空值转 `null`，最多 1000 字符 | `note` / `detail_note` / `compact_note` |

补充行为：

- 将状态改为 `Check` 时，前端立即清除 `endDate`；该输入项视觉隐藏且不参与提交。
- `note` 同时写入 `note` 与 `detail_note`。服务端生成最多 28 字符的 `compact_note`：短文本原样保存；长文本优先保留不超过 28 字符的首句，否则截断并加省略号。
- 服务端计算 `waiting_days`：有结束日时为结束日减面签日；`Check` 为服务端当天减面签日；其它未填结束日状态为 `null`。负数会被拒绝。
- 新投稿固定写入 `source: 'submission_user'`、`visibility: 'pending'`、`published_at: null`，不会直接出现在 Hall。

### 2.2 公开修改数据请求

入口是 `ContactCaseDialogButton` 的“更新数据”视图。没有案例 ID、截图上传、姓名或必填邮箱字段；用户须在文字中说明目标案例和需修正的信息。

| 字段 | 控件 / 类型 | 必填 | 默认值 | 前端规则 | 服务端规则 | 数据表映射 |
| --- | --- | --- | --- | --- | --- | --- |
| `content` | textarea | 是 | `''` | trim 后非空 | trim 后 1–4000 字符 | `content` |
| `email` | `type=email` text | 否 | `''` | 填写时须匹配简单邮箱正则 | trim 后空值视为未提供；最长 320 字符；填写时须匹配同类邮箱正则 | `email` |

界面文案建议用户提供截图、官方邮件或时间证明，并允许遮挡敏感信息；**当前没有文件上传或凭证字段**。请求创建后的默认 `status` 为 `pending`，时间字段由数据库默认值和触发器维护。

### 2.3 其他反馈

| 字段 | 控件 / 类型 | 必填 | 当前规则 | 提交结果 |
| --- | --- | --- | --- | --- |
| `otherMessage` | textarea | 是 | trim 后非空；无前端长度上限 | 生成主题为“Checkee 其他反馈”的 `mailto:` 草稿，正文含固定问候语和内容 |

该流程没有 API、数据库记录或邮箱字段。“邮件草稿已准备好”只表示浏览器已尝试唤起邮件客户端，**不表示邮件已发送或已被系统接收**。

### 2.4 后台表单与可编辑字段

| 流程 | 字段 / 操作 | 规则 | 服务端结果 |
| --- | --- | --- | --- |
| 管理员登录 | `password`（必填）、`redirectTo`（隐藏的调用参数） | 密码由服务端配置校验；跳转地址必须以 `/` 开头且不能以 `//` 开头 | 登录成功时写入 8 小时、`HttpOnly`、`SameSite=Strict` 的签名 cookie |
| 投稿审核 | `visibility` | 仅 `pending → published` 或 `pending → rejected`；操作前显示确认框 | 条件更新，竞争或已处理时返回 409；数据库触发器维护 `published_at` |
| 修改反馈状态 | `status` | 仅 `pending → reviewing`，再 `reviewing → completed / rejected`；操作前显示确认框 | 终态设置 `resolved_at`，开始处理时清空 `resolved_at` |
| 管理员备注 | `admin_note` | 可为空或 `null`；trim 后最多 4000 字符；任意状态可保存 | 写入 `case_update_requests.admin_note` |
| 版本对比 | GET 参数 `a`、`b` | 两者须为已有 release 版本；不合法时回退到默认版本 | 仅读取，不写入数据库或发布文件 |
| 退出登录 | 无用户数据字段 | 原生 POST form | 清除 session cookie 并跳转 `/admin` |

## 3. 状态流程与 UI 行为

### 3.1 投稿案例 Dialog

```text
closed
  ↓ 点击入口（reset form、touched、status）
editing / idle
  ├─ blur：将当前字段加入 touched
  ├─ change：更新字段、移除该字段错误展示、状态回到 idle
  └─ submit
       ├─ 无效：标记所有必填字段 touched，停留原处
       ├─ 有效：submitting（主按钮禁用，关闭操作无效）
       ├─ HTTP 成功：success，表单值重置
       └─ 请求失败：error，保留原表单值
```

- 打开与关闭按钮均会重置表单；提交成功后的“返回”只退出成功态，表单已是空白初始值。
- 成功说明为“提交后会经过人工整理和审核，符合展示标准的案例会进入名人堂”。
- 失败提示统一为“提交失败，请稍后再试”；客户端调用封装不读取服务端错误正文。
- 当前表单使用 `noValidate`，由自定义错误文字、`aria-invalid`、`aria-describedby` 和 `role=alert` 提供错误反馈。

### 3.2 “更新/说明” Dialog

- 打开时进入菜单并清空三个草稿、错误和提交状态；`Dialog.onClose`（关闭按钮、Escape 或外部关闭行为）同样执行整体重置。
- `info` 只展示 `notice.title`、`notice.content` 和 `updatedAt`，没有输入、网络请求或持久化。
- 更新请求提交期间，仅更新请求的主按钮禁用并显示“正在提交…”。失败时保留 `content` 与 `email`，显示 API 返回错误或通用错误；成功态说明请求会被核实、确认后才更新案例，并在提供邮箱时提示将用该邮箱联系。
- 其他反馈提交前仅检查非空；成功态随即导航到 `mailto:`，并显示“请在邮件客户端确认并发送”。

### 3.3 数据说明与首次访问说明

- `DataDescription` 是 Headless UI `Popover`：点击“数据说明”开关显示，没有提交、表单状态或保存行为。
- `HallWelcomeDialog` 首次渲染时检查 `localStorage['checkee:hall-welcome-seen']`；未见过则先写入 `true` 再打开。无论关闭、Escape 或点击“开始浏览”均仅关闭，不清除该标记。

## 4. API 对接契约

### `POST /api/submissions`

| 项目 | 当前契约 |
| --- | --- |
| 请求 | JSON：`location`、`degree`、`major`、`interviewDate`、`status`、可选 `endDate` / `school` / `note` |
| 成功 | `200`，`{ "success": true }` |
| 可预期错误 | `400` 或 `500`，当前均返回 `{ "error": "提交失败，请稍后再试" }` |
| 服务端职责 | 解析 JSON、验证和规范化、计算等待天数与短备注、以服务端 Supabase 客户端插入 `case_submissions` |
| 客户端处理 | 只根据 `response.ok` 判断；非成功一律抛出 `Case submission failed`，不显示 API 细节 |

### `POST /api/update-requests`

| 项目 | 当前契约 |
| --- | --- |
| 请求 | JSON：`{ "content": string, "email"?: string }`；客户端在空邮箱时省略 `email` |
| 成功 | `200`，`{ "success": true, "request": { "id", "status", "created_at" } }` |
| 请求错误 | `400`，`{ "error": "请填写有效的反馈内容；邮箱如填写也需有效。" }` |
| 服务器错误 | `500`，`{ "error": "反馈提交失败，请稍后再试。" }` |
| 服务端职责 | 解析 JSON、验证 `content` / `email`、通过服务端 Supabase 客户端插入请求并返回最小回执 |
| 客户端处理 | 尝试读取 JSON 中的 `error`；失败时保留草稿，成功时只切换为成功视图，不使用返回的 request 内容 |

### 后台写入接口

| Endpoint | Method / body | 前置条件 | 成功 | 关键错误语义 |
| --- | --- | --- | --- | --- |
| `/api/admin/login` | `POST { password, redirectTo }` | 同源 | `{ redirectTo }` + session cookie | 400 请求格式、401 密码、403 来源、503 未配置 |
| `/api/admin/submissions/:id` | `PATCH { visibility }` | 已登录、同源、有效 ID | `{ submission: { id, visibility, published_at } }` | 401 / 403 / 400 / 409 竞争或已处理 / 500 |
| `/api/admin/update-requests/:id` | `PATCH { status? , admin_note? }` | 已登录、同源、数字 ID | `{ request }`（完整请求字段） | 401 / 403 / 400 / 409 状态冲突或不存在 / 500 |

公开接口没有登录要求；`case_update_requests` 的 RLS 明确拒绝 `anon` 与 `authenticated` 的直接读写，公开写入经 Next 服务器使用 service role 完成。迁移 UI 时不得把 service-role 凭证放到客户端，也不得改为直接浏览器写表。

## 5. 数据与审核映射

### 5.1 `case_submissions`

公开投稿写入的核心字段为：

```text
location, degree, major,
interview_date / start_date, status, end_date,
school, note, detail_note, compact_note, waiting_days,
source='submission_user', visibility='pending', published_at=null
```

审核通过只改变 `visibility` 为 `published`；数据库触发器在首次变为 `published` 时写入 `published_at`。Hall 页面不会因为 API 成功立即展示新投稿，仍需人工审核、重新生成 Hall Master 数据并部署。

### 5.2 `case_update_requests`

```text
id, content, email, status='pending', created_at, updated_at,
admin_note, resolved_at
```

数据库约束限制内容为 1–4000 字符、邮箱（如存在）为 3–320 字符、状态只能是 `pending`、`reviewing`、`completed`、`rejected`；每次更新由触发器更新 `updated_at`。状态流转由后台 API 的条件更新防止并发覆盖。

## 6. 迁移到 shadcn/ui + RHF + Zod 的要求

### 必须保持的外部契约

1. **API 不变**：保留 endpoint、HTTP method、JSON 字段名、可选字段的 `null` / 省略语义、成功与错误状态码及当前响应形状。
2. **数据不变**：不得修改 Supabase 表、RLS、约束、触发器、`source`、`visibility`、后台审核状态机或 Hall 发布流程。
3. **用户体验不变**：维持现有入口、菜单分支、成功文案含义、失败后保留输入、关闭/重新打开时的清空策略，以及 `Check` 时自动清空结束日期。
4. **后台流程不变**：管理员认证、同源校验、确认框、条件状态流转、管理员备注与并发冲突反馈都继续由服务器强制执行。
5. **可访问性不退化**：错误需要继续和字段关联，动态成功/错误继续使用合适的 `role=status` / `role=alert`，Dialog/Popover 保持键盘关闭与焦点管理。

### 建议的迁移边界

| 现有职责 | RHF / Zod 后的职责 |
| --- | --- |
| `useState` 管理字段、touched、错误、提交中状态 | `useForm` 管理 values、touched、dirty、isSubmitting；不要改变 reset 时机 |
| 客户端 `validate` + helper 的轻量检查 | 以 Zod schema 统一公开表单的客户端规则；`superRefine` 表达 `endDate >= interviewDate` 的跨字段校验 |
| Headless UI Dialog / Popover | 以 shadcn Dialog、Popover、Form、Input、Select、Textarea 替换展示层；保留同一交互状态机 |
| 路由处理器手写最终校验 | 首选复用同一份 Zod schema 或服务端等价 schema；即使客户端使用 resolver，服务端验证仍不能删除 |

### 推荐的 schema 划分

- `caseSubmissionSchema`：字段长度、状态枚举、真实日期格式、结束日期条件与时间先后关系；在提交前将空的可选字符串转换为 `null`，`Check` 的结束日期转换为 `null`。
- `updateRequestSchema`：`content` trim 后 1–4000；`email` 允许空值但非空时验证格式并限制 320；提交 payload 中继续省略空邮箱。
- `otherFeedbackSchema`：仅验证 trim 后非空；它不是 API schema，成功条件仍是成功发起 `mailto:` 导航。
- `adminLoginSchema`、`adminSubmissionDecisionSchema`、`adminUpdateRequestPatchSchema`：可用于改善后台客户端反馈，但服务端的认证、同源校验、状态转换和长度检查必须继续独立保留。

### 迁移验收清单

- [ ] 所有当前有效/无效 payload 的 API 响应及数据库写入保持一致。
- [ ] 投稿：必填项、五城/学位/状态选项、日期比较、`Check` 清空结束日和等待天数计算前提均未改变。
- [ ] 修改请求：空内容、非法邮箱、4000 字符上限、失败保留草稿、成功后“等待核实”的说明均未改变。
- [ ] 其他反馈仍明确是邮件草稿而非已提交工单。
- [ ] 关闭、返回菜单、重新打开、成功后的重置范围与当前行为逐一回归验证。
- [ ] 管理端状态转换和 409 并发情形均有回归测试。
- [ ] 无客户端 Supabase service-role、无绕过 API 的浏览器直写。

## 7. 现状差异与迁移时应显式决策的项目

以下是事实记录，不是本轮修改建议；迁移前应明确是否保持或另起产品需求处理。

1. 投稿 UI 没有 `maxLength`，但服务端限制 `major` 120、`school` 160、`note` 1000；RHF/Zod 应在客户端提前提示，同时仍以服务端为准。
2. 投稿客户端只校验“日期非空”和字符串先后，服务端还会验证真实日历日期；迁移后的 Zod 日期校验应对齐服务端严格度。
3. 修改请求的“建议提供凭证”目前只是文案，没有附件或案例关联字段；不可把它误迁移成强制上传或新增数据库字段。
4. 其他反馈并未入库且无法确认最终发送；不得在 UI 上把它描述成已由 Checkee 接收。
5. 当前公开提交接口未见认证、限流或验证码逻辑。若以后增加，属于新的安全/产品需求，不能在本次 UI 迁移中隐式改变请求契约。

## 8. 主要源码索引

- `components/checkmate/submit-case-dialog.tsx`
- `components/checkmate/submit-case.ts`
- `components/checkmate/contact-case-dialog.tsx`
- `components/checkmate/data-description.tsx`
- `components/checkmate/hall-welcome-dialog.tsx`
- `app/api/submissions/route.ts`
- `app/api/update-requests/route.ts`
- `components/admin/admin-login-form.tsx`
- `components/admin/submission-list.tsx`
- `components/admin/update-request-list.tsx`
- `app/api/admin/login/route.ts`
- `app/api/admin/submissions/[id]/route.ts`
- `app/api/admin/update-requests/[id]/route.ts`
- `supabase/migrations/20260906000000_add_hall_submission_state.sql`
- `supabase/migrations/20260906010000_add_hall_published_at.sql`
- `supabase/migrations/20260907100815_create_case_update_requests.sql`
- `supabase/migrations/20260907101039_lock_case_update_requests_public_access.sql`
