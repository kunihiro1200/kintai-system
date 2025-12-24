-- スタッフテーブルに自己登録ポリシーを追加

-- 認証済みユーザーは自分のメールアドレスでスタッフレコードを作成できる
CREATE POLICY "認証済みユーザーは自分のスタッフレコードを作成できる" ON staffs
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- 認証済みユーザーは自分のスタッフ情報を更新できる
CREATE POLICY "スタッフは自分の情報を更新できる" ON staffs
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);
