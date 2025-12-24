'use client';

import { useAuth } from '@/components/AuthProvider';
import { AttendanceHistory } from '@/components/AttendanceHistory';
import { EditTimeModal } from '@/components/EditTimeModal';
import { useState, useEffect } from 'react';
import { AttendanceRecord } from '@/types/database';
import Link from 'next/link';

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [leaveSummary, setLeaveSummary] = useState({
    paidLeaveCount: 0,
    compensatoryLeaveCount: 0,
    holidayWorkCount: 0,
  });

  // 勤怠履歴を取得
  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/attendance/history?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.data.records);
        setTotalPages(data.data.totalPages);
        
        // 表示されている記録から休暇カウントを計算
        calculateLeaveSummary(data.data.records);
      } else {
        setError(data.error?.message || '履歴の取得に失敗しました');
      }
    } catch (err) {
      setError('履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 休暇カウントを計算
  const calculateLeaveSummary = (records: AttendanceRecord[]) => {
    let paidLeaveCount = 0;
    let compensatoryLeaveCount = 0;
    let holidayWorkCount = 0;

    records.forEach((record) => {
      switch (record.leave_type) {
        case 'paid_leave':
          paidLeaveCount += 1;
          break;
        case 'half_leave':
          paidLeaveCount += 0.5;
          break;
        case 'compensatory_leave':
          compensatoryLeaveCount += 1;
          break;
        case 'holiday_work':
          holidayWorkCount += 1;
          break;
      }
    });

    setLeaveSummary({
      paidLeaveCount,
      compensatoryLeaveCount,
      holidayWorkCount,
    });
  };

  // 記録を削除
  const handleDelete = async (record: AttendanceRecord) => {
    try {
      const response = await fetch('/api/attendance/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordId: record.id }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '記録を削除しました' });
        fetchHistory(); // 履歴を再取得
      } else {
        setMessage({ type: 'error', text: data.error?.message || '削除に失敗しました' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '削除に失敗しました' });
    }
  };

  // 初回読み込み時とフィルター変更時に履歴を取得
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, page, startDate, endDate]);

  // フィルターをクリア
  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  if (authLoading) {
    return (
      <main style={{ padding: '2rem' }}>
        <p>読み込み中...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '1rem' }}>勤怠履歴</h1>
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

      {/* 日付範囲フィルター */}
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
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
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
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>
          <div style={{ marginTop: 'auto' }}>
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

      {/* 休暇カウントサマリー */}
      <div
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          backgroundColor: '#f0f8ff',
        }}
      >
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 'bold' }}>
          表示期間の休暇サマリー
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
              有給休暇
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
              {leaveSummary.paidLeaveCount}日
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
              代休
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6c757d' }}>
              {leaveSummary.compensatoryLeaveCount}日
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
              休日出勤
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>
              {leaveSummary.holidayWorkCount}日
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            color: message.type === 'success' ? '#155724' : '#721c24',
          }}
        >
          {message.text}
        </div>
      )}

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
          <AttendanceHistory 
            records={records} 
            onEdit={(record) => setEditingRecord(record)}
            onDelete={handleDelete}
          />

          {/* ページネーション */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '2rem',
              }}
            >
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: page === 1 ? '#e0e0e0' : '#007bff',
                  color: page === 1 ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                前へ
              </button>
              <span style={{ padding: '0.5rem 1rem', alignSelf: 'center' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: page === totalPages ? '#e0e0e0' : '#007bff',
                  color: page === totalPages ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                次へ
              </button>
            </div>
          )}
        </>
      )}

      {editingRecord && editingRecord.clock_in && (
        <EditTimeModal
          recordId={editingRecord.id}
          currentClockIn={editingRecord.clock_in}
          currentClockOut={editingRecord.clock_out || undefined}
          onClose={() => {
            setEditingRecord(null);
            setMessage(null);
          }}
          onSave={() => {
            setEditingRecord(null);
            fetchHistory();
            setMessage({ type: 'success', text: '時刻を修正しました' });
          }}
        />
      )}
    </main>
  );
}
