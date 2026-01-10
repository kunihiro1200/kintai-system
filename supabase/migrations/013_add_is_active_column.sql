-- スタッフテーブルにis_activeカラムを追加

-- is_activeカラムを追加（デフォルトはtrue）
ALTER TABLE staffs
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- is_activeでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_staffs_is_active ON staffs(is_active);

-- コメント追加
COMMENT ON COLUMN staffs.is_active IS 'スタッフが在籍中かどうか（スプレッドシートのI列「通常」カラムに対応）';
