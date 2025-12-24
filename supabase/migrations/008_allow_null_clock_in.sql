-- clock_inフィールドをNULL許可に変更
-- 半休・休日出勤の記録を作成後、出勤ボタンで時刻を記録できるようにする

-- NOT NULL制約を削除
ALTER TABLE attendance_records 
ALTER COLUMN clock_in DROP NOT NULL;

-- check_clock_in_required制約が存在する場合は削除
ALTER TABLE attendance_records 
DROP CONSTRAINT IF EXISTS check_clock_in_required;
