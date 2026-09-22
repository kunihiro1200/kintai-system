-- 代休の対象となる「元の休日出勤日」を記録するカラムを追加
-- 用途: 「いつの代休か（どの休日出勤の振り替えか）」を保存する
-- 例: 9/22 に代休を取得し、その元となる休日出勤が 9/14 の場合、
--     date = '2026-09-22', compensatory_leave_date = '2026-09-14'

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS compensatory_leave_date DATE;

COMMENT ON COLUMN attendance_records.compensatory_leave_date
  IS '代休(compensatory_leave)の対象となる休日出勤日。代休以外ではNULL。';
