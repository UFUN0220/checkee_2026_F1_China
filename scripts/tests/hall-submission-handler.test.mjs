import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { createJiti } from 'jiti'

const { handleHallSubmissionPost } = await createJiti(import.meta.url).import(
  '../../lib/submissions/submit-hall-case-handler.ts'
)

const token = 'c49efc76-2e7a-4fa6-82c7-712a0d32463e'
process.env.VERCEL = '1'
const validBody = {
  name: 'sample',
  location: '北京',
  degree: 'Master',
  major: 'Computer Science',
  interviewDate: '2026-01-01',
  status: 'Refused',
  endDate: '',
  school: '',
  note: 'A useful note. More detail.',
  case_id: 'forged-case-id',
  source_order: -1,
  source_record_id: 'forged-source-id',
  visibility: 'published',
}

function request(body = validBody, headers = {}) {
  return new Request('https://checkee.example/api/submissions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': token,
      'x-vercel-forwarded-for': '192.0.2.8',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function fakeDatabase() {
  const rows = new Map()
  const idempotency = new Map()
  const fingerprints = new Map()
  let allocatedId = 0
  let rpcCalls = 0
  return {
    rows,
    get rpcCalls() { return rpcCalls },
    submit: async (args) => {
      rpcCalls += 1
      const prior = idempotency.get(args.p_idempotency_key)
      if (prior && fingerprints.get(args.p_idempotency_key) !== args.p_request_fingerprint) {
        return {
          data: null,
          error: { code: '22023', message: 'Idempotency key reused with different payload' },
        }
      }
      if (prior) return { data: { case_id: prior, visibility: rows.get(prior).visibility }, error: null }
      allocatedId += 1
      const caseId = `submission-${allocatedId}`
      const row = {
        case_id: caseId,
        source_record_id: `master:${allocatedId}`,
        source_order: allocatedId + 10,
        visibility: 'pending',
        published_at: null,
        status: args.p_status === 'Refused' && !args.p_end_date ? 'Check' : args.p_status,
        ...args,
      }
      rows.set(caseId, row)
      idempotency.set(args.p_idempotency_key, caseId)
      fingerprints.set(args.p_idempotency_key, args.p_request_fingerprint)
      return { data: { ...row, rate_limited: false }, error: null }
    },
  }
}

test('valid API submission writes only pending Master RPC data and safely normalizes fields', async () => {
  const db = fakeDatabase()
  const response = await handleHallSubmissionPost(request(), {
    secret: 'test-secret', submit: db.submit, now: new Date('2026-10-16T00:00:00Z'),
  })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { success: true, visibility: 'pending' })
  assert.equal(db.rows.size, 1)
  assert.equal(db.rpcCalls, 1)
  const [row] = db.rows.values()
  assert.match(row.case_id, /^submission-\d+$/)
  assert.equal(row.source_record_id, `master:${row.case_id.slice('submission-'.length)}`)
  assert.equal(row.visibility, 'pending')
  assert.equal(row.published_at, null)
  assert.equal(row.status, 'Check')
  assert.equal(
    row.p_rate_limit_key,
    createHmac('sha256', 'test-secret')
      .update('hall-submission-rate-limit\0' + '192.0.2.8')
      .digest('hex')
  )
  assert.equal(row.p_location, '北京')
  assert.equal(row.p_note, 'A useful note. More detail.')
  assert.equal('p_case_id' in row, false)
  assert.equal('p_visibility' in row, false)
})

test('the same idempotency token cannot create a second Master record', async () => {
  const db = fakeDatabase()
  const dependencies = { secret: 'test-secret', submit: db.submit, now: new Date('2026-10-16T00:00:00Z') }
  assert.equal((await handleHallSubmissionPost(request(), dependencies)).status, 200)
  assert.equal((await handleHallSubmissionPost(request(), dependencies)).status, 200)
  assert.equal(db.rows.size, 1)
  assert.equal(db.rpcCalls, 2)
})

test('an idempotency token cannot be reused for a different payload', async () => {
  const db = fakeDatabase()
  const dependencies = { secret: 'test-secret', submit: db.submit, now: new Date('2026-10-16T00:00:00Z') }
  assert.equal((await handleHallSubmissionPost(request(), dependencies)).status, 200)
  assert.equal((await handleHallSubmissionPost(request({ ...validBody, major: 'Different' }), dependencies)).status, 409)
  assert.equal(db.rows.size, 1)
})

test('oversized or invalid date payloads are rejected before the database RPC', async () => {
  const db = fakeDatabase()
  const tooLarge = await handleHallSubmissionPost(request(' '.repeat(16 * 1024 + 1)), {
    secret: 'test-secret', submit: db.submit,
  })
  const invalidDate = await handleHallSubmissionPost(request({ ...validBody, interviewDate: '2026-02-30' }), {
    secret: 'test-secret', submit: db.submit,
  })
  assert.equal(tooLarge.status, 413)
  assert.equal(invalidDate.status, 400)
  assert.equal(db.rpcCalls, 0)
})

test('untrusted forwarding headers are ignored and missing trusted client IP fails closed', async () => {
  const originalVercel = process.env.VERCEL
  delete process.env.VERCEL
  try {
    const db = fakeDatabase()
    const response = await handleHallSubmissionPost(
      request(validBody, {
        'x-forwarded-for': '198.51.100.42',
        'x-real-ip': '198.51.100.42',
        'x-vercel-forwarded-for': '',
      }),
      { secret: 'test-secret', submit: db.submit }
    )
    assert.equal(response.status, 503)
    assert.equal(db.rpcCalls, 0)
  } finally {
    if (originalVercel === undefined) delete process.env.VERCEL
    else process.env.VERCEL = originalVercel
  }
})

test('server returns the database rate-limit decision as 429', async () => {
  const response = await handleHallSubmissionPost(request(), {
    secret: 'test-secret',
    submit: async () => ({ data: { case_id: null, rate_limited: true }, error: null }),
  })
  assert.equal(response.status, 429)
  assert.equal(response.headers.get('retry-after'), '900')
})
