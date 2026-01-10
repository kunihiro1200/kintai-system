-- is_activeカラムが存在するか確認
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'staffs' AND column_name = 'is_active';

-- 全スタッフのis_active状態を確認
SELECT email, name, is_active
FROM staffs
ORDER BY name;
