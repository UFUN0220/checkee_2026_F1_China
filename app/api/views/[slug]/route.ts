import redis from '../../../../db/redis'// 确保这里指向你正确的 redis.ts 路径
import { NextResponse } from 'next/server'

export const runtime = 'edge'

// 定义 params 的类型为 Promise
type Params = Promise<{ slug: string }>

export async function POST(
  _req: Request,
  props: { params: Params } // 注意这里：params 是一个 Promise
) {
  // 关键修改：必须先 await params
  const params = await props.params
  const slug = params.slug
  
  // 记录日志方便调试（可选）
  // console.log('Incrementing view for:', slug)

  try {
    // 增加计数
    const views = await redis.incr(`pageviews:${slug}`)
    return NextResponse.json({ views })
  } catch (error) {
    console.error('Redis Error:', error)
    return NextResponse.json({ error: 'Failed to increment view' }, { status: 500 })
  }
}

export async function GET(
  _req: Request,
  props: { params: Params } // GET 方法同样需要修改类型
) {
  // 关键修改：必须先 await params
  const params = await props.params
  const slug = params.slug

  try {
    // 获取计数
    const views = (await redis.get<number>(`pageviews:${slug}`)) ?? 0
    return NextResponse.json({ views })
  } catch {
    return NextResponse.json({ views: 0 }, { status: 200 }) // 出错时降级返回 0
  }
}
