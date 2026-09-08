# Form Migration Plan

这份计划用于后续逐步把现有表单迁移到 React Hook Form、Zod 和新的基础 UI 组件。
本轮只建立基础设施，不迁移现有 Dialog，不改变任何用户流程、API endpoint、数据结构、Supabase 或 Admin 状态流。

## Phase 1：基础设施

### 替换文件

- 新增 `lib/validations/case-submission.ts`
- 新增 `lib/validations/update-request.ts`
- 新增 `lib/validations/other-feedback.ts`
- 新增 `components/ui/dialog.tsx`
- 新增 `components/ui/button.tsx` 的玉石主题基础实现
- 新增 `components/ui/form.tsx`
- 新增 `components/ui/input.tsx`
- 新增 `components/ui/textarea.tsx`
- 新增 `components/ui/select.tsx`
- 新增 `components/ui/label.tsx`
- 新增 `components/forms/`
- 新增 `styles/forms.css`
- 在 `app/layout.tsx` 引入表单 token

### 风险

- 基础组件可能被后续迁移误用于改变现有业务行为。
- schema 的输入类型需要兼容 HTML 表单的空字符串，同时输出类型要符合现有 API payload 语义。
- 新 token 必须和现有浅色、深色主题共存。

### 回归测试

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `git diff --check`
- 确认现有 Dialog 仍使用原有状态管理和提交逻辑。

## Phase 2：更新数据 Dialog

### 替换文件

- `components/checkmate/contact-case-dialog.tsx`
- 复用 `lib/validations/update-request.ts`、`components/forms/` 和 `components/ui/`。

### 风险

- 更新内容的 trim、4000 字符上限、可选邮箱和原有 API payload 语义发生变化。
- Dialog 打开关闭、提交中状态、成功反馈和错误反馈回归。

### 回归测试

- 空内容、超长内容、合法邮箱、非法邮箱、空邮箱。
- API endpoint、字段名和成功反馈保持不变。
- 提交失败后可继续编辑并再次提交。

## Phase 3：提交案例 Dialog

### 替换文件

- `components/checkmate/submit-case-dialog.tsx`
- 复用 `lib/validations/case-submission.ts`、`components/forms/` 和 `components/ui/`。

### 风险

- 状态为 `Check` 时清空 `endDate` 的前端行为必须保持。
- 日期必须是真实的 `YYYY-MM-DD`，且结束日期不能早于面试日期。
- 可选字段的空值规范、位置/学历/状态枚举和 API payload 不能改变。

### 回归测试

- 五个城市、三个学历、四种状态均可提交。
- 必填项、非法日期、日期顺序、`Check` 自动清空结束日期。
- school/note 空值和长度边界。
- 提交成功、重复提交防护、失败反馈和列表刷新。

## Phase 4：其他反馈

### 替换文件

- 定位使用其他反馈表单的组件后，替换其本地 state 校验。
- 使用 `lib/validations/other-feedback.ts` 和通用表单基础组件。

### 风险

- 当前其他反馈走 mailto 流程，不能误接入 API 或改变收件人和邮件内容。
- trim 后为空的校验提示需要保持可理解。

### 回归测试

- 空白输入被阻止，非空反馈正常生成原有 mailto 内容。
- 取消、关闭和移动端键盘交互保持不变。

## Phase 5：Admin

### 替换文件

- 仅在前台表单迁移稳定后，评估 Admin 表单组件和其对应的校验入口。
- 迁移前先列出具体 Admin 文件和状态流，不在本轮预先修改。

### 风险

- Admin 状态流、权限边界、批量操作和服务端校验的回归风险最高。
- 前台 schema 不应直接覆盖 Admin 专属规则。

### 回归测试

- 权限、状态转换、批量操作、失败回滚和审计信息。
- 前台公开 API 与 Admin 操作互不影响。
- 完整 lint、typecheck、build，以及端到端回归。
