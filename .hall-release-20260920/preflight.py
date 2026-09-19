from __future__ import annotations

import json
import os
import re
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen


def load_env() -> None:
    for line in Path('..\\.env.local').read_text(encoding='utf-8').splitlines():
        match = re.match(r'^\s*(SUPABASE_URL|SUPABASE_SECRET_KEY)\s*=\s*(.*?)\s*$', line)
        if match:
            value = match.group(2).strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            os.environ[match.group(1)] = value


def read_table(table: str, select: str, order: str, filters: dict[str, str] | None = None) -> list[dict]:
    parts = urlsplit(os.environ['SUPABASE_URL'].strip().rstrip('/'))
    endpoint = urlunsplit((parts.scheme, parts.netloc, f'{parts.path.rstrip("/")}/rest/v1/{table}', '', ''))
    params = {'select': select, 'order': order}
    if filters:
        params.update(filters)
    query = urlencode(params, safe=',.')
    request = Request(
        f'{endpoint}?{query}',
        headers={
            'apikey': os.environ['SUPABASE_SECRET_KEY'].strip(),
            'Accept': 'application/json',
            'User-Agent': 'checkee-hall-preflight/1.0',
        },
        method='GET',
    )
    with urlopen(request, timeout=30) as response:
        rows = json.loads(response.read().decode('utf-8'))
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise RuntimeError(f'Unexpected response from {table}')
    return rows


load_env()
master = read_table(
    'hall_cases_master',
    'case_id,source,source_order,visibility',
    'source.asc,source_order.asc,case_id.asc',
)
published = read_table(
    'case_submissions',
    'id,visibility,source',
    'id.asc',
    {'visibility': 'eq.published'},
)

case_ids = [row.get('case_id') for row in master]
source_orders = [(row.get('source'), row.get('source_order')) for row in master]
master_submission_ids = {
    row['case_id']
    for row in master
    if row.get('source') == 'submission_user' and isinstance(row.get('case_id'), str)
}
published_ids = {f'submission-{row["id"]}' for row in published}
summary = {
    'total': len(master),
    'source_counts': dict(Counter(row.get('source') for row in master)),
    'duplicate_case_id': len(case_ids) - len(set(case_ids)),
    'missing_case_id': sum(not isinstance(case_id, str) or not case_id.strip() for case_id in case_ids),
    'duplicate_source_order': len(source_orders) - len(set(source_orders)),
    'null_source_order': sum(row.get('source_order') is None for row in master),
    'published_submission_count': len(published),
    'published_submission_missing_from_master': sorted(published_ids - master_submission_ids),
    'master_submission_without_published_row': sorted(master_submission_ids - published_ids),
}
Path('preflight-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
if summary['published_submission_missing_from_master']:
    raise SystemExit('published submissions missing from master')
if summary['master_submission_without_published_row']:
    raise SystemExit('master submission row missing from published submissions')
if any(summary[key] for key in ('duplicate_case_id', 'missing_case_id', 'duplicate_source_order', 'null_source_order')):
    raise SystemExit('master identity/order integrity check failed')
