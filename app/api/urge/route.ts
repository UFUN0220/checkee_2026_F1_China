import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSupabaseClient } from '~/utils/supabase'

const CLIENT_COOKIE = 'ufun_urge_client'
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
const recentClients = new Map<string, number>()

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

  return cookie?.slice(`${CLIENT_COOKIE}=`.length) || crypto.randomUUID()
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
  const now = Date.now()
  const lastAcceptedAt = recentClients.get(clientKey)

  if (lastAcceptedAt && now - lastAcceptedAt < RATE_LIMIT_WINDOW_MS) {
    const current = await readCount()
    return responseWithCookie(
      {
        ...current,
        accepted: false,
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastAcceptedAt)) / 1000),
      },
      clientId
    )
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return responseWithCookie(
      { count: 0, available: false, accepted: false, code: 'STORAGE_UNAVAILABLE' },
      clientId,
      503
    )
  }

  const { error } = await supabase.rpc('increment_urge')
  if (error) {
    if (process.env.NODE_ENV !== 'production') console.warn('[Urge] Counter update unavailable')
    return responseWithCookie(
      { count: 0, available: false, accepted: false, code: 'STORAGE_UNAVAILABLE' },
      clientId,
      503
    )
  }

  const current = await readCount()
  if (!current.available) {
    return responseWithCookie(
      { ...current, accepted: false, code: 'STORAGE_UNAVAILABLE' },
      clientId,
      503
    )
  }

  recentClients.set(clientKey, now)
  if (recentClients.size > 1000) {
    for (const [key, timestamp] of recentClients) {
      if (now - timestamp >= RATE_LIMIT_WINDOW_MS) recentClients.delete(key)
    }
  }

  return responseWithCookie({ ...current, accepted: true }, clientId)
}
