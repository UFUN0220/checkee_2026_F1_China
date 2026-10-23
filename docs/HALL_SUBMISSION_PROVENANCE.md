# Hall submission provenance

`source = submission_user` describes the Hall category. It does not, by itself,
prove that a row came from a web form. Consumers must classify it using
`source_record_id`:

| Origin                        | `source_record_id`                       | How to verify                                                                                                                                      | Published snapshot                                       |
| ----------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Existing web form             | Decimal `case_submissions.id`            | Require `case_id = submission-<id>` and a matching `case_submissions` row with `source = submission_user` and `visibility = published`             | Include, with `submissionOrigin: legacy_case_submission` |
| Future direct Master web form | `master:<allocated sequence id>`         | Require the `master:` namespace; the shared Hall allocator still supplies the `submission-*` case ID, but the token is not a `case_submissions.id` | Include, with `submissionOrigin: master_submission`      |
| Legacy identity migration     | `legacy-migration:<batch>:<old_case_id>` | Require exactly one `hall_case_identity_migrations` row matching old/new IDs, source values, source orders, source record IDs, and batch marker    | Exclude; it is not a web submission                      |

The Hall exporter validates the full migration map before export. Duplicate old
IDs, new IDs, source-order tuples, or source-record identities fail the export.
A missing or mismatched map row for a `legacy-migration:` Master record is a hard
error and prevents release output.

The identity map is append-only audit data. It lets Admin Hall Diff pair an old
Release ID with its new ID while leaving every historical Release untouched.
The map migration is deliberately separate from the Master identity update and
must be applied before deploying code that reads the map.

New direct submissions call `submit_hall_case`, which invokes the shared
allocator and inserts the pending Master row in one database transaction. It
uses a server HMAC of the request token for retry idempotency and a separate
server HMAC of the trusted proxy address for a persisted five-per-15-minute
rate limit. On Vercel, the handler uses only the platform-owned
`x-vercel-forwarded-for` header; it ignores client-supplied forwarding headers
and fails closed with 503 when no trusted address is available. A third HMAC
binds the token to the normalized form payload, so a reused token with changed
data is rejected. The browser sends form fields and an idempotency token; it
cannot choose case identity or visibility.

`review_hall_master_submission` conditionally changes only a direct Master
row whose `source_record_id` matches its numeric case ID and whose current
visibility is pending. The Admin API checks the existing Admin session and
same-origin request before invoking this service-role-only function. Legacy
`case_submissions` continue through the existing synchronization RPC.

The combined Admin queue includes old submissions and direct Master
submissions, validates migration markers against the authoritative map, and
excludes migration-only rows. Published counts deduplicate old Master mirrors
against their source `case_submissions` rows. The Phase 4A mapping migration
must be applied before deploying this code because the queue, backlog, and
exporter fail closed when the authoritative mapping table is unavailable.
