-- 国広智子と廣瀬尚美を非アクティブ化
UPDATE staffs 
SET is_active = false 
WHERE email IN ('tomoko.kunihiro@ifoo-oita.com', 'naomi.hirose@ifoo-oita.com');

-- 更新結果を確認
SELECT 
  name,
  email,
  is_active
FROM staffs
WHERE email IN ('tomoko.kunihiro@ifoo-oita.com', 'naomi.hirose@ifoo-oita.com')
ORDER BY name;
