-- 「角井」または「kakui」を含むすべてのスタッフを検索
SELECT 
  id,
  name,
  email,
  is_active,
  is_holiday_staff,
  created_at
FROM staffs
WHERE 
  name LIKE '%角井%' 
  OR name LIKE '%かくい%'
  OR name LIKE '%カクイ%'
  OR email LIKE '%kakui%'
ORDER BY created_at DESC;
