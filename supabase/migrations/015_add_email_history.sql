-- メール送信履歴テーブルを作成
CREATE TABLE IF NOT EXISTS email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by_staff_id UUID NOT NULL REFERENCES staffs(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX idx_email_history_sent_at ON email_history(sent_at DESC);
CREATE INDEX idx_email_history_sent_by ON email_history(sent_by_staff_id);

-- コメントを追加
COMMENT ON TABLE email_history IS 'メール送信履歴';
COMMENT ON COLUMN email_history.sent_by_staff_id IS '送信者のスタッフID';
COMMENT ON COLUMN email_history.recipient_email IS '送信先メールアドレス';
COMMENT ON COLUMN email_history.subject IS 'メール件名';
COMMENT ON COLUMN email_history.start_date IS 'サマリー開始日';
COMMENT ON COLUMN email_history.end_date IS 'サマリー終了日';
COMMENT ON COLUMN email_history.sent_at IS '送信日時';

-- RLSポリシーを設定
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全ての履歴を閲覧可能
CREATE POLICY "認証済みユーザーは全ての送信履歴を閲覧可能"
  ON email_history
  FOR SELECT
  TO authenticated
  USING (true);

-- 認証済みユーザーは送信履歴を作成可能
CREATE POLICY "認証済みユーザーは送信履歴を作成可能"
  ON email_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
