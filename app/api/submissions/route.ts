import { getSupabaseServerClient } from '~/lib/supabase/server'
import { handleHallSubmissionPost } from '~/lib/submissions/submit-hall-case-handler'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
  if (!secret) {
    return Response.json({ error: '提交暂不可用，请稍后重试。' }, { status: 503 })
  }

  const supabase = getSupabaseServerClient()
  return handleHallSubmissionPost(request, {
    secret,
    submit: async (args) => {
      const { data, error } = await supabase.rpc('submit_hall_case', args).maybeSingle()
      return {
        data: data as { case_id?: string | null; rate_limited?: boolean } | null,
        error,
      }
    },
  })
}
