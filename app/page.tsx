'use client';

import { useAuth } from '@/components/AuthProvider';
import { StatusDisplay } from '@/components/StatusDisplay';
import { AttendanceButton } from '@/components/AttendanceButton';
import { EditTimeModal } from '@/components/EditTimeModal';
import { LeaveModal } from '@/components/LeaveModal';
import { GoogleCalendarConnect } from '@/components/GoogleCalendarConnect';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LeaveType, LeaveSummary, HalfLeavePeriod } from '@/types/database';

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [status, setStatus] = useState<'not_clocked_in' | 'clocked_in' | 'clocked_out' | 'on_leave'>('not_clocked_in');
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [selectedLeaveLabel, setSelectedLeaveLabel] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary>({
    paid_leave_count: 0,
    compensatory_leave_count: 0,
    holiday_work_count: 0,
    new_employee_leave_count: 0,
  });

  // 現在のステータスを取得
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/attendance/current');
      const data = await response.json();

      if (data.success) {
        setStatus(data.data.status);
        setRecord(data.data.record);
      }
    } catch (error) {
      console.error('ステータス取得エラー:', error);
    }
  };

  // 休暇サマリーを取得
  const fetchLeaveSummary = async () => {
    try {
      const response = await fetch('/api/attendance/leave-summary');
      const data = await response.json();

      if (data.success) {
        setLeaveSummary(data.data);
      }
    } catch (error) {
      console.error('休暇サマリー取得エラー:', error);
    }
  };

  // システム管理者かどうかを確認
  const checkSystemAdmin = async () => {
    try {
      const response = await fetch('/api/staff/system-admin-status');
      const data = await response.json();

      if (data.success && data.data.systemAdmins) {
        // 現在のユーザーがシステム管理者リストに含まれているか確認
        const isAdmin = data.data.systemAdmins.some(
          (admin: any) => admin.email === user?.email
        );
        setIsSystemAdmin(isAdmin);
      }
    } catch (error) {
      console.error('システム管理者確認エラー:', error);
    }
  };

  // 初回読み込み時にステータスと休暇サマリーを取得
  useEffect(() => {
    if (user) {
      fetchStatus();
      fetchLeaveSummary();
      checkSystemAdmin();
    }
  }, [user]);

  // 出勤処理
  const handleClockIn = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/attendance/clock-in', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '出勤を記録しました' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error?.message || '出勤の記録に失敗しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '出勤の記録に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  // 退勤処理
  const handleClockOut = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '退勤を記録しました' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error?.message || '退勤の記録に失敗しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '退勤の記録に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  // 休暇ボタンクリック処理
  const handleLeaveButtonClick = (leaveType: LeaveType, label: string) => {
    setSelectedLeaveType(leaveType);
    setSelectedLeaveLabel(label);
    setShowLeaveModal(true);
  };

  // 休暇記録処理
  const handleLeave = async (date: string, halfLeavePeriod?: HalfLeavePeriod) => {
    if (!selectedLeaveType) return;

    setLoading(true);
    setMessage(null);
    setShowLeaveModal(false);

    try {
      const response = await fetch('/api/attendance/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          leaveType: selectedLeaveType,
          date,
          halfLeavePeriod,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `${selectedLeaveLabel}を記録しました` });
        await fetchStatus();
        await fetchLeaveSummary();
      } else {
        setMessage({ type: 'error', text: data.error?.message || `${selectedLeaveLabel}の記録に失敗しました` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `${selectedLeaveLabel}の記録に失敗しました` });
    } finally {
      setLoading(false);
      setSelectedLeaveType(null);
      setSelectedLeaveLabel('');
    }
  };

  if (authLoading) {
    return (
      <main style={{ padding: '2rem' }}>
        <p>読み込み中...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>勤怠管理システム</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link
            href="/history"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '0.9rem',
            }}
          >
            勤怠履歴
          </Link>
          {isSystemAdmin && (
            <>
              <Link
                href="/admin"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                }}
              >
                全社員サマリー
              </Link>
              <Link
                href="/staff"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                }}
              >
                スタッフ管理
              </Link>
            </>
          )}
        </div>
      </div>

      {user && (
        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
          <p>ログイン中: {user.email}</p>
        </div>
      )}

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

      {/* ステータス表示と出退勤ボタン */}
      <div style={{ marginBottom: '1.5rem' }}>
        <StatusDisplay status={status} record={record} />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <AttendanceButton
          status={status}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          loading={loading}
        />
      </div>

      {/* 休暇ボタン */}
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          backgroundColor: '#fff',
        }}
      >
        <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>休暇・休日出勤の記録</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={() => handleLeaveButtonClick('paid_leave', '有給休暇')}
            disabled={loading}
            style={{
              padding: '0.75rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '0.9rem',
            }}
          >
            有給休暇
          </button>
          <button
            onClick={() => handleLeaveButtonClick('special_leave', '特別休暇')}
            disabled={loading}
            style={{
              padding: '0.75rem',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '0.9rem',
            }}
          >
            特別休暇
          </button>
          <button
            onClick={() => handleLeaveButtonClick('half_leave', '半休')}
            disabled={loading}
            style={{
              padding: '0.75rem',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '0.9rem',
            }}
          >
            半休
          </button>
          <button
            onClick={() => handleLeaveButtonClick('compensatory_leave', '代休')}
            disabled={loading}
            style={{
              padding: '0.75rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '0.9rem',
            }}
          >
            代休
          </button>
          <button
            onClick={() => handleLeaveButtonClick('holiday_work', '休日出勤')}
            disabled={loading}
            style={{
              padding: '0.75rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '0.9rem',
            }}
          >
            休日出勤
          </button>
          <button
            onClick={() => handleLeaveButtonClick('new_employee_leave', '休暇（6ヶ月以内社員）')}
            disabled={loading}
            style={{
              padding: '0.75rem',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '0.9rem',
            }}
          >
            休暇（6ヶ月以内社員）
          </button>
        </div>
      </div>

      {/* 休暇サマリー表示 */}
      <div
        style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9',
        }}
      >
        <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>休暇・休日出勤サマリー</h3>
        <div style={{ fontSize: '0.9rem', color: '#555' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>有給休暇:</strong> {leaveSummary.paid_leave_count}日
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>代休:</strong> {leaveSummary.compensatory_leave_count}日
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>休日出勤:</strong> {leaveSummary.holiday_work_count}日
          </div>
          <div>
            <strong>休暇（6ヶ月以内社員）:</strong> {leaveSummary.new_employee_leave_count}日
          </div>
        </div>
      </div>

      {/* 勤怠ルール */}
      <div
        style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          backgroundColor: '#fff3cd',
        }}
      >
        <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', color: '#856404' }}>勤怠ルール</h3>
        <div style={{ fontSize: '0.85rem', color: '#856404', lineHeight: '1.6' }}>
          <ol style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>出退勤は基本的にパソコンで行うこと。やむを得ない場合はスマホで可能。</li>
            <li style={{ marginBottom: '0.5rem' }}>仕事をする準備が整ってから出勤時間を押すこと</li>
            <li style={{ marginBottom: '0.5rem' }}>祝日出勤者は祝日に休暇をとると、祝日手当はでません</li>
            <li style={{ marginBottom: '0.5rem' }}>当社の法定休日は水曜日のため、月曜に振替休日はありません。水曜祝日だった場合に、木曜日が振替休日となります。（祝日出勤者は関係ない）</li>
            <li style={{ marginBottom: '0.5rem' }}>月曜が祝日の場合、月曜祝日出勤者が行うこと。（９時半出社でよい）</li>
            <li style={{ marginBottom: '0.5rem' }}>有給休暇、その他休暇を取る場合は、必ずこのサイトから休暇ボタンを押してください。自動でGカレンダーに表示されます。変更や削除もこのサイトで行うと、自動的にカレンダーも修正、削除されます。手入力は禁止です。</li>
          </ol>
          
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #ffc107' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>スマホでの設定方法</h4>
            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Androidの場合:</strong></p>
            <ol style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.5rem' }}>
              <li>Chromeで https://kintai-system-pi.vercel.app を開く</li>
              <li>画面右上の「︙」（3点メニュー）をタップ</li>
              <li>「ホーム画面に追加」を選択</li>
              <li>アプリ名を入力（例：「勤怠管理」）</li>
              <li>「追加」をタップ</li>
            </ol>
          </div>

          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#d1ecf1', borderRadius: '4px', border: '1px solid #bee5eb' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#0c5460' }}>毎月17日までにフレックスへ連絡</h4>
            <p style={{ margin: 0, color: '#0c5460' }}>
              事務は、「全社員勤怠サマリー」から、残業時間のみを確認し大幅に超えている場合、その人に確認し、17日までにフレックスに連絡すること
            </p>
          </div>
        </div>
      </div>

      {showEditModal && record && (
        <EditTimeModal
          recordId={record.id}
          currentClockIn={record.clock_in}
          currentClockOut={record.clock_out}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            fetchStatus();
            setMessage({ type: 'success', text: '時刻を修正しました' });
          }}
        />
      )}

      {showLeaveModal && selectedLeaveType && (
        <LeaveModal
          leaveType={selectedLeaveType}
          leaveLabel={selectedLeaveLabel}
          onClose={() => {
            setShowLeaveModal(false);
            setSelectedLeaveType(null);
            setSelectedLeaveLabel('');
          }}
          onSave={handleLeave}
        />
      )}

      {/* Googleカレンダー連携 */}
      <GoogleCalendarConnect onConnectionChange={setCalendarConnected} />

      {/* ログアウトボタン */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          onClick={signOut}
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
          ログアウト
        </button>
      </div>
    </main>
  );
}
