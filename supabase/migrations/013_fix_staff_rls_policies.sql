-- スタッフテーブルのRLSポリシーを修正
-- 既存のポリシーを削除して、より適切なポリシーに置き換える

-- 既存の読み取りポリシーを削除
DROP POLICY IF EXISTS "スタッフは自分の情報を読み取れる" ON staffs;

-- 新しい読み取りポリシー: 認証済みユーザーは全スタッフ情報を読み取れる
CREATE POLICY "認証済みユーザーは全スタッフ情報を読み取れる" ON staffs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 更新ポリシー: 認証済みユーザーはスタッフ情報を更新できる
CREATE POLICY "認証済みユーザーはスタッフ情報を更新できる" ON staffs
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
