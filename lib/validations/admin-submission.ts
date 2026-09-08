import { z } from 'zod'

export const adminSubmissionDecisionSchema = z.object({
  visibility: z.enum(['published', 'rejected'], {
    message: '请选择有效的审核结果',
  }),
})

export type AdminSubmissionDecisionFormValues = z.input<typeof adminSubmissionDecisionSchema>
export type AdminSubmissionDecisionValues = z.output<typeof adminSubmissionDecisionSchema>
