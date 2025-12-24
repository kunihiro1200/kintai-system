-- 休暇タイプの追加
-- attendance_recordsテーブルに休暇タイプのカラムを追加

-- 休暇タイプのENUM型を作成
CREATE TYPE leave_type AS ENUM (
  'normal',           -- 通常勤務
  'paid_leave',       -- 有給休暇
  'half_leave',       -- 半休
  'compensatory_leave', -- 代休
  'holiday_work'      -- 休日出勤
);

-- attendance_recordsテーブルに新しいカラムを追加
ALTER TABLE attendance_records
  ADD COLUMN leave_type leave_type DEFAULT 'normal' NOT NULL;

-- 休暇タイプの場合、clock_inとclock_outはNULLを許可するように変更
ALTER TABLE attendance_records
  ALTER COLUMN clock_in DROP NOT NULL;

-- 休暇タイプでない場合はclock_inが必須というチェック制約を追加
ALTER TABLE attendance_records
  ADD CONSTRAINT check_clock_in_required 
  CHECK (
    (leave_type = 'normal' AND clock_in IS NOT NULL) OR
    (leave_type != 'normal' AND clock_in IS NULL)
  );

-- 休暇タイプのインデックスを追加
CREATE INDEX IF NOT EXISTS idx_attendance_leave_type ON attendance_records(leave_type);
