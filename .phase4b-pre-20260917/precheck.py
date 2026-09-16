import json
from collections import Counter
from pathlib import Path

master_candidate = json.loads(Path('master-candidate.json').read_text(encoding='utf-8'))
master_rows = json.loads(Path('master-rows.json').read_text(encoding='utf-8'))
published = json.loads(Path('..\\.phase4a2-full-20260917\\published-rows-input.json').read_text(encoding='utf-8'))
records = master_candidate['records']
ids = [row['case_id'] for row in master_rows]
source_orders = [(row['source'], row.get('source_order')) for row in master_rows]
published_ids = {f'submission-{row["id"]}' for row in published}
master_ids = set(ids)
checks = {
    'total': len(records),
    'source_counts': dict(Counter(row['source'] for row in records)),
    'missing_case_id': sum(not isinstance(row.get('case_id'), str) or not row['case_id'].strip() for row in master_rows),
    'duplicate_case_id': len(ids) - len(set(ids)),
    'duplicate_source_order': len(source_orders) - len(set(source_orders)),
    'null_source_order': sum(row.get('source_order') is None for row in master_rows),
    'published_submission_count': len(published),
    'published_submission_missing_from_master': sorted(published_ids - master_ids),
}
print(json.dumps(checks, ensure_ascii=False, sort_keys=True))
if checks['total'] != 190 or checks['source_counts'] != {'legacy_excel': 112, 'submission_user': 78}:
    raise SystemExit('pre-cutover count check failed')
if any(checks[key] for key in ('missing_case_id', 'duplicate_case_id', 'duplicate_source_order', 'null_source_order')):
    raise SystemExit('pre-cutover integrity check failed')
if checks['published_submission_missing_from_master']:
    raise SystemExit('published submissions missing from master')
