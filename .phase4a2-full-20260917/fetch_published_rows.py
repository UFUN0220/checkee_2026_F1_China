from __future__ import annotations

import json
import os
import re
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen


def load_env() -> None:
    for line in Path('.env.local').read_text(encoding='utf-8').splitlines():
        match = re.match(r'^\s*(SUPABASE_URL|SUPABASE_SECRET_KEY)\s*=\s*(.*?)\s*$', line)
        if match:
            value = match.group(2).strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            os.environ[match.group(1)] = value


load_env()
base_url = os.environ['SUPABASE_URL'].strip()
api_key = os.environ['SUPABASE_SECRET_KEY'].strip()
parts = urlsplit(base_url.rstrip('/'))
endpoint = urlunsplit((parts.scheme, parts.netloc, f'{parts.path.rstrip("/")}/rest/v1/case_submissions', '', ''))
query = urlencode({
    'select': 'id,name,location,degree,major,school,interview_date,end_date,status,note,compact_note,detail_note,source,visibility,published_at',
    'visibility': 'eq.published',
    'order': 'id.asc',
}, safe=',.')
request = Request(
    f'{endpoint}?{query}',
    headers={'apikey': api_key, 'Accept': 'application/json', 'User-Agent': 'checkee-hall-parity-input/1.0'},
    method='GET',
)
with urlopen(request, timeout=30) as response:
    rows = json.loads(response.read().decode('utf-8'))
if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
    raise RuntimeError('Supabase returned an unexpected response')
if len(rows) != 78:
    raise RuntimeError(f'Expected 78 published rows, received {len(rows)}')

master = json.loads(Path('.phase4a2-work-20260917/master-candidate.json').read_text(encoding='utf-8'))
master_ids = [row['id'] for row in master['records'] if row.get('source') == 'submission_user']
by_id = {f'submission-{row["id"]}': row for row in rows}
if set(master_ids) != set(by_id):
    raise RuntimeError('Published submission IDs do not match master candidate submission IDs')
ordered = [by_id[case_id] for case_id in master_ids]
Path('.phase4a2-full-20260917/published-rows-input.json').write_text(
    json.dumps(ordered, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
)
checks = {
    str(row['id']): {
        'note_present': bool(row.get('note')),
        'compact_note_present': bool(row.get('compact_note')),
        'detail_note_present': bool(row.get('detail_note')),
    }
    for row in ordered if str(row['id']) in {'94', '95'}
}
print(json.dumps({'rows': len(ordered), 'submission_94_95_fields_present': checks}, ensure_ascii=False, sort_keys=True))
