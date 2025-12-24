// 勤怠履歴コンポーネント

import { AttendanceRecord } from '@/types/database';
import { formatDateJapanese, formatTime, parseDateTime } from '@/lib/utils/date';

interface AttendanceHistoryProps {
  records: AttendanceRecord[];
  onEdit?: (record: AttendanceRecord) => void;
  onDelete?: (record: AttendanceRecord) => void;
}

// 休暇タイプの日本語ラベル
const getLeaveTypeLabel = (leaveType: string, halfLeavePeriod?: string): string => {
  switch (leaveType) {
    case 'paid_leave':
      return '有給休暇';
    case 'half_leave':
      if (halfLeavePeriod === 'morning') {
        return '午前半休';
      } else if (halfLeavePeriod === 'afternoon') {
        return '午後半休';
      }
      return '半休';
    case 'compensatory_leave':
      return '代休';
    case 'holiday_work':
      return '休日出勤';
    default:
      return '通常勤務';
  }
};

// 休暇タイプの背景色
const getLeaveTypeColor = (leaveType: string): string => {
  switch (leaveType) {
    case 'paid_leave':
      return '#d4edda';
    case 'half_leave':
      return '#d1ecf1';
    case 'compensatory_leave':
      return '#e2e3e5';
    case 'holiday_work':
      return '#f8d7da';
    default:
      return '#fff';
  }
};

export function AttendanceHistory({ records, onEdit, onDelete }: AttendanceHistoryProps) {
  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
        勤怠記録がありません
      </div>
    );
  }

  return (
    <div>
      {records.map((record) => {
        const isLeave = record.leave_type && record.leave_type !== 'normal';
        
        return (
          <div
            key={record.id}
            style={{
              padding: '1rem',
              marginBottom: '1rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: isLeave ? getLeaveTypeColor(record.leave_type) : '#fff',
            }}
          >
            <div style={{ marginBottom: '0.75rem', fontWeight: 'bold', fontSize: '1.05rem' }}>
              {formatDateJapanese(record.date)}
              {isLeave && (
                <span
                  style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: 'normal',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {getLeaveTypeLabel(record.leave_type, record.half_leave_period)}
                </span>
              )}
            </div>

            {isLeave && record.leave_type !== 'holiday_work' && record.leave_type !== 'half_leave' ? (
              <div style={{ fontSize: '0.9rem', color: '#555', fontStyle: 'italic' }}>
                {getLeaveTypeLabel(record.leave_type, record.half_leave_period)}として記録されています
              </div>
            ) : (
              <div style={{ fontSize: '0.9rem', color: '#555' }}>
                {isLeave && (record.leave_type === 'half_leave' || record.leave_type === 'holiday_work') && (
                  <div style={{ marginBottom: '0.5rem', fontStyle: 'italic', color: '#666' }}>
                    {getLeaveTypeLabel(record.leave_type, record.half_leave_period)}
                  </div>
                )}
                {record.clock_in && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>出勤:</strong> {formatTime(parseDateTime(record.clock_in))}
                  </div>
                )}

                {record.clock_out ? (
                  <>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>退勤:</strong> {formatTime(parseDateTime(record.clock_out))}
                    </div>
                    {record.work_hours !== null && record.work_hours !== undefined && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>労働時間:</strong> {record.work_hours}時間
                      </div>
                    )}
                    {record.overtime !== null && record.overtime !== undefined && (
                      <div>
                        <strong>残業時間:</strong> {record.overtime}時間
                      </div>
                    )}
                  </>
                ) : record.clock_in ? (
                  <div style={{ color: '#dc3545', fontStyle: 'italic' }}>
                    退勤記録なし（記録が不完全です）
                  </div>
                ) : null}
              </div>
            )}

            {(onEdit || onDelete) && (
              <div style={{ marginTop: '0.75rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                {onEdit && (!isLeave || record.leave_type === 'holiday_work' || record.leave_type === 'half_leave') && (
                  <button
                    onClick={() => onEdit(record)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      backgroundColor: '#ffc107',
                      color: '#000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    修正
                  </button>
                )}
                {onDelete && isLeave && (
                  <button
                    onClick={() => {
                      if (confirm('この記録を削除しますか？Googleカレンダーのイベントも削除されます。')) {
                        onDelete(record);
                      }
                    }}
                    style={{
                      padding: '0.4rem 0.8rem',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    削除
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
