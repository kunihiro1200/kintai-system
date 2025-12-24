-- 半休の時間帯情報を追加

-- 半休タイプのENUM型を作成
CREATE TYPE half_leave_period AS ENUM (
  'morning',    -- 午前半休
  'afternoon'   -- 午後半休
);

-- attendance_recordsテーブルに半休時間帯カラムを追加
ALTER TABLE attendance_records
  ADD COLUMN half_leave_period half_leave_period;

-- 半休の場合は時間帯が必須というチェック制約を追加
ALTER TABLE attendance_records
  ADD CONSTRAINT check_half_leave_period 
  CHECK (
    (leave_type = 'half_leave' AND half_leave_period IS NOT NULL) OR
    (leave_type != 'half_leave' AND half_leave_period IS NULL)
  );
