// 休暇日付一覧モーダルコンポーネント

import { useEffect, useState } from 'react';
import { formatDateJapanese } from '@/lib/utils/date';

interface LeaveDatesModalProps {
  staffId: string;
  staffName: string;
  leaveType: 'paid_leave' | 'compensatory_leave' | 'holiday_work' | 'new_employee_leave';
  leaveLabel: string;
  startDate?: string;
  endDate?: string;
  onClose: () => void;
}

interface LeaveDate {
  date: string;
  half_leave_period?: string;
  leave_type?: string;
}

export function LeaveDatesModal({
  staffId,
  staffName,
  leaveType,
  leaveLabel,
  startDate,
  endDate,
  onClose,
}: LeaveDatesModalProps) {
  const [dates, setDates] = useState<LeaveDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDates = async () => {
      try {
        const params = new URLSearchParams({
          staffId,
          leaveType,
        });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(`/api/attendance/leave-dates?${params}`);
        const data = await response.json();

        if (data.success) {
          setDates(data.data.dates);
        } else {
          setError(data.error?.message || '日付の取得に失敗しました');
        }
      } catch (err) {
        setError('日付の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchDates();
  }, [staffId, leaveType, startDate, endDate]);

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
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '1rem', fontSize: '1.3rem' }}>
          {staffName} - {leaveLabel}
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>読み込み中...</p>
          </div>
        ) : error ? (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              color: '#721c24',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        ) : dates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
            該当する日付がありません
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
              合計: {dates.length}日
            </div>
            <div
              style={{
                maxHeight: '400px',
                overflow: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
              }}
            >
              {dates.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: index < dates.length - 1 ? '1px solid #e0e0e0' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{formatDateJapanese(item.date)}</span>
                  {item.leave_type === 'half_leave' && item.half_leave_period && (
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.85rem',
                        backgroundColor: '#d1ecf1',
                        color: '#0c5460',
                        borderRadius: '12px',
                        fontWeight: '500',
                      }}
                    >
                      {item.half_leave_period === 'morning' ? '午前半休' : '午後半休'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
