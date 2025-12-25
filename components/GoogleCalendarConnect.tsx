// Googleカレンダー連携コンポーネント

'use client';

import { useState, useEffect } from 'react';

interface GoogleCalendarConnectProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function GoogleCalendarConnect({ onConnectionChange }: GoogleCalendarConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // 連携状態を確認
  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/calendar/status');
      const data = await response.json();

      if (data.success) {
        setIsConnected(data.data.isConnected);
        setGoogleEmail(data.data.googleEmail);
      }
    } catch (error) {
      console.error('連携状態の確認に失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();

    // URLパラメータから連携成功を確認
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar_connected') === 'true') {
      // URLパラメータをクリア
      window.history.replaceState({}, '', window.location.pathname);
      // 状態を再確認
      checkConnectionStatus();
    }

    // エラーメッセージを表示
    const error = params.get('error');
    if (error) {
      let errorMessage = 'Googleカレンダー連携に失敗しました';
      
      switch (error) {
        case 'access_denied':
          errorMessage = 'Googleカレンダーへのアクセスが拒否されました';
          break;
        case 'invalid_request':
          errorMessage = '無効なリクエストです';
          break;
        case 'no_email':
          errorMessage = 'Googleアカウントのメールアドレスを取得できませんでした';
          break;
        case 'callback_failed':
          errorMessage = '認証処理に失敗しました。もう一度お試しください';
          break;
      }
      
      alert(errorMessage);
      console.error('Google Calendar連携エラー:', error);
      
      // URLパラメータをクリア
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 連携状態が変わったら親に通知
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(isConnected);
    }
  }, [isConnected, onConnectionChange]);

  // Googleカレンダー連携を開始
  const handleConnect = () => {
    console.log('=== Googleカレンダー連携開始 ===');
    console.log('現在のURL:', window.location.href);
    console.log('リダイレクト先:', '/api/auth/google');
    
    setActionLoading(true);
    window.location.href = '/api/auth/google';
  };

  // Googleカレンダー連携を解除
  const handleDisconnect = async () => {
    if (!confirm('Googleカレンダーの連携を解除しますか？')) {
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setIsConnected(false);
        setGoogleEmail(null);
        alert('Googleカレンダーの連携を解除しました');
      } else {
        alert('連携解除に失敗しました');
      }
    } catch (error) {
      console.error('連携解除エラー:', error);
      alert('連携解除に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}
      >
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '1rem',
        border: '1px solid #dee2e6',
      }}
    >
      <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
        Googleカレンダー連携
      </h3>

      {isConnected ? (
        <div>
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              marginBottom: '1rem',
              color: '#155724',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              ✓ 連携済み: {googleEmail}
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
              休暇申請時に自動的にGoogleカレンダーにイベントが作成されます
            </p>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={actionLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              opacity: actionLoading ? 0.6 : 1,
              fontSize: '0.9rem',
            }}
          >
            {actionLoading ? '処理中...' : '連携を解除'}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#6c757d' }}>
            Googleカレンダーと連携すると、有給休暇や特別休暇を申請した際に自動的にカレンダーにイベントが作成されます。
          </p>

          <button
            onClick={handleConnect}
            disabled={actionLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              opacity: actionLoading ? 0.6 : 1,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {actionLoading ? '処理中...' : 'Googleカレンダーと連携'}
          </button>
        </div>
      )}
    </div>
  );
}
