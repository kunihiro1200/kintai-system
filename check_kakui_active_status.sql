-- 角井さんのアクティブ状態を確認

SELECT 
  id,
  name,
  email,
  is_active,
  is_holiday_staff,
  created_at,
  updated_at
FROM staffs
WHERE email = 'hiromi.kakui@ifoo-oita.com';

-- もし見つからない場合は、名前で検索
SELECT 
  id,
  name,
  email,
  is_active,
  is_holiday_staff,
  created_at,
  updated_at
FROM staffs
WHERE name LIKE '%角井%';
