import 'server-only'

const FAILURE_WINDOW_MS = 10 * 60 * 1000
const MAX_FAILURES = 5
const BLOCK_DURATION_MS = 15 * 60 * 1000
const MAX_TRACKED_KEYS = 10_000

type LoginAttempt = {
  firstFailureAt: number
  failures: number
  blockedUntil: number
}

const attempts = new Map<string, LoginAttempt>()

function cleanup(now: number) {
  for (const [key, attempt] of attempts) {
    if (now - attempt.firstFailureAt > FAILURE_WINDOW_MS && attempt.blockedUntil <= now) {
      attempts.delete(key)
    }
  }

  if (attempts.size <= MAX_TRACKED_KEYS) return

  const oldest = [...attempts.entries()]
    .sort(([, left], [, right]) => left.firstFailureAt - right.firstFailureAt)
    .slice(0, attempts.size - MAX_TRACKED_KEYS)

  for (const [key] of oldest) attempts.delete(key)
}

export function getAdminLoginClientKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const forwardedAddress = forwardedFor?.split(',')[0]?.trim()
  return forwardedAddress || request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export function getAdminLoginRateLimit(key: string, now = Date.now()) {
  cleanup(now)
  const attempt = attempts.get(key)
  const blockedUntil = attempt?.blockedUntil ?? 0

  return {
    blocked: blockedUntil > now,
    retryAfterSeconds: blockedUntil > now ? Math.ceil((blockedUntil - now) / 1000) : 0,
  }
}

export function recordAdminLoginFailure(key: string, now = Date.now()) {
  cleanup(now)
  const current = attempts.get(key)
  const withinWindow = current && now - current.firstFailureAt <= FAILURE_WINDOW_MS
  const attempt: LoginAttempt = withinWindow
    ? { ...current, failures: current.failures + 1 }
    : { firstFailureAt: now, failures: 1, blockedUntil: 0 }

  if (attempt.failures >= MAX_FAILURES) {
    attempt.blockedUntil = now + BLOCK_DURATION_MS
  }

  attempts.set(key, attempt)
  return {
    blocked: attempt.blockedUntil > now,
    retryAfterSeconds:
      attempt.blockedUntil > now ? Math.ceil((attempt.blockedUntil - now) / 1000) : 0,
  }
}

export function clearAdminLoginFailures(key: string) {
  attempts.delete(key)
}
