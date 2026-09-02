import { getRedis } from '../../../../db/redis'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 定义 params 的类型为 Promise
type Params = Promise<{ slug: string }>
const BOT_USER_AGENT = /bot|crawler|spider|slurp|bingpreview|prerender/i

export async function POST(
  request: Request,
  props: { params: Params } // 注意这里：params 是一个 Promise
) {
  const params = await props.params
  const slug = params.slug

  const userAgent = request.headers.get('user-agent') || ''
  const isBot = userAgent.length > 0 && BOT_USER_AGENT.test(userAgent)
  const redis = getRedis()
  if (!redis) return NextResponse.json({ views: 0, counted: false }, { status: 503 })

  try {
    if (isBot) {
      const views = (await redis.get<number>(`pageviews:${slug}`)) ?? 0
      return NextResponse.json({ views, counted: false })
    }

    const views = await redis.incr(`pageviews:${slug}`)
    return NextResponse.json({ views })
  } catch {
    return NextResponse.json({ error: 'Failed to increment view' }, { status: 500 })
  }
}

export async function GET(
  _req: Request,
  props: { params: Params } // GET 方法同样需要修改类型
) {
  const params = await props.params
  const slug = params.slug
  const redis = getRedis()
  if (!redis) return NextResponse.json({ views: 0 })

  try {
    const views = (await redis.get<number>(`pageviews:${slug}`)) ?? 0
    return NextResponse.json({ views })
  } catch {
    return NextResponse.json({ views: 0 }, { status: 200 }) // 出错时降级返回 0
  }
}
