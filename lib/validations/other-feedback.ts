import { z } from 'zod'

export const otherFeedbackSchema = z.object({
  otherMessage: z.string().trim().min(1, { message: '请填写反馈内容' }),
})

export type OtherFeedbackFormValues = z.input<typeof otherFeedbackSchema>
export type OtherFeedbackValues = z.output<typeof otherFeedbackSchema>
