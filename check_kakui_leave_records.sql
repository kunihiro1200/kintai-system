-- 角井さんの有給休暇レコードを確認するクエリ

-- 1. 角井さんのスタッフ情報を確認
SELECT 
  id,
  name,
  email,
  is_active,
  is_holiday_staff
FROM staffs
WHERE email = 'hiromitsu-kakui@ifoo-oita.com';

-- 2. 角井さんの全勤怠レコードを確認
SELECT 
  ar.id,
  ar.staff_id,
  ar.date,
  ar.leave_type,
  ar.clock_in,
  ar.clock_out,
  ar.work_hours,
  ar.overtime,
  ar.created_at
FROM attendance_records ar
JOIN staffs s ON ar.staff_id = s.id
WHERE s.email = 'hiromitsu-kakui@ifoo-oita.com'
ORDER BY ar.date DESC;

-- 3. 角井さんの2025-12-16から2026-01-15の期間のレコードを確認
SELECT 
  ar.id,
  ar.staff_id,
  ar.date,
  ar.leave_type,
  ar.clock_in,
  ar.clock_out,
  ar.work_hours,
  ar.overtime,
  ar.created_at
FROM attendance_records ar
JOIN staffs s ON ar.staff_id = s.id
WHERE s.email = 'hiromitsu-kakui@ifoo-oita.com'
  AND ar.date >= '2025-12-16'
  AND ar.date <= '2026-01-15'
ORDER BY ar.date;

-- 4. 角井さんの有給休暇レコードのみを確認
SELECT 
  ar.id,
  ar.staff_id,
  ar.date,
  ar.leave_type,
  ar.created_at
FROM attendance_records ar
JOIN staffs s ON ar.staff_id = s.id
WHERE s.email = 'hiromitsu-kakui@ifoo-oita.com'
  AND ar.leave_type IN ('paid_leave', 'half_leave')
ORDER BY ar.date DESC;
