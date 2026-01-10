-- email_historyテーブルへの挿入テスト

-- 1. 現在のログインユーザーのスタッフIDを確認
SELECT id, name, email FROM staffs WHERE email = 'tomoko.kunihiro@ifoo-oita.com';

-- 2. テストデータを挿入してみる（実際のスタッフIDに置き換えてください）
-- INSERT INTO email_history (
--   sent_by_staff_id,
--   recipient_email,
--   subject,
--   start_date,
--   end_date
-- ) VALUES (
--   'ここにスタッフIDを入れる',
--   'test@example.com',
--   'テスト件名',
--   '2025-01-01',
--   '2025-01-31'
-- );

-- 3. 挿入されたデータを確認
SELECT * FROM email_history ORDER BY sent_at DESC LIMIT 5;

-- 4. RLSポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'email_history';
