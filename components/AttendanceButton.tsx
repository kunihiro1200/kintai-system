// 出退勤ボタンコンポーネント

interface AttendanceButtonProps {
  status: 'not_clocked_in' | 'clocked_in' | 'clocked_out' | 'on_leave';
  onClockIn: () => void;
  onClockOut: () => void;
  loading: boolean;
}

export function AttendanceButton({
  status,
  onClockIn,
  onClockOut,
  loading,
}: AttendanceButtonProps) {
  const getButtonText = () => {
    if (loading) return '処理中...';
    
    switch (status) {
      case 'not_clocked_in':
        return '出勤';
      case 'clocked_in':
        return '退勤';
      case 'clocked_out':
        return '本日は退勤済みです';
      case 'on_leave':
        return '本日は休暇です';
    }
  };

  const getButtonColor = () => {
    switch (status) {
      case 'not_clocked_in':
        return '#28a745';
      case 'clocked_in':
        return '#dc3545';
      case 'clocked_out':
        return '#6c757d';
      case 'on_leave':
        return '#17a2b8';
    }
  };

  const handleClick = () => {
    if (status === 'not_clocked_in') {
      onClockIn();
    } else if (status === 'clocked_in') {
      onClockOut();
    }
  };

  const isDisabled = status === 'clocked_out' || status === 'on_leave' || loading;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      style={{
        width: '100%',
        padding: '1rem',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: getButtonColor(),
        border: 'none',
        borderRadius: '8px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {getButtonText()}
    </button>
  );
}
