-- システム管理者機能の追加
-- staffsテーブルにis_system_adminカラムを追加

-- is_system_adminカラムを追加
ALTER TABLE staffs
ADD COLUMN is_system_admin BOOLEAN DEFAULT FALSE;

-- システム管理者は1人のみという制約を追加
-- is_system_admin = TRUEの行が複数存在することを防ぐ
CREATE UNIQUE INDEX idx_staffs_system_admin 
ON staffs(is_system_admin) 
WHERE is_system_admin = TRUE;

-- コメントを追加
COMMENT ON COLUMN staffs.is_system_admin IS 'システム管理者フラグ。Google Sheets API連携用の個人Gmailトークンを提供するスタッフ。1人のみ設定可能。';
