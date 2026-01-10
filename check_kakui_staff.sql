-- 角井さんのスタッフ情報を確認
SELECT 
  id,
  name,
  email,
  is_active,
  is_holiday_staff,
  created_at
FROM staffs
WHERE email = 'hiromitsu-kakui@ifoo-oita.com';
