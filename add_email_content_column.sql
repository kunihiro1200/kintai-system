-- email_historyテーブルにメール内容を保存するカラムを追加
ALTER TABLE email_history 
ADD COLUMN email_content JSONB;

-- コメントを追加
COMMENT ON COLUMN email_history.email_content IS '送信したメールの内容（サマリーデータ）';
