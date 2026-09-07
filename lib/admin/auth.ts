import 'server-only'

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'

export const ADMIN_SESSION_COOKIE = 'checkee_admin_session'
export const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60

function readAdminConfig() {
  const password = process.env.ADMIN_PASSWORD?.trim()
  if (!password) return null

  return {
    password,
    sessionSecret: process.env.ADMIN_SESSION_SECRET?.trim() || password,
  }
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function createAdminSessionValue(now = Math.floor(Date.now() / 1000)) {
  const config = readAdminConfig()
  if (!config) return null

  const payload = `v1.${now}.${randomBytes(16).toString('hex')}`
  return `${payload}.${sign(payload, config.sessionSecret)}`
}

export function verifyAdminSession(value: string | undefined, now = Math.floor(Date.now() / 1000)) {
  const config = readAdminConfig()
  if (!config || !value) return false

  const parts = value.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return false

  const issuedAt = Number(parts[1])
  if (!Number.isSafeInteger(issuedAt)) return false
  if (issuedAt > now + 60 || now - issuedAt > ADMIN_SESSION_MAX_AGE) return false

  const payload = parts.slice(0, 3).join('.')
  return signaturesMatch(parts[3], sign(payload, config.sessionSecret))
}

export async function isAdminAuthenticated() {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  return verifyAdminSession(session)
}

export function setAdminSessionCookie(response: NextResponse) {
  const value = createAdminSessionValue()
  if (!value) return false

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE,
  })
  return true
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return true

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export function isAdminPassword(value: unknown) {
  const config = readAdminConfig()
  if (!config || typeof value !== 'string') return false

  return signaturesMatch(value, config.password)
}
