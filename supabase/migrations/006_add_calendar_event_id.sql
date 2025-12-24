-- attendance_recordsテーブルにGoogleカレンダーイベントIDを追加

ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_attendance_records_calendar_event_id 
ON attendance_records(google_calendar_event_id);

-- コメント追加
COMMENT ON COLUMN attendance_records.google_calendar_event_id IS 'Googleカレンダーイベントの一意ID（削除時に使用）';
