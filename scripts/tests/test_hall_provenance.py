import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


exporter = load_module("export_hall_master", "scripts/export-hall-master.py")
master_exporter = load_module(
    "export_hall_master_from_supabase", "scripts/export-hall-master-from-supabase.py"
)
verifier = load_module("verify_hall_data", "scripts/verify-hall-data.py")


def master_row(case_id, source_record_id, visibility="published", source="submission_user"):
    return {
        "case_id": case_id,
        "nickname": "test",
        "location": "北京",
        "degree": "Master",
        "major": "CS",
        "school": None,
        "interview_date": "2026-01-01",
        "end_date": None,
        "status": "Check",
        "note": None,
        "compact_note": None,
        "detail_note": None,
        "source": source,
        "source_record_id": source_record_id,
        "visibility": visibility,
        "published_at": "2026-01-02" if visibility == "published" else None,
        "source_order": 1,
    }


def migration_mapping(
    old_case_id="ufun-checkee-003",
    new_case_id="submission-169",
    old_source_order=3,
    new_source_order=169,
    batch="batch-a",
):
    return {
        "old_case_id": old_case_id,
        "new_case_id": new_case_id,
        "old_source": "legacy_excel",
        "new_source": "submission_user",
        "old_source_order": old_source_order,
        "new_source_order": new_source_order,
        "old_source_record_id": old_case_id,
        "new_source_record_id": f"legacy-migration:{batch}:{old_case_id}",
        "migrated_at": "2026-10-16T00:00:00+00:00",
        "migration_batch": batch,
    }


