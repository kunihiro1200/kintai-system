-- attendance_recordsテーブルのDELETEポリシーを追加
-- スタッフは自分の勤怠記録を削除できる

CREATE POLICY "スタッフは自分の勤怠記録を削除できる" ON attendance_records
  FOR DELETE
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE email = auth.jwt() ->> 'email'
    )
  );
