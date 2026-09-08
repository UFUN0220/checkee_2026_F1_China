import { z } from 'zod'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

export const updateRequestSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: '请填写更新内容' })
    .max(4000, { message: '更新内容不能超过 4000 个字符' }),
  email: z
    .string()
    .trim()
    .max(320, { message: '邮箱不能超过 320 个字符' })
    .refine((value) => value === '' || EMAIL_PATTERN.test(value), {
      message: '请输入有效的邮箱地址',
    })
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
})

export type UpdateRequestFormValues = z.input<typeof updateRequestSchema>
export type UpdateRequestValues = z.output<typeof updateRequestSchema>

const ADMIN_UPDATE_REQUEST_STATUSES = ['reviewing', 'completed', 'rejected'] as const

export const adminUpdateRequestStatusSchema = z.object({
  status: z.enum(ADMIN_UPDATE_REQUEST_STATUSES, {
    message: '请选择有效的处理状态',
  }),
})

export const adminUpdateRequestNoteSchema = z.object({
  admin_note: z
    .string()
    .max(4000, { message: '管理员备注不能超过 4000 个字符' })
    .transform((value) => value.trim() || null),
})

export const adminUpdateRequestPatchSchema = z
  .object({
    status: z.enum(ADMIN_UPDATE_REQUEST_STATUSES).optional(),
    admin_note: z
      .string()
      .max(4000, { message: '管理员备注不能超过 4000 个字符' })
      .transform((value) => value.trim() || null)
      .nullable()
      .optional(),
  })
  .refine((value) => value.status !== undefined || value.admin_note !== undefined, {
    message: '请至少提供一项更新内容',
  })

export type AdminUpdateRequestStatusFormValues = z.input<typeof adminUpdateRequestStatusSchema>
export type AdminUpdateRequestStatusValues = z.output<typeof adminUpdateRequestStatusSchema>
export type AdminUpdateRequestNoteFormValues = z.input<typeof adminUpdateRequestNoteSchema>
export type AdminUpdateRequestNoteValues = z.output<typeof adminUpdateRequestNoteSchema>
export type AdminUpdateRequestPatchValues = z.output<typeof adminUpdateRequestPatchSchema>

export { ADMIN_UPDATE_REQUEST_STATUSES }
