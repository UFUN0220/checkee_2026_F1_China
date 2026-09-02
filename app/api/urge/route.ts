import { createHash, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getRedis } from '~/db/redis'
import { getSupabaseClient } from '~/utils/supabase'

const CLIENT_COOKIE = 'ufun_urge_client'
const RATE_LIMIT_WINDOW_SECONDS = 5 * 60
const URGE_RATE_LIMIT_PREFIX = 'urge:rate-limit:'

type UrgeCountResponse = {
  count: number
  available: boolean
}

function getClientCookie(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CLIENT_COOKIE}=`))

  return cookie?.slice(`${CLIENT_COOKIE}=`.length) || randomUUID()
}

function getClientKey(clientId: string) {
  return createHash('sha256').update(clientId).digest('hex')
}

function responseWithCookie(body: UrgeCountResponse & Record<string, unknown>, clientId: string, status = 200) {
  const response = NextResponse.json(body, { status })
  response.cookies.set(CLIENT_COOKIE, clientId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

function unavailableResponse(clientId: string) {
  return responseWithCookie(
    { count: 0, available: false, accepted: false, code: 'STORAGE_UNAVAILABLE' },
    clientId,
    503
  )
}

async function readCount(): Promise<UrgeCountResponse> {
  const supabase = getSupabaseClient()
  if (!supabase) return { count: 0, available: false }

  const { data, error } = await supabase.from('counters').select('count').eq('id', 'urge').maybeSingle()
  if (error || typeof data?.count !== 'number') {
    if (process.env.NODE_ENV !== 'production') console.warn('[Urge] Counter read unavailable')
    return { count: 0, available: false }
  }

  return { count: data.count, available: true }
}

export async function GET(request: Request) {
  const clientId = getClientCookie(request)
  return responseWithCookie(await readCount(), clientId)
}

export async function POST(request: Request) {
  const clientId = getClientCookie(request)
  const clientKey = getClientKey(clientId)
  const redis = getRedis()
  if (!redis) return unavailableResponse(clientId)

  const rateLimitKey = `${URGE_RATE_LIMIT_PREFIX}${clientKey}`
  try {
    const reserved = await redis.set(rateLimitKey, '1', {
      nx: true,
      ex: RATE_LIMIT_WINDOW_SECONDS,
    })

    if (reserved !== 'OK') {
      const current = await readCount()
      return responseWithCookie(
        {
          ...current,
          accepted: false,
          code: 'RATE_LIMITED',
          retryAfter: RATE_LIMIT_WINDOW_SECONDS,
        },
        clientId,
        429
      )
    }
  } catch {
    if (process.env.NODE_ENV !== 'production') console.warn('[Urge] Rate limit storage unavailable')
    return unavailableResponse(clientId)
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    await redis.del(rateLimitKey).catch(() => undefined)
    return unavailableResponse(clientId)
  }

  const { error } = await supabase.rpc('increment_urge')
  if (error) {
    if (process.env.NODE_ENV !== 'production') console.warn('[Urge] Counter update unavailable')
    await redis.del(rateLimitKey).catch(() => undefined)
    return unavailableResponse(clientId)
  }

  const current = await readCount()
  if (!current.available) {
    return responseWithCookie(
      { ...current, accepted: false, code: 'STORAGE_UNAVAILABLE' },
      clientId,
      503
    )
  }

  return responseWithCookie({ ...current, accepted: true }, clientId)
}
