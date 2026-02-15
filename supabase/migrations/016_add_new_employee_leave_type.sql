-- 新入社員休暇タイプと特別休暇タイプを追加

-- leave_type ENUMに新しい値を追加
ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'special_leave';
ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'new_employee_leave';
