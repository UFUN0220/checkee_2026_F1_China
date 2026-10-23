import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20261016100000_phase4b_hall_direct_submission_and_review.sql"


class Phase4bSqlContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sql = MIGRATION.read_text(encoding="utf-8").lower()

    def test_submission_is_atomic_and_uses_the_shared_allocator(self):
        self.assertIn("create or replace function public.submit_hall_case", self.sql)
        self.assertIn("from public.allocate_hall_submission_identity()", self.sql)
        self.assertIn("insert into public.hall_cases_master", self.sql)
        self.assertIn("'submission_user'", self.sql)
        self.assertIn("'pending'", self.sql)
        self.assertIn("null\n  );", self.sql)
        self.assertNotIn("nextval(", self.sql)

    def test_request_idempotency_and_database_rate_limit_are_server_only(self):
        self.assertIn("pg_advisory_xact_lock", self.sql)
        self.assertIn("public.hall_submission_idempotency", self.sql)
        self.assertIn("public.hall_submission_rate_limits", self.sql)
        self.assertIn("request_count > 5", self.sql)
        self.assertIn("interval '15 minutes'", self.sql)
        self.assertIn("from public, anon, authenticated", self.sql)

    def test_admin_review_is_conditional_and_sets_published_time_by_decision(self):
        self.assertIn("create or replace function public.review_hall_master_submission", self.sql)
        self.assertIn("and m.visibility = 'pending'", self.sql)
        self.assertIn("and m.source_record_id = 'master:'", self.sql)
        self.assertIn("then pg_catalog.clock_timestamp() else null end", self.sql)
        self.assertIn("reviewed_at = pg_catalog.clock_timestamp()", self.sql)
        self.assertIn("reviewed_by = pg_catalog.btrim(p_reviewed_by)", self.sql)


if __name__ == "__main__":
    unittest.main()
