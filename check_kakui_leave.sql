-- 角井さんの2025/12/16~2026/1/15の勤怠記録を確認

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
FROM staffs s
LEFT JOIN attendance_records ar ON s.id = ar.staff_id
WHERE s.name LIKE '%角井%'
  AND ar.date >= '2025-12-16'
  AND ar.date <= '2026-01-15'
ORDER BY ar.date;
