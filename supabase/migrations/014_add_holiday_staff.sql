-- 祝日対応スタッフフラグを追加
ALTER TABLE staffs ADD COLUMN IF NOT EXISTS is_holiday_staff BOOLEAN DEFAULT FALSE;

-- コメントを追加
COMMENT ON COLUMN staffs.is_holiday_staff IS '祝日対応スタッフフラグ（true: 月10時間超過で残業、false: 月7時間超過で残業）';
