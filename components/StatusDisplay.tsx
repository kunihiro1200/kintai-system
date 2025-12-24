// ステータス表示コンポーネント

import { formatDateTimeJapanese } from '@/lib/utils/date';
import { LeaveType } from '@/types/database';

interface StatusDisplayProps {
  status: 'not_clocked_in' | 'clocked_in' | 'clocked_out' | 'on_leave';
  record?: {
    date: string;
    clock_in?: string;
    clock_out?: string;
    work_hours?: number;
    overtime?: number;
    leave_type?: LeaveType;
  };
}

export function StatusDisplay({ status, record }: StatusDisplayProps) {
  const getLeaveTypeLabel = (leaveType?: LeaveType): string => {
    if (!leaveType) return '';
    switch (leaveType) {
      case 'paid_leave':
        return '有給休暇';
      case 'half_leave':
        return '半休';
      case 'compensatory_leave':
        return '代休';
      case 'holiday_work':
        return '休日出勤';
      default:
        return '';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'not_clocked_in':
        // 半休・休日出勤の記録がある場合は特別な表示
        if (record?.leave_type === 'half_leave' || record?.leave_type === 'holiday_work') {
          return `${getLeaveTypeLabel(record.leave_type)}（出勤前）`;
        }
        return '本日の記録はありません';
      case 'clocked_in':
        // 半休・休日出勤の場合は表示を追加
        if (record?.leave_type === 'half_leave' || record?.leave_type === 'holiday_work') {
          return `${getLeaveTypeLabel(record.leave_type)}（出勤中）`;
        }
        return '出勤中';
      case 'clocked_out':
        // 半休・休日出勤の場合は表示を追加
        if (record?.leave_type === 'half_leave' || record?.leave_type === 'holiday_work') {
          return `${getLeaveTypeLabel(record.leave_type)}（退勤済み）`;
        }
        return '退勤済み';
      case 'on_leave':
        return record?.leave_type ? getLeaveTypeLabel(record.leave_type) : '休暇中';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'not_clocked_in':
        return '#999';
      case 'clocked_in':
        return '#28a745';
      case 'clocked_out':
        return '#6c757d';
      case 'on_leave':
        return '#17a2b8';
    }
  };

  return (
    <div
      style={{
        padding: '1.5rem',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <span
          style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: getStatusColor(),
          }}
        >
          {getStatusText()}
        </span>
      </div>

      {record && (
        <div style={{ fontSize: '0.95rem', color: '#555' }}>
          {record.clock_in && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>出勤時刻:</strong> {formatDateTimeJapanese(record.clock_in)}
            </div>
          )}
          {record.clock_out && (
            <>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>退勤時刻:</strong> {formatDateTimeJapanese(record.clock_out)}
              </div>
              {record.work_hours !== undefined && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>労働時間:</strong> {record.work_hours}時間
                </div>
              )}
              {record.overtime !== undefined && (
                <div>
                  <strong>残業時間:</strong> {record.overtime}時間
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
