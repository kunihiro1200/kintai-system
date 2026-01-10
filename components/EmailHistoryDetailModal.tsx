'use client';

import { useState, useEffect } from 'react';

interface EmailHistoryDetailModalProps {
  historyId: string;
  onClose: () => void;
}

interface EmailHistoryDetail {
  id: string;
  sent_at: string;
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  start_date: string;
  end_date: string;
  email_content: {
    summaries: any[];
    additionalMessage?: string;
  };
}

export function EmailHistoryDetailModal({ historyId, onClose }: EmailHistoryDetailModalProps) {
  const [detail, setDetail] = useState<EmailHistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [historyId]);

  const fetchDetail = async () => {
    try {
      const response = await fetch(`/api/attendance/email-history/${historyId}`);
      const data = await response.json();
      if (data.success) {
        setDetail(data.data);
      }
    } catch (error) {
      console.error('履歴詳細の取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '90%',
            maxHeight: '90%',
            overflow: 'auto',
          }}
        >
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

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
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '90%',
          maxHeight: '90%',
          overflow: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '2px solid #e0e0e0', paddingBottom: '1rem' }}>
          <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>送信履歴詳細</h2>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
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

        {/* 送信情報 */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>送信日時:</strong> {new Date(detail.sent_at).toLocaleString('ja-JP')}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>送信者:</strong> {detail.sender_name} ({detail.sender_email})
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>送信先:</strong> {detail.recipient_email}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>件名:</strong> {detail.subject}
          </div>
          <div>
            <strong>期間:</strong> {detail.start_date} 〜 {detail.end_date}
          </div>
        </div>

        {/* 追加メッセージ */}
        {detail.email_content.additionalMessage && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', borderLeft: '4px solid #ffc107' }}>
            <strong>追加メッセージ:</strong>
            <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
              {detail.email_content.additionalMessage}
            </div>
          </div>
        )}

        {/* サマリーテーブル */}
        <div>
          <h3 style={{ marginBottom: '1rem' }}>勤怠サマリー</h3>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    社員名
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                    祝日対応
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                    出勤日数
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                    総残業時間
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                    確定残業時間
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                    有給休暇
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.email_content.summaries.map((summary: any, index: number) => (
                  <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 'bold' }}>{summary.staff_name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>{summary.staff_email}</div>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {summary.is_holiday_staff ? '✓ 祝日対応' : '通常'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {summary.work_days}日
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {summary.total_overtime}時間
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                      {summary.confirmed_overtime}時間
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {summary.paid_leave_count}日
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 閉じるボタン */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
