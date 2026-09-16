-- Persist the stable source-input order required for exact Hall export parity.
--
-- The values below are derived from the 20260916-v001 production inputs:
-- hall_fame.xlsx first, then published-submissions.json. They are intentionally
-- keyed by case_id and source rather than by database row order.
alter table public.hall_cases_master
  add column source_order integer;

with source_order_values(case_id, source, source_order) as (
  values
    ('ufun-checkee-099', 'legacy_excel', 1),
    ('ufun-checkee-002', 'legacy_excel', 2),
    ('ufun-checkee-003', 'legacy_excel', 3),
    ('ufun-checkee-004', 'legacy_excel', 4),
    ('ufun-checkee-005', 'legacy_excel', 5),
    ('ufun-checkee-006', 'legacy_excel', 6),
    ('ufun-checkee-007', 'legacy_excel', 7),
    ('ufun-checkee-008', 'legacy_excel', 8),
    ('ufun-checkee-009', 'legacy_excel', 9),
    ('ufun-checkee-010', 'legacy_excel', 10),
    ('ufun-checkee-011', 'legacy_excel', 11),
    ('ufun-checkee-012', 'legacy_excel', 12),
    ('ufun-checkee-013', 'legacy_excel', 13),
    ('ufun-checkee-014', 'legacy_excel', 14),
    ('ufun-checkee-015', 'legacy_excel', 15),
    ('ufun-checkee-016', 'legacy_excel', 16),
    ('ufun-checkee-017', 'legacy_excel', 17),
    ('ufun-checkee-019', 'legacy_excel', 18),
    ('ufun-checkee-020', 'legacy_excel', 19),
    ('ufun-checkee-021', 'legacy_excel', 20),
    ('ufun-checkee-022', 'legacy_excel', 21),
    ('ufun-checkee-023', 'legacy_excel', 22),
    ('ufun-checkee-024', 'legacy_excel', 23),
    ('ufun-checkee-025', 'legacy_excel', 24),
    ('ufun-checkee-026', 'legacy_excel', 25),
    ('ufun-checkee-027', 'legacy_excel', 26),
    ('ufun-checkee-028', 'legacy_excel', 27),
    ('ufun-checkee-029', 'legacy_excel', 28),
    ('ufun-checkee-030', 'legacy_excel', 29),
    ('ufun-checkee-031', 'legacy_excel', 30),
    ('ufun-checkee-032', 'legacy_excel', 31),
    ('ufun-checkee-033', 'legacy_excel', 32),
    ('ufun-checkee-034', 'legacy_excel', 33),
    ('ufun-checkee-035', 'legacy_excel', 34),
    ('ufun-checkee-036', 'legacy_excel', 35),
    ('ufun-checkee-115', 'legacy_excel', 36),
    ('ufun-checkee-037', 'legacy_excel', 37),
    ('ufun-checkee-038', 'legacy_excel', 38),
    ('ufun-checkee-039', 'legacy_excel', 39),
    ('ufun-checkee-040', 'legacy_excel', 40),
    ('ufun-checkee-041', 'legacy_excel', 41),
    ('ufun-checkee-042', 'legacy_excel', 42),
    ('ufun-checkee-043', 'legacy_excel', 43),
    ('ufun-checkee-044', 'legacy_excel', 44),
    ('ufun-checkee-045', 'legacy_excel', 45),
    ('ufun-checkee-046', 'legacy_excel', 46),
    ('ufun-checkee-047', 'legacy_excel', 47),
    ('ufun-checkee-048', 'legacy_excel', 48),
    ('ufun-checkee-049', 'legacy_excel', 49),
    ('ufun-checkee-050', 'legacy_excel', 50),
    ('ufun-checkee-051', 'legacy_excel', 51),
    ('ufun-checkee-052', 'legacy_excel', 52),
    ('ufun-checkee-053', 'legacy_excel', 53),
    ('ufun-checkee-054', 'legacy_excel', 54),
    ('ufun-checkee-055', 'legacy_excel', 55),
    ('ufun-checkee-057', 'legacy_excel', 56),
    ('ufun-checkee-058', 'legacy_excel', 57),
    ('ufun-checkee-059', 'legacy_excel', 58),
    ('ufun-checkee-060', 'legacy_excel', 59),
    ('ufun-checkee-061', 'legacy_excel', 60),
    ('ufun-checkee-062', 'legacy_excel', 61),
    ('ufun-checkee-063', 'legacy_excel', 62),
    ('ufun-checkee-064', 'legacy_excel', 63),
    ('ufun-checkee-065', 'legacy_excel', 64),
    ('ufun-checkee-066', 'legacy_excel', 65),
    ('ufun-checkee-067', 'legacy_excel', 66),
    ('ufun-checkee-068', 'legacy_excel', 67),
    ('ufun-checkee-069', 'legacy_excel', 68),
    ('ufun-checkee-070', 'legacy_excel', 69),
    ('ufun-checkee-071', 'legacy_excel', 70),
    ('ufun-checkee-072', 'legacy_excel', 71),
    ('ufun-checkee-073', 'legacy_excel', 72),
    ('ufun-checkee-074', 'legacy_excel', 73),
    ('ufun-checkee-075', 'legacy_excel', 74),
    ('ufun-checkee-076', 'legacy_excel', 75),
    ('ufun-checkee-077', 'legacy_excel', 76),
    ('ufun-checkee-078', 'legacy_excel', 77),
    ('ufun-checkee-079', 'legacy_excel', 78),
    ('ufun-checkee-080', 'legacy_excel', 79),
    ('ufun-checkee-081', 'legacy_excel', 80),
    ('ufun-checkee-082', 'legacy_excel', 81),
    ('ufun-checkee-083', 'legacy_excel', 82),
    ('ufun-checkee-084', 'legacy_excel', 83),
    ('ufun-checkee-085', 'legacy_excel', 84),
    ('ufun-checkee-086', 'legacy_excel', 85),
    ('ufun-checkee-087', 'legacy_excel', 86),
    ('ufun-checkee-088', 'legacy_excel', 87),
    ('ufun-checkee-089', 'legacy_excel', 88),
    ('ufun-checkee-090', 'legacy_excel', 89),
    ('ufun-checkee-091', 'legacy_excel', 90),
    ('ufun-checkee-092', 'legacy_excel', 91),
    ('ufun-checkee-093', 'legacy_excel', 92),
    ('ufun-checkee-094', 'legacy_excel', 93),
    ('ufun-checkee-095', 'legacy_excel', 94),
    ('ufun-checkee-096', 'legacy_excel', 95),
    ('ufun-checkee-097', 'legacy_excel', 96),
    ('ufun-checkee-098', 'legacy_excel', 97),
    ('ufun-checkee-101', 'legacy_excel', 98),
    ('ufun-checkee-102', 'legacy_excel', 99),
    ('ufun-checkee-100', 'legacy_excel', 100),
    ('ufun-checkee-103', 'legacy_excel', 101),
    ('ufun-checkee-104', 'legacy_excel', 102),
    ('ufun-checkee-105', 'legacy_excel', 103),
    ('ufun-checkee-106', 'legacy_excel', 104),
    ('ufun-checkee-107', 'legacy_excel', 105),
    ('ufun-checkee-108', 'legacy_excel', 106),
    ('ufun-checkee-109', 'legacy_excel', 107),
    ('ufun-checkee-110', 'legacy_excel', 108),
    ('ufun-checkee-111', 'legacy_excel', 109),
    ('ufun-checkee-112', 'legacy_excel', 110),
    ('ufun-checkee-113', 'legacy_excel', 111),
    ('ufun-checkee-114', 'legacy_excel', 112),
    ('submission-16', 'submission_user', 1),
    ('submission-17', 'submission_user', 2),
    ('submission-18', 'submission_user', 3),
    ('submission-19', 'submission_user', 4),
    ('submission-20', 'submission_user', 5),
    ('submission-21', 'submission_user', 6),
    ('submission-22', 'submission_user', 7),
    ('submission-23', 'submission_user', 8),
    ('submission-24', 'submission_user', 9),
    ('submission-25', 'submission_user', 10),
    ('submission-26', 'submission_user', 11),
    ('submission-27', 'submission_user', 12),
    ('submission-28', 'submission_user', 13),
    ('submission-29', 'submission_user', 14),
    ('submission-30', 'submission_user', 15),
    ('submission-31', 'submission_user', 16),
    ('submission-32', 'submission_user', 17),
    ('submission-33', 'submission_user', 18),
    ('submission-34', 'submission_user', 19),
    ('submission-35', 'submission_user', 20),
    ('submission-36', 'submission_user', 21),
    ('submission-37', 'submission_user', 22),
    ('submission-38', 'submission_user', 23),
    ('submission-39', 'submission_user', 24),
    ('submission-40', 'submission_user', 25),
    ('submission-41', 'submission_user', 26),
    ('submission-42', 'submission_user', 27),
    ('submission-43', 'submission_user', 28),
    ('submission-44', 'submission_user', 29),
    ('submission-45', 'submission_user', 30),
    ('submission-46', 'submission_user', 31),
    ('submission-47', 'submission_user', 32),
    ('submission-48', 'submission_user', 33),
    ('submission-49', 'submission_user', 34),
    ('submission-50', 'submission_user', 35),
    ('submission-51', 'submission_user', 36),
    ('submission-52', 'submission_user', 37),
    ('submission-53', 'submission_user', 38),
    ('submission-54', 'submission_user', 39),
    ('submission-55', 'submission_user', 40),
    ('submission-56', 'submission_user', 41),
    ('submission-57', 'submission_user', 42),
    ('submission-58', 'submission_user', 43),
    ('submission-59', 'submission_user', 44),
    ('submission-60', 'submission_user', 45),
    ('submission-61', 'submission_user', 46),
    ('submission-62', 'submission_user', 47),
    ('submission-63', 'submission_user', 48),
    ('submission-64', 'submission_user', 49),
    ('submission-65', 'submission_user', 50),
    ('submission-66', 'submission_user', 51),
    ('submission-67', 'submission_user', 52),
    ('submission-68', 'submission_user', 53),
    ('submission-69', 'submission_user', 54),
    ('submission-70', 'submission_user', 55),
    ('submission-71', 'submission_user', 56),
    ('submission-72', 'submission_user', 57),
    ('submission-73', 'submission_user', 58),
    ('submission-74', 'submission_user', 59),
    ('submission-75', 'submission_user', 60),
    ('submission-76', 'submission_user', 61),
    ('submission-77', 'submission_user', 62),
    ('submission-78', 'submission_user', 63),
    ('submission-80', 'submission_user', 64),
    ('submission-81', 'submission_user', 65),
    ('submission-82', 'submission_user', 66),
    ('submission-83', 'submission_user', 67),
    ('submission-84', 'submission_user', 68),
    ('submission-85', 'submission_user', 69),
    ('submission-86', 'submission_user', 70),
    ('submission-87', 'submission_user', 71),
    ('submission-88', 'submission_user', 72),
    ('submission-89', 'submission_user', 73),
    ('submission-90', 'submission_user', 74),
    ('submission-91', 'submission_user', 75),
    ('submission-92', 'submission_user', 76)

)
update public.hall_cases_master as master
set source_order = source_values.source_order
from source_order_values as source_values
where master.case_id = source_values.case_id
  and master.source = source_values.source;

do $$
declare
  total_count integer;
  missing_count integer;
  duplicate_count integer;
begin
  select count(*) into total_count
  from public.hall_cases_master;

  if total_count <> 188 then
    raise exception 'Expected 188 hall_cases_master rows, found %', total_count;
  end if;

  select count(*) into missing_count
  from public.hall_cases_master
  where source_order is null;

  if missing_count <> 0 then
    raise exception 'Expected no null source_order values, found %', missing_count;
  end if;

  select count(*) - count(distinct (source, source_order))
    into duplicate_count
  from public.hall_cases_master;

  if duplicate_count <> 0 then
    raise exception 'Expected unique (source, source_order), found % duplicate rows', duplicate_count;
  end if;
end
$$;

alter table public.hall_cases_master
  alter column source_order set not null;

alter table public.hall_cases_master
  add constraint hall_cases_master_source_order_key
  unique (source, source_order);
