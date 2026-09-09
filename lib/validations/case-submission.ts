import { z } from 'zod'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u

export const SUBMISSION_LOCATIONS = ['北京', '上海', '广州', '沈阳', '武汉'] as const
export type SubmissionLocation = (typeof SUBMISSION_LOCATIONS)[number]
const DEGREES = ['Bachelor', 'Master', 'PhD'] as const
export const STATUSES = ['Check', 'Approved', 'Issued', 'Refused'] as const
export type CaseSubmissionStatus = (typeof STATUSES)[number]

export function normalizeSubmissionStatus(
  status: CaseSubmissionStatus,
  endDate: string | null | undefined
): CaseSubmissionStatus {
  return status === 'Refused' && !endDate ? 'Check' : status
}

const LEGACY_LOCATION_ALIASES: Record<string, SubmissionLocation> = {
  beijing: '北京',
  shanghai: '上海',
  guangzhou: '广州',
  shenyang: '沈阳',
  wuhan: '武汉',
}

export function normalizeSubmissionLocation(value: string): SubmissionLocation | null {
  const normalized = value.trim()
  if (!normalized) return null
  if ((SUBMISSION_LOCATIONS as readonly string[]).includes(normalized)) {
    return normalized as SubmissionLocation
  }
  return LEGACY_LOCATION_ALIASES[normalized.toLowerCase()] ?? null
}

const selectionField = <T extends readonly [string, ...string[]]>(options: T, message: string) =>
  z
    .string()
    .trim()
    .refine((value): value is T[number] => options.includes(value), { message })

function isRealIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

const requiredText = (message: string, max: number, maxMessage: string) =>
  z.string().trim().min(1, { message }).max(max, { message: maxMessage })

const dateField = z
  .string()
  .trim()
  .min(1, { message: '请选择日期' })
  .refine(isRealIsoDate, { message: '请输入有效的日期' })

export const caseSubmissionSchema = z
  .object({
    name: z.string().trim().max(120, { message: '名字不能超过 120 个字符' }),
    location: selectionField(SUBMISSION_LOCATIONS, '请选择面签地点'),
    degree: selectionField(DEGREES, '请选择学位'),
    major: requiredText('请填写专业', 120, '专业不能超过 120 个字符'),
    interviewDate: dateField,
    status: selectionField(STATUSES, '请选择状态'),
    endDate: z.string().trim(),
    school: z.string().trim().max(160, { message: '学校不能超过 160 个字符' }),
    note: z.string().trim().max(1000, { message: '备注不能超过 1000 个字符' }),
  })
  .superRefine((values, context) => {
    if (values.status === 'Check' || values.endDate === '') return

    if (!isRealIsoDate(values.endDate)) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: '请输入有效的日期',
      })
      return
    }

    if (values.endDate < values.interviewDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: '结束日期不能早于面试日期',
      })
    }
  })
  .transform((values) => {
    const endDate = values.endDate === '' ? null : values.endDate
    const status = normalizeSubmissionStatus(values.status, endDate)

    return {
      ...values,
      name: values.name === '' ? null : values.name,
      status,
      endDate: status === 'Check' ? null : endDate,
      school: values.school === '' ? null : values.school,
      note: values.note === '' ? null : values.note,
    }
  })

export type CaseSubmissionFormValues = z.input<typeof caseSubmissionSchema>
export type CaseSubmissionValues = z.output<typeof caseSubmissionSchema>

export { DEGREES }
