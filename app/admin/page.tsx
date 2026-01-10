'use client';

import { useAuth } from '@/components/AuthProvider';
import { LeaveDatesModal } from '@/components/LeaveDatesModal';
import { EmailPreviewModal } from '@/components/EmailPreviewModal';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface StaffSummary {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  is_holiday_staff: boolean;
  work_days: number;
  total_overtime: number;
  confirmed_overtime: number;
  paid_leave_count: number;
  paid_leave_dates: string[];
  compensatory_leave_count: number;
  holiday_work_count: number;
  new_employee_leave_count: number;
}

interface ModalState {
  staffId: string;
  staffName: string;
  leaveType: 'paid_leave' | 'compensatory_leave' | 'holiday_work' | 'new_employee_leave';
  leaveLabel: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [summaries, setSummaries] = useState<StaffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [senderEmail, setSenderEmail] = useState('tenant@ifoo-oita.com');
  const [additionalMessage, setAdditionalMessage] = useState('');

  // 全社員サマリーを取得
  const fetchSummaries = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/attendance/all-staff-summary?${params}`);
      const data = await response.json();

      if (data.success) {
        setSummaries(data.data.summaries);
      } else {
        setError(data.error?.message || 'サマリーの取得に失敗しました');
      }
    } catch (err) {
      setError('サマリーの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      console.log('ログイン中のユーザー:', user.email);
      
      // 管理者チェック（データベースベース）
      checkAdminAccess();
    }
  }, [user, startDate, endDate]);

  // 管理者アクセスをチェック
  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/staff/system-admin-status');
      const data = await response.json();
      
      console.log('管理者ステータス:', data);
      
      if (!data.success || !data.data) {
        setError('アクセス権限がありません');
        setLoading(false);
        return;
      }

      // 現在のユーザーがシステム管理者リストに含まれているかチェック
      const isAdmin = data.data.systemAdmins?.some(
        (admin: { email: string }) => admin.email === user?.email
      );

      if (!isAdmin) {
        setError('アクセス権限がありません');
        setLoading(false);
        return;
      }
      
      // 管理者の場合、データを取得
      fetchSummaries();
      fetchEmailHistory();
    } catch (err) {
      console.error('管理者チェックエラー:', err);
      setError('アクセス権限の確認に失敗しました');
      setLoading(false);
    }
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // 前月16日〜当月15日を設定
  const handleSetMonthlyPeriod = () => {
    const today = new Date();
    const currentDay = today.getDate();
    
    let periodStart: Date;
    let periodEnd: Date;

    if (currentDay >= 16) {
      // 当月16日以降の場合: 当月16日〜翌月15日
      periodStart = new Date(today.getFullYear(), today.getMonth(), 16);
      periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    } else {
      // 当月15日以前の場合: 前月16日〜当月15日
      periodStart = new Date(today.getFullYear(), today.getMonth() - 1, 16);
      periodEnd = new Date(today.getFullYear(), today.getMonth(), 15);
    }

    // ローカルタイムゾーンで日付文字列を生成（UTCへの変換を避ける）
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setStartDate(formatDate(periodStart));
    setEndDate(formatDate(periodEnd));
  };

  // メール送信履歴を取得
  const fetchEmailHistory = async () => {
    try {
      const response = await fetch('/api/attendance/email-history');
      const data = await response.json();
      if (data.success) {
        setEmailHistory(data.data.history);
      }
    } catch (err) {
      console.error('送信履歴の取得エラー:', err);
    }
  };

  // メール送信
  const handleSendEmail = async () => {
    if (!startDate || !endDate) {
      alert('開始日と終了日を設定してください');
      return;
    }

    if (summaries.length === 0) {
      alert('送信するデータがありません');
      return;
    }

    if (!senderEmail) {
      alert('送信元メールアドレスを選択してください');
      return;
    }

    setSendingEmail(true);

    try {
      const response = await fetch('/api/attendance/send-summary-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          summaries,
          recipientEmail: 'wjiia_oi@yahoo.co.jp',
          senderEmail,
          additionalMessage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('メールを送信しました');
        setShowEmailPreview(false);
        fetchEmailHistory(); // 送信履歴を更新
      } else {
        alert(`メール送信に失敗しました: ${data.error}`);
      }
    } catch (err) {
      alert('メール送信に失敗しました');
    } finally {
      setSendingEmail(false);
    }
  };

  // メールプレビューを表示
  const handleShowEmailPreview = () => {
    if (!startDate || !endDate) {
      alert('開始日と終了日を設定してください');
      return;
    }

    if (summaries.length === 0) {
      alert('送信するデータがありません');
      return;
    }

    setShowEmailPreview(true);
  };

  if (authLoading) {
    return (
      <main style={{ padding: '2rem' }}>
        <p>読み込み中...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '1rem' }}>全社員勤怠サマリー</h1>
        <Link
          href="/"
          style={{
            color: '#007bff',
            textDecoration: 'none',
          }}
        >
          ← ホームに戻る
        </Link>
      </div>

      {/* 期間フィルター */}
      <div
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9',
        }}
      >
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>期間で絞り込み</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
              開始日
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
              終了日
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <button
              onClick={handleSetMonthlyPeriod}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                marginRight: '0.5rem',
              }}
            >
              前月16日〜当月15日
            </button>
            <button
              onClick={handleClearFilter}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              クリア
            </button>
          </div>
        </div>
      </div>

      {/* メール送信セクション */}
      <div
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          backgroundColor: '#f0f8ff',
        }}
      >
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>メール送信（Gmail経由）</h3>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
              送信元メールアドレス
            </label>
            <select
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}
            >
              <option value="tenant@ifoo-oita.com">tenant@ifoo-oita.com</option>
              <option value="tomoko.kunihiro@ifoo-oita.com">tomoko.kunihiro@ifoo-oita.com</option>
              <option value="yurine.kimura@ifoo-oita.com">yurine.kimura@ifoo-oita.com</option>
              <option value="mariko.kume@ifoo-oita.com">mariko.kume@ifoo-oita.com</option>
            </select>
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              ※ 選択したアドレスのGmailアカウントでログインしている必要があります
            </p>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
              追加メッセージ（任意）
            </label>
            <textarea
              value={additionalMessage}
              onChange={(e) => setAdditionalMessage(e.target.value)}
              placeholder="メール本文の最初に表示される追加メッセージを入力できます（例：今月の注意事項など）"
              rows={3}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              ※ 入力した内容は勤怠サマリー表の前に表示されます
            </p>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
            送信先: <strong>wjiia_oi@yahoo.co.jp</strong>
          </p>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
            ※ 現在表示中のサマリーデータをメールで送信します
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={handleShowEmailPreview}
            disabled={sendingEmail || !startDate || !endDate || summaries.length === 0}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: sendingEmail || !startDate || !endDate || summaries.length === 0 ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: sendingEmail || !startDate || !endDate || summaries.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
            }}
          >
            メール送信
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {showHistory ? '送信履歴を隠す' : '送信履歴を表示'}
          </button>
        </div>

        {/* 送信履歴 */}
        {showHistory && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>送信履歴（最新10件）</h4>
            {emailHistory.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: '#666' }}>送信履歴がありません</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    backgroundColor: '#fff',
                    fontSize: '0.85rem',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#e9ecef' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                        送信日時
                      </th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                        送信者
                      </th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                        期間
                      </th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                        送信先
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailHistory.map((history) => (
                      <tr key={history.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '0.5rem' }}>
                          {new Date(history.sent_at).toLocaleString('ja-JP')}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          {history.staffs?.name || '不明'}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          {history.start_date} 〜 {history.end_date}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          {history.recipient_email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>読み込み中...</p>
        </div>
      ) : (
        <>
          {/* 期間指定時の注意書き */}
          {(startDate || endDate) && (
            <div
              style={{
                padding: '1rem',
                marginBottom: '1.5rem',
                backgroundColor: '#d1ecf1',
                border: '1px solid #bee5eb',
                borderRadius: '4px',
                color: '#0c5460',
              }}
            >
              <strong>表示中:</strong> {startDate || '最初'} ～ {endDate || '最新'} の期間データ
              <br />
              <small>※ 累計データを見るには、期間フィルターをクリアしてください</small>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                  社員名
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                  祝日対応
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                  出勤日数
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', backgroundColor: '#e7f3ff' }}>
                  総残業時間
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', backgroundColor: '#fff3cd' }}>
                  確定残業時間
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                  有給休暇
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                  代休
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                  休日出勤
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                  休暇（6ヶ月以内社員）
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.staff_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{summary.staff_name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>{summary.staff_email}</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: summary.is_holiday_staff ? '#28a745' : '#6c757d',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                      }}
                    >
                      {summary.is_holiday_staff ? '✓ 祝日対応' : '通常'}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      {summary.is_holiday_staff ? '月10h超過' : '月7h超過'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {summary.work_days}日
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#e7f3ff' }}>
                    {summary.total_overtime}時間
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#856404', backgroundColor: '#fff3cd' }}>
                    {summary.confirmed_overtime}時間
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() =>
                        setModalState({
                          staffId: summary.staff_id,
                          staffName: summary.staff_name,
                          leaveType: 'paid_leave',
                          leaveLabel: '有給休暇',
                        })
                      }
                      disabled={summary.paid_leave_count === 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: summary.paid_leave_count > 0 ? '#007bff' : '#999',
                        cursor: summary.paid_leave_count > 0 ? 'pointer' : 'default',
                        textDecoration: summary.paid_leave_count > 0 ? 'underline' : 'none',
                        fontSize: '1rem',
                      }}
                    >
                      {summary.paid_leave_count}日
                    </button>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() =>
                        setModalState({
                          staffId: summary.staff_id,
                          staffName: summary.staff_name,
                          leaveType: 'compensatory_leave',
                          leaveLabel: '代休',
                        })
                      }
                      disabled={summary.compensatory_leave_count === 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: summary.compensatory_leave_count > 0 ? '#007bff' : '#999',
                        cursor: summary.compensatory_leave_count > 0 ? 'pointer' : 'default',
                        textDecoration: summary.compensatory_leave_count > 0 ? 'underline' : 'none',
                        fontSize: '1rem',
                      }}
                    >
                      {summary.compensatory_leave_count}日
                    </button>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() =>
                        setModalState({
                          staffId: summary.staff_id,
                          staffName: summary.staff_name,
                          leaveType: 'holiday_work',
                          leaveLabel: '休日出勤',
                        })
                      }
                      disabled={summary.holiday_work_count === 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: summary.holiday_work_count > 0 ? '#007bff' : '#999',
                        cursor: summary.holiday_work_count > 0 ? 'pointer' : 'default',
                        textDecoration: summary.holiday_work_count > 0 ? 'underline' : 'none',
                        fontSize: '1rem',
                      }}
                    >
                      {summary.holiday_work_count}日
                    </button>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() =>
                        setModalState({
                          staffId: summary.staff_id,
                          staffName: summary.staff_name,
                          leaveType: 'new_employee_leave',
                          leaveLabel: '休暇（6ヶ月以内社員）',
                        })
                      }
                      disabled={summary.new_employee_leave_count === 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: summary.new_employee_leave_count > 0 ? '#007bff' : '#999',
                        cursor: summary.new_employee_leave_count > 0 ? 'pointer' : 'default',
                        textDecoration: summary.new_employee_leave_count > 0 ? 'underline' : 'none',
                        fontSize: '1rem',
                      }}
                    >
                      {summary.new_employee_leave_count}日
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* サマリー統計 */}
          <div
            style={{
              marginTop: '2rem',
              padding: '1.5rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
            }}
          >
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
              {startDate || endDate ? '期間内の合計' : '全期間の累計'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  総出勤日数
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#007bff' }}>
                  {summaries.reduce((sum, s) => sum + s.work_days, 0)}日
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#0056b3', marginBottom: '0.5rem' }}>
                  総残業時間
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0056b3' }}>
                  {summaries.reduce((sum, s) => sum + s.total_overtime, 0).toFixed(1)}時間
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#856404', marginBottom: '0.5rem' }}>
                  確定残業時間
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#856404' }}>
                  {summaries.reduce((sum, s) => sum + s.confirmed_overtime, 0).toFixed(1)}時間
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  総有給休暇
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#28a745' }}>
                  {summaries.reduce((sum, s) => sum + s.paid_leave_count, 0)}日
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  総代休
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#6c757d' }}>
                  {summaries.reduce((sum, s) => sum + s.compensatory_leave_count, 0)}日
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  総休日出勤
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#dc3545' }}>
                  {summaries.reduce((sum, s) => sum + s.holiday_work_count, 0)}日
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  総休暇（6ヶ月以内社員）
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fd7e14' }}>
                  {summaries.reduce((sum, s) => sum + s.new_employee_leave_count, 0)}日
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 日付一覧モーダル */}
      {modalState && (
        <LeaveDatesModal
          staffId={modalState.staffId}
          staffName={modalState.staffName}
          leaveType={modalState.leaveType}
          leaveLabel={modalState.leaveLabel}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setModalState(null)}
        />
      )}

      {/* メールプレビューモーダル */}
      {showEmailPreview && (
        <EmailPreviewModal
          startDate={startDate}
          endDate={endDate}
          summaries={summaries}
          recipientEmail="wjiia_oi@yahoo.co.jp"
          additionalMessage={additionalMessage}
          onClose={() => setShowEmailPreview(false)}
          onSend={handleSendEmail}
        />
      )}
    </main>
  );
}
