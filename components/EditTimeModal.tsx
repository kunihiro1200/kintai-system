// 時刻修正モーダルコンポーネント

import { useState } from 'react';
import { formatTime, parseDateTime } from '@/lib/utils/date';

interface EditTimeModalProps {
  recordId: string;
  currentClockIn: string;
  currentClockOut?: string;
  onClose: () => void;
  onSave: () => void;
}

export function EditTimeModal({
  recordId,
  currentClockIn,
  currentClockOut,
  onClose,
  onSave,
}: EditTimeModalProps) {
  const [clockInTime, setClockInTime] = useState(
    formatTime(parseDateTime(currentClockIn))
  );
  const [clockOutTime, setClockOutTime] = useState(
    currentClockOut ? formatTime(parseDateTime(currentClockOut)) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // 元の日付をローカルタイムゾーンで取得
      const originalDate = parseDateTime(currentClockIn);
      const year = originalDate.getFullYear();
      const month = String(originalDate.getMonth() + 1).padStart(2, '0');
      const day = String(originalDate.getDate()).padStart(2, '0');
      
      // 入力された時刻でローカルDateオブジェクトを作成
      const [inHours, inMinutes] = clockInTime.split(':');
      const newClockInDate = new Date(year, originalDate.getMonth(), originalDate.getDate(), 
                                       parseInt(inHours), parseInt(inMinutes), 0);
      
      let newClockOutDate = null;
      if (clockOutTime) {
        const [outHours, outMinutes] = clockOutTime.split(':');
        newClockOutDate = new Date(year, originalDate.getMonth(), originalDate.getDate(), 
                                    parseInt(outHours), parseInt(outMinutes), 0);
      }

      // ISO文字列に変換（ローカルタイムゾーンがUTCに変換される）
      const newClockIn = newClockInDate.toISOString();
      const newClockOut = newClockOutDate ? newClockOutDate.toISOString() : null;

      const response = await fetch('/api/attendance/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordId,
          clockIn: newClockIn,
          clockOut: newClockOut,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSave();
        onClose();
      } else {
        setError(data.error?.message || '更新に失敗しました');
      }
    } catch (err) {
      setError('更新に失敗しました');
    } finally {
      setLoading(false);
    }
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
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>時刻を修正</h2>

        {error && (
          <div
            style={{
              padding: '1rem',
              marginBottom: '1rem',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              color: '#721c24',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
            }}
          >
            出勤時刻
          </label>
          <input
            type="time"
            value={clockInTime}
            onChange={(e) => setClockInTime(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        {currentClockOut && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
              }}
            >
              退勤時刻
            </label>
            <input
              type="time"
              value={clockOutTime}
              onChange={(e) => setClockOutTime(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
