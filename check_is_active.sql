-- is_active の状態を確認
SELECT 
  id,
  name,
  email,
  is_active,
  created_at
FROM staffs
WHERE email IN ('tenant@ifoo-oita.com', 'oitaifoo@gmail.com')
ORDER BY email;

-- すべてのスタッフの is_active 状態を確認
SELECT 
  name,
  email,
  is_active
FROM staffs
ORDER BY is_active DESC, name;
