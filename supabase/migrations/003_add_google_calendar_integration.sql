-- Googleカレンダー連携のためのカラムを追加

-- スタッフテーブルにGoogleアカウント情報を追加
ALTER TABLE staffs
ADD COLUMN IF NOT EXISTS google_calendar_email TEXT,
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP WITH TIME ZONE;

-- Googleカレンダー連携用のインデックス
CREATE INDEX IF NOT EXISTS idx_staffs_google_email ON staffs(google_calendar_email);

-- コメント追加
COMMENT ON COLUMN staffs.google_calendar_email IS 'Googleカレンダー連携用のGmailアドレス';
COMMENT ON COLUMN staffs.google_access_token IS 'Google APIアクセストークン（暗号化推奨）';
COMMENT ON COLUMN staffs.google_refresh_token IS 'Google APIリフレッシュトークン（暗号化推奨）';
COMMENT ON COLUMN staffs.google_token_expiry IS 'アクセストークンの有効期限';
