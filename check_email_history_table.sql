-- email_historyテーブルの存在確認
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'email_history'
);

-- テーブルが存在する場合、構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'email_history'
ORDER BY ordinal_position;

-- RLSポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'email_history';

-- データ件数を確認
SELECT COUNT(*) as record_count FROM email_history;
