from __future__ import annotations

import json
from pathlib import Path


def load(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding='utf-8'))


def summary(payload: dict) -> dict:
    manifest = payload['manifest']
    return {
        'snapshotDate': manifest['snapshotDate'],
        'total': manifest['recordCount'],
        'sourceMonths': manifest['sourceMonths'],
        'cityCounts': manifest['locationCounts'],
        'statusCounts': manifest['statusCounts'],
        'monthlyCounts': {row['month']: row['totalCount'] for row in payload['monthlyF1Trends']},
        'monthlyMedians': {row['month']: row['medianWaitingDays'] for row in payload['monthlyF1Trends']},
        'cityQuartiles': {
            city: {
                'q1': payload['locations'][city]['waitStats']['q1'],
                'median': payload['locations'][city]['waitStats']['median'],
                'q3': payload['locations'][city]['waitStats']['q3'],
            }
            for city in ('beijing', 'shanghai', 'guangzhou', 'shenyang', 'wuhan')
        },
    }


old = summary(load('..\\json\\checkmate\\checkee-static-snapshot.json'))
new = summary(load('view-candidate.json'))
print(json.dumps({'old': old, 'new': new}, ensure_ascii=False, indent=2))
