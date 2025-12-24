-- スタッフテーブルの作成
CREATE TABLE IF NOT EXISTS staffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メールアドレスでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_staffs_email ON staffs(email);

-- 勤怠記録テーブルの作成
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  work_hours DECIMAL(4,2),
  overtime DECIMAL(4,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 同じスタッフが同じ日に複数の記録を持たないようにする
  CONSTRAINT unique_staff_date UNIQUE(staff_id, date)
);

-- スタッフIDと日付での検索用インデックス（降順）
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON attendance_records(staff_id, date DESC);

-- 日付での検索用インデックス（降順）
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date DESC);

-- updated_atを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- staffsテーブルのupdated_at自動更新トリガー
CREATE TRIGGER update_staffs_updated_at BEFORE UPDATE ON staffs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- attendance_recordsテーブルのupdated_at自動更新トリガー
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
