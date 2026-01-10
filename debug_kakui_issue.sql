-- 角井さんの勤怠記録を確認（2025/12/16~2026/1/15）

-- 1. 角井さんのスタッフ情報を確認
SELECT 
  id,
  name,
  email,
  is_active
FROM staffs
WHERE name LIKE '%角井%' OR email LIKE '%kakui%';

-- 2. 角井さんの全ての勤怠記録を確認
SELECT 
  ar.date,
  ar.leave_type,
  ar.half_leave_period,
  ar.clock_in,
  ar.clock_out,
  ar.work_hours,
  ar.overtime,
  ar.created_at
FROM attendance_records ar
JOIN staffs s ON ar.staff_id = s.id
WHERE (s.name LIKE '%角井%' OR s.email LIKE '%kakui%')
ORDER BY ar.date DESC;

-- 3. 期間内（2025/12/16~2026/1/15）の記録を確認
SELECT 
  s.name,
  s.email,
  ar.date,
  ar.leave_type,
  ar.half_leave_period,
  ar.clock_in,
  ar.clock_out,
  ar.work_hours,
  ar.overtime
FROM attendance_records ar
JOIN staffs s ON ar.staff_id = s.id
WHERE (s.name LIKE '%角井%' OR s.email LIKE '%kakui%')
  AND ar.date >= '2025-12-16'
  AND ar.date <= '2026-01-15'
ORDER BY ar.date;

-- 4. 有給休暇のみを確認
SELECT 
  s.name,
  s.email,
  ar.date,
  ar.leave_type,
  ar.created_at
FROM attendance_records ar
JOIN staffs s ON ar.staff_id = s.id
WHERE (s.name LIKE '%角井%' OR s.email LIKE '%kakui%')
  AND ar.leave_type IN ('paid_leave', 'half_leave')
ORDER BY ar.date DESC;