class HallProvenanceTests(unittest.TestCase):
    def test_exporter_excludes_pending_and_rejected_without_losing_them_from_audit_counts(self):
        rows = [
            master_row("submission-16", "16"),
            master_row("submission-201", "master:token-201", "pending"),
            master_row("submission-202", "master:token-202", "rejected"),
        ]

        published, counts = master_exporter.published_rows(rows)

        self.assertEqual([row["case_id"] for row in published], ["submission-16"])
        self.assertEqual(counts, {"published": 1, "pending": 1, "rejected": 1})

    def test_provenance_uses_source_record_id_and_verifies_old_submissions(self):
        self.assertEqual(
            master_exporter.classify_submission_origin("submission-16", "16", {"16"}),
            "legacy_case_submission",
        )
        self.assertEqual(
            master_exporter.classify_submission_origin("submission-167", "master:167", set()),
            "master_submission",
        )
        mapping = migration_mapping()
        self.assertEqual(
            master_exporter.classify_submission_origin(
                "submission-169",
                "legacy-migration:batch-a:ufun-checkee-003",
                set(),
                [mapping],
                169,
            ),
            "legacy_migration",
        )
        with self.assertRaisesRegex(ValueError, "no matching identity map row"):
            master_exporter.classify_submission_origin(
                "submission-169", "legacy-migration:batch-a:ufun-checkee-003", set(), [], 169
            )
        with self.assertRaisesRegex(ValueError, "source_order does not match"):
            master_exporter.classify_submission_origin(
                "submission-169",
                "legacy-migration:batch-a:ufun-checkee-003",
                set(),
                [mapping],
                168,
            )
        with self.assertRaisesRegex(ValueError, "no matching published case_submissions row"):
            master_exporter.classify_submission_origin("submission-16", "16", set())

    def test_migration_map_is_one_to_one_and_matches_master_identity_fields(self):
        mapping = migration_mapping()
        migrated_row = master_row(
            mapping["new_case_id"], mapping["new_source_record_id"], source="submission_user"
        )
        migrated_row["source_order"] = mapping["new_source_order"]
        self.assertEqual(
            master_exporter.validate_migration_rows([migrated_row], [mapping])[mapping["new_case_id"]],
            mapping,
        )

        with self.assertRaisesRegex(ValueError, "no matching identity map row"):
            master_exporter.validate_migration_rows([migrated_row], [])

        mismatched_row = {**migrated_row, "source_order": mapping["new_source_order"] + 1}
        with self.assertRaisesRegex(ValueError, "does not match its migration map row"):
            master_exporter.validate_migration_rows([mismatched_row], [mapping])

        duplicate_target = {**mapping, "old_case_id": "ufun-checkee-004", "new_case_id": "submission-170"}
        duplicate_target["old_source_record_id"] = duplicate_target["old_case_id"]
        duplicate_target["new_source_record_id"] = (
            f"legacy-migration:{duplicate_target['migration_batch']}:{duplicate_target['old_case_id']}"
        )
        with self.assertRaisesRegex(ValueError, "duplicates an identity"):
            master_exporter.validate_identity_migration_mappings([mapping, duplicate_target])

        duplicate_old_id = {
            **mapping,
            "new_case_id": "submission-170",
            "old_source_order": 4,
            "new_source_order": 170,
        }
        duplicate_old_id["new_source_record_id"] = (
            f"legacy-migration:{duplicate_old_id['migration_batch']}:{duplicate_old_id['old_case_id']}"
        )
        with self.assertRaisesRegex(ValueError, "duplicates an identity"):
            master_exporter.validate_identity_migration_mappings([mapping, duplicate_old_id])

    def test_snapshot_includes_real_origins_but_excludes_migrated_legacy(self):
        rows = [
            {"id": "submission-16", "submissionOrigin": "legacy_case_submission"},
            {"id": "submission-201", "submissionOrigin": "master_submission"},
            {"id": "submission-169", "submissionOrigin": "legacy_migration"},
        ]
        snapshot = master_exporter.real_submission_snapshot_records(rows)
        self.assertEqual([row["id"] for row in snapshot], ["submission-16", "submission-201"])
        self.assertEqual(master_exporter.migration_identity_count(rows), 1)

    def test_snapshot_accepts_optional_origin_and_legacy_snapshot_without_it(self):
        record = {
            "id": "submission-16",
            "nickname": None,
            "location": "北京",
            "degree": "Master",
            "major": "CS",
            "school": None,
            "startDate": "2026-01-01",
            "endDate": None,
            "waitingDays": 1,
            "status": "Check",
            "note": None,
            "compactNote": None,
            "detailNote": None,
            "publishedAt": "2026-01-02",
            "source": "submission_user",
            "visibility": "published",
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "snapshot.json"
            for origin in (None, "legacy_case_submission"):
                candidate = {**record}
                if origin:
                    candidate["submissionOrigin"] = origin
                path.write_text(
                    json.dumps({"schemaVersion": 1, "generatedAt": "2026-01-02", "records": [candidate]}),
                    encoding="utf-8",
                )
                self.assertEqual(len(exporter.read_published_snapshot(path)[1]), 1)
                self.assertEqual(len(verifier.verify_published_snapshot(json.loads(path.read_text()))), 1)

    def test_verifier_distinguishes_master_and_published_counts(self):
        row = {
            "id": "case-1",
            "nickname": "test",
            "location": "北京",
            "degree": "Master",
            "major": "CS",
            "school": None,
            "startDate": "2026-01-01",
            "endDate": None,
            "waitingDays": 1,
            "status": "Check",
            "note": None,
            "compactNote": None,
            "detailNote": None,
            "publishedAt": "2026-01-02",
            "source": "legacy_excel",
            "visibility": "published",
        }
        dataset = {
            "schemaVersion": 1,
            "dataVersion": "20260102-v001",
            "generatedAt": "2026-01-02",
            "sourceDescription": "test",
            "snapshotDate": "2026-01-02",
            "recordCount": 1,
            "masterRecordCount": 3,
            "publishedRecordCount": 1,
            "records": [row],
        }

        verified, _ = verifier.verify_dataset(dataset)
        self.assertEqual(len(verified), 1)
        dataset["publishedRecordCount"] = 2
        with self.assertRaisesRegex(ValueError, "publishedRecordCount"):
            verifier.verify_dataset(dataset)


if __name__ == "__main__":
    unittest.main()
