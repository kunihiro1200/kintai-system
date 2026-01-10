-- tenant と フレックスを非アクティブ化
UPDATE staffs 
SET is_active = false 
WHERE email IN ('tenant@ifoo-oita.com', 'oitaifoo@gmail.com');
