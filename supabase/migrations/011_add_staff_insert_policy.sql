-- staffsテーブルにINSERTポリシーを追加
-- サービスロール（バックエンド）からのINSERTを許可

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "サービスロールはスタッフを作成できる" ON staffs;

-- サービスロール（バックエンド）はスタッフを作成できる
CREATE POLICY "サービスロールはスタッフを作成できる" ON staffs
  FOR INSERT
  WITH CHECK (true);

-- サービスロール（バックエンド）はスタッフ情報を更新できる
CREATE POLICY "サービスロールはスタッフを更新できる" ON staffs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- サービスロール（バックエンド）は全てのスタッフ情報を読み取れる
CREATE POLICY "サービスロールは全スタッフを読み取れる" ON staffs
  FOR SELECT
  USING (true);
