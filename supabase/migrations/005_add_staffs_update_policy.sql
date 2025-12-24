-- staffsテーブルのUPDATEポリシーを追加
-- スタッフは自分の情報（Googleカレンダー連携情報を含む）を更新できる

CREATE POLICY "スタッフは自分の情報を更新できる" ON staffs
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);
