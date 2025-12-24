-- Row Level Security (RLS) を有効化
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- staffsテーブルのRLSポリシー
-- 認証済みユーザーは自分のメールアドレスに一致するスタッフ情報を読み取れる
CREATE POLICY "スタッフは自分の情報を読み取れる" ON staffs
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- attendance_recordsテーブルのRLSポリシー
-- 認証済みユーザーは自分のスタッフIDに紐づく勤怠記録を読み取れる
CREATE POLICY "スタッフは自分の勤怠記録を読み取れる" ON attendance_records
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE email = auth.jwt() ->> 'email'
    )
  );

-- 認証済みユーザーは自分のスタッフIDに紐づく勤怠記録を作成できる
CREATE POLICY "スタッフは自分の勤怠記録を作成できる" ON attendance_records
  FOR INSERT
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staffs WHERE email = auth.jwt() ->> 'email'
    )
  );

-- 認証済みユーザーは自分のスタッフIDに紐づく勤怠記録を更新できる
CREATE POLICY "スタッフは自分の勤怠記録を更新できる" ON attendance_records
  FOR UPDATE
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staffs WHERE email = auth.jwt() ->> 'email'
    )
  );
