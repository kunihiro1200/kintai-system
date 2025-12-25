-- 複数のシステム管理者を許可
-- システム管理者を1人のみに制限するUNIQUE INDEXを削除

-- UNIQUE INDEXを削除
DROP INDEX IF EXISTS idx_staffs_system_admin;

-- コメントを更新
COMMENT ON COLUMN staffs.is_system_admin IS 'システム管理者フラグ。Google Sheets API連携用の個人Gmailトークンを提供するスタッフ。複数人設定可能。';
