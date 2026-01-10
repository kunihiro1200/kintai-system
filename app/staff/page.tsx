'use client';

import { useAuth } from '@/components/AuthProvider';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Staff {
  id: string;
  email: string;
  name: string;
  is_system_admin: boolean;
  is_holiday_staff: boolean;
  is_active: boolean;
  created_at: string;
}

interface SystemAdminStatus {
  hasSystemAdmin: boolean;
  systemAdmins: Array<{
    email: string;
    name: string;
    isGoogleConnected: boolean;
  }>;
}

export default function StaffPage() {
  const { user, loading: authLoading } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [systemAdminStatus, setSystemAdminStatus] = useState<SystemAdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // システム管理者ステータスを取得
  const fetchSystemAdminStatus = async () => {
    try {
      const response = await fetch('/api/staff/system-admin-status');
      const data = await response.json();

      console.log('システム管理者ステータスAPIレスポンス:', data);

      if (data.success) {
        console.log('システム管理者ステータス設定:', data.data);
        setSystemAdminStatus(data.data);
      }
    } catch (err) {
      console.error('システム管理者ステータス取得エラー:', err);
    }
  };

  // スタッフ一覧を取得
  const fetchStaffList = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/staff/list');
      const data = await response.json();

      if (data.success) {
        setStaffList(data.data.staffs);
      } else {
        setError(data.error?.message || 'スタッフ一覧の取得に失敗しました');
      }
    } catch (err) {
      setError('スタッフ一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // システム管理者を設定
  const handleSetSystemAdmin = async (staffId: string) => {
    if (!confirm('このスタッフをシステム管理者に設定しますか？')) {
      return;
    }

    try {
      const response = await fetch('/api/staff/set-system-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staffId }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'システム管理者を設定しました',
        });
        await fetchStaffList();
        await fetchSystemAdminStatus();
      } else {
        setMessage({
          type: 'error',
          text: data.error?.message || 'システム管理者の設定に失敗しました',
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'システム管理者の設定に失敗しました',
      });
    }
  };

  // システム管理者を解除
  const handleRemoveSystemAdmin = async (staffId: string) => {
    if (!confirm('このスタッフのシステム管理者権限を解除しますか？')) {
      return;
    }

    try {
      const response = await fetch('/api/staff/remove-system-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staffId }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'システム管理者権限を解除しました',
        });
        await fetchStaffList();
        await fetchSystemAdminStatus();
      } else {
        setMessage({
          type: 'error',
          text: data.error?.message || 'システム管理者の解除に失敗しました',
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'システム管理者の解除に失敗しました',
      });
    }
  };

  // 祝日対応スタッフを切り替え
  const handleToggleHolidayStaff = async (staffId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const confirmMessage = newStatus
      ? 'このスタッフを祝日対応スタッフに設定しますか？（月10時間超過で残業）'
      : 'このスタッフの祝日対応を解除しますか？（月7時間超過で残業）';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch('/api/staff/holiday-staff', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staffId, isHolidayStaff: newStatus }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: newStatus ? '祝日対応スタッフに設定しました' : '祝日対応を解除しました',
        });
        await fetchStaffList();
      } else {
        setMessage({
          type: 'error',
          text: data.error || '祝日対応スタッフの設定に失敗しました',
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: '祝日対応スタッフの設定に失敗しました',
      });
    }
  };

  // スプレッドシートから同期
  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/staff/sync', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `同期完了: 追加 ${data.data.added}件、更新 ${data.data.updated}件（全${data.data.total}件）`,
        });
        await fetchStaffList();
      } else {
        setMessage({
          type: 'error',
          text: data.error?.message || 'スタッフ情報の同期に失敗しました',
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'スタッフ情報の同期に失敗しました',
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (user) {
      // 管理者チェック
      const adminEmails = [
        'tomoko.kunihiro@ifoo-oita.com',
        'yurine.kimura@ifoo-oita.com',
        'mariko.kume@ifoo-oita.com',
      ];
      if (!adminEmails.includes(user.email || '')) {
        setError('アクセス権限がありません');
        setLoading(false);
        return;
      }
      fetchStaffList();
      fetchSystemAdminStatus();
    }
  }, [user]);

  if (authLoading) {
    return (
      <main style={{ padding: '2rem' }}>
        <p>読み込み中...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '1rem' }}>スタッフ管理</h1>
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

      {/* システム管理者ステータス */}
      {systemAdminStatus && (
        <div
          style={{
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: '#f0f8ff',
          }}
        >
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
            システム管理者ステータス
          </h3>
          {systemAdminStatus.hasSystemAdmin && systemAdminStatus.systemAdmins && systemAdminStatus.systemAdmins.length > 0 ? (
            <div>
              <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                システム管理者 ({systemAdminStatus.systemAdmins.length}人):
              </p>
              {systemAdminStatus.systemAdmins.map((admin, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: '0.75rem',
                    paddingLeft: '1rem',
                    borderLeft: '3px solid #007bff',
                  }}
                >
                  <p style={{ marginBottom: '0.25rem' }}>
                    <strong>{admin.name}</strong> ({admin.email})
                  </p>
                  <p style={{ marginBottom: '0', fontSize: '0.9rem' }}>
                    <strong>Google連携:</strong>{' '}
                    <span
                      style={{
                        color: admin.isGoogleConnected ? '#28a745' : '#dc3545',
                        fontWeight: 'bold',
                      }}
                    >
                      {admin.isGoogleConnected ? '✓ 連携済み' : '✗ 未連携'}
                    </span>
                  </p>
                </div>
              ))}
              {systemAdminStatus.systemAdmins.some(admin => !admin.isGoogleConnected) && (
                <p style={{ fontSize: '0.85rem', color: '#856404', marginTop: '0.5rem' }}>
                  ⚠️ Google連携が未完了の管理者がいます。該当の管理者としてログインし、Googleカレンダー連携を行ってください
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: '#856404' }}>
              ⚠️ システム管理者が設定されていません。スタッフ一覧から設定してください。
            </p>
          )}
        </div>
      )}

      {/* 同期ボタン */}
      <div
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9',
        }}
      >
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
          Googleスプレッドシートから同期
        </h3>
        <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
          スプレッドシート「スタッフ」シートからスタッフ情報を読み込みます。
          <br />
          <small>
            スプレッドシートID: 19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs
          </small>
        </p>
        {systemAdminStatus && !systemAdminStatus.hasSystemAdmin && (
          <p style={{ fontSize: '0.85rem', color: '#dc3545', marginBottom: '1rem' }}>
            ⚠️ システム管理者が設定されていないため、同期できません
          </p>
        )}
        {systemAdminStatus && systemAdminStatus.hasSystemAdmin && systemAdminStatus.systemAdmins && !systemAdminStatus.systemAdmins.some(admin => admin.isGoogleConnected) && (
          <p style={{ fontSize: '0.85rem', color: '#856404', marginBottom: '1rem' }}>
            ⚠️ いずれかのシステム管理者のGoogle連携が必要です
          </p>
        )}
        <button
          onClick={handleSync}
          disabled={syncing || !systemAdminStatus?.hasSystemAdmin || !systemAdminStatus?.systemAdmins || !systemAdminStatus.systemAdmins.some(admin => admin.isGoogleConnected)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (syncing || !systemAdminStatus?.hasSystemAdmin || !systemAdminStatus?.systemAdmins || !systemAdminStatus.systemAdmins.some(admin => admin.isGoogleConnected)) ? 'not-allowed' : 'pointer',
            opacity: (syncing || !systemAdminStatus?.hasSystemAdmin || !systemAdminStatus?.systemAdmins || !systemAdminStatus.systemAdmins.some(admin => admin.isGoogleConnected)) ? 0.6 : 1,
            fontSize: '0.9rem',
          }}
          onMouseEnter={() => {
            console.log('同期ボタンの状態チェック:');
            console.log('  syncing:', syncing);
            console.log('  systemAdminStatus:', systemAdminStatus);
            console.log('  hasSystemAdmin:', systemAdminStatus?.hasSystemAdmin);
            console.log('  systemAdmins:', systemAdminStatus?.systemAdmins);
            console.log('  Google連携済み管理者:', systemAdminStatus?.systemAdmins?.filter(admin => admin.isGoogleConnected));
          }}
        >
          {syncing ? '同期中...' : 'スプレッドシートから同期'}
        </button>
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
          <div
            style={{
              marginBottom: '1rem',
              fontSize: '0.9rem',
              color: '#666',
            }}
          >
            登録スタッフ数: {staffList.length}人
          </div>

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
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '2px solid #dee2e6',
                    }}
                  >
                    名前
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '2px solid #dee2e6',
                    }}
                  >
                    メールアドレス
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'center',
                      borderBottom: '2px solid #dee2e6',
                    }}
                  >
                    ステータス
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'center',
                      borderBottom: '2px solid #dee2e6',
                    }}
                  >
                    祝日対応
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'center',
                      borderBottom: '2px solid #dee2e6',
                    }}
                  >
                    登録日
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'center',
                      borderBottom: '2px solid #dee2e6',
                    }}
                  >
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr 
                    key={staff.id} 
                    style={{ 
                      borderBottom: '1px solid #dee2e6',
                      backgroundColor: staff.is_active ? 'transparent' : '#f8f9fa',
                      opacity: staff.is_active ? 1 : 0.6,
                    }}
                  >
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                      {staff.name}
                      {staff.is_system_admin && (
                        <span
                          style={{
                            marginLeft: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                          }}
                        >
                          システム管理者
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: '#666' }}>
                      {staff.email}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: staff.is_active ? '#d4edda' : '#f8d7da',
                          color: staff.is_active ? '#155724' : '#721c24',
                          fontSize: '0.85rem',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                        }}
                      >
                        {staff.is_active ? 'アクティブ' : '非アクティブ'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggleHolidayStaff(staff.id, staff.is_holiday_staff)}
                        disabled={!staff.is_active}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: staff.is_holiday_staff ? '#28a745' : '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: staff.is_active ? 'pointer' : 'not-allowed',
                          fontSize: '0.85rem',
                          opacity: staff.is_active ? 1 : 0.5,
                        }}
                      >
                        {staff.is_holiday_staff ? '✓ 祝日対応' : '祝日対応なし'}
                      </button>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                        {staff.is_holiday_staff ? '月10h超過で残業' : '月7h超過で残業'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                      {new Date(staff.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {staff.is_system_admin ? (
                        <button
                          onClick={() => handleRemoveSystemAdmin(staff.id)}
                          disabled={!staff.is_active}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: staff.is_active ? 'pointer' : 'not-allowed',
                            fontSize: '0.85rem',
                            opacity: staff.is_active ? 1 : 0.5,
                          }}
                        >
                          管理者権限を解除
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetSystemAdmin(staff.id)}
                          disabled={!staff.is_active}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: staff.is_active ? 'pointer' : 'not-allowed',
                            fontSize: '0.85rem',
                            opacity: staff.is_active ? 1 : 0.5,
                          }}
                        >
                          システム管理者に設定
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
