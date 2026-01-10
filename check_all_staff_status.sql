-- すべてのスタッフの is_active 状態を確認
SELECT 
  name,
  email,
  is_active,
  created_at
FROM staffs
ORDER BY is_active DESC, name;

-- 特定のスタッフの状態を確認
SELECT 
  name,
  email,
  is_active
FROM staffs
WHERE name IN ('国広智子', '廣瀬尚美')
ORDER BY name;
