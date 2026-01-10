// メールプレビューモーダル

'use client';

import { useState } from 'react';

interface StaffSummary {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  is_holiday_staff: boolean;
  work_days: number;
  total_work_hours: number;
  total_overtime: number;
  paid_leave_count: number;
  paid_leave_dates: string[];
  compensatory_leave_count: number;
  holiday_work_count: number;
  new_employee_leave_count: number;
}

interface EmailPreviewModalProps {
  startDate: string;
  endDate: string;
  summaries: StaffSummary[];
  recipientEmail: string;
  additionalMessage?: string;
  onClose: () => void;
  onSend: () => void;
}

export function EmailPreviewModal({
  startDate,
  endDate,
  summaries,
  recipientEmail,
  additionalMessage,
  onClose,
  onSend,
}: EmailPreviewModalProps) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    await onSend();
    setSending(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>メールプレビュー</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            ×
          </button>
        </div>

        {/* メール情報 */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa',
          }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>送信先:</strong> {recipientEmail}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>件名:</strong> 勤怠サマリー（{startDate}〜{endDate}）
          </div>
          <div>
            <strong>対象:</strong> 全社員 {summaries.length}名
          </div>
        </div>

        {/* メール本文プレビュー */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '1.5rem',
          }}
        >
          <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.6, color: '#333' }}>
            <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
              勤怠サマリー
            </h1>
            
            {additionalMessage && (
              <div style={{ 
                backgroundColor: '#fff3cd', 
                padding: '15px', 
                borderRadius: '5px', 
                margin: '20px 0',
                borderLeft: '4px solid #ffc107'
              }}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{additionalMessage}</p>
              </div>
            )}
            
            <div style={{ backgroundColor: '#ecf0f1', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>期間:</strong> {startDate} 〜 {endDate}
              </p>
              <p style={{ margin: 0 }}>
                <strong>対象:</strong> 全社員 {summaries.length}名
              </p>
            </div>

            <h2 style={{ color: '#34495e', marginTop: '30px' }}>勤怠一覧</h2>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0' }}>
              <thead>
                <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>社員名</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>祝日対応</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>出勤日数</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>総労働時間</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>総残業時間</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>有給休暇</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>代休</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>休日出勤</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary, index) => (
                  <tr
                    key={summary.staff_id}
                    style={{
                      borderBottom: '1px solid #ddd',
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                    }}
                  >
                    <td style={{ padding: '10px' }}>
                      <strong>{summary.staff_name}</strong>
                      <br />
                      <small style={{ color: '#7f8c8d' }}>{summary.staff_email}</small>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {summary.is_holiday_staff ? (
                        <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✓ 祝日対応</span>
                      ) : (
                        '祝日対応なし'
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>{summary.work_days}日</td>
                    <td style={{ padding: '10px' }}>{summary.total_work_hours.toFixed(1)}時間</td>
                    <td style={{ padding: '10px' }}>{summary.total_overtime.toFixed(1)}時間</td>
                    <td style={{ padding: '10px' }}>
                      {summary.paid_leave_count}日
                      {summary.paid_leave_dates && summary.paid_leave_dates.length > 0 && (
                        <div style={{ fontSize: '0.85em', color: '#7f8c8d', marginTop: '5px' }}>
                          {summary.paid_leave_dates.map((date) => {
                            const d = new Date(date);
                            return `${d.getMonth() + 1}/${d.getDate()}`;
                          }).join('、')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>{summary.compensatory_leave_count}日</td>
                    <td style={{ padding: '10px' }}>{summary.holiday_work_count}日</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ backgroundColor: '#ecf0f1', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
              <p style={{ margin: 0 }}>
                <small>このメールは勤怠管理システムから自動送信されています。</small>
              </p>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            padding: '1.5rem',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
          }}
        >
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.6 : 1,
              fontSize: '0.9rem',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: sending ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: sending ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
            }}
          >
            {sending ? '送信中...' : 'メール送信'}
          </button>
        </div>
      </div>
    </div>
  );
}
