import json
import os
import re
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen

for line in Path('..\\.env.local').read_text(encoding='utf-8').splitlines():
    match = re.match(r'^\s*(SUPABASE_URL|SUPABASE_SECRET_KEY)\s*=\s*(.*?)\s*$', line)
    if match:
        value = match.group(2).strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ[match.group(1)] = value

parts = urlsplit(os.environ['SUPABASE_URL'].strip().rstrip('/'))
endpoint = urlunsplit((parts.scheme, parts.netloc, f'{parts.path.rstrip("/")}/rest/v1/hall_cases_master', '', ''))
query = urlencode({'select': 'case_id,source,source_order,visibility', 'order': 'case_id.asc'}, safe=',.')
request = Request(
    f'{endpoint}?{query}',
    headers={'apikey': os.environ['SUPABASE_SECRET_KEY'].strip(), 'Accept': 'application/json', 'User-Agent': 'checkee-hall-precutover-check/1.0'},
    method='GET',
)
with urlopen(request, timeout=30) as response:
    rows = json.loads(response.read().decode('utf-8'))
if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
    raise RuntimeError('Unexpected master response')
Path('master-rows.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'rows': len(rows)}, ensure_ascii=False))
