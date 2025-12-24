// 休暇記録モーダルコンポーネント

import { useState } from 'react';
import { LeaveType, HalfLeavePeriod } from '@/types/database';

interface LeaveModalProps {
  leaveType: LeaveType;
  leaveLabel: string;
  onClose: () => void;
  onSave: (date: string, halfLeavePeriod?: HalfLeavePeriod) => void;
}

export function LeaveModal({
  leaveType,
  leaveLabel,
  onClose,
  onSave,
}: LeaveModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [halfLeavePeriod, setHalfLeavePeriod] = useState<HalfLeavePeriod>('morning');

  const handleSave = () => {
    if (leaveType === 'half_leave') {
      onSave(date, halfLeavePeriod);
    } else {
      onSave(date);
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
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>
          {leaveLabel}を記録
        </h2>

        {/* 特別休暇の場合は忌引ガイドを表示 */}
        {leaveType === 'special_leave' && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#495057' }}>
              【忌引に関して】
            </div>
            <div style={{ color: '#6c757d', lineHeight: '1.6' }}>
              <div>• 配偶者、子ども：4日</div>
              <div>• 親族（誰でもOK、本人喪主）：4日</div>
              <div>• 両親：3日</div>
              <div>• ひいおじいさん（ひいおばあさん）、祖父母、兄弟姉妹：2日</div>
              <div>• 配偶者両親：2日</div>
            </div>
          </div>
        )}

        {/* 6ヶ月以内社員休暇の場合は注意事項を表示 */}
        {leaveType === 'new_employee_leave' && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#856404' }}>
              【重要】
            </div>
            <div style={{ color: '#856404', lineHeight: '1.6' }}>
              <div>• 欠勤扱いにはなりません</div>
              <div>• 必ず2週間以内に休日出勤（水曜以外）を行ってください</div>
            </div>
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
            日付
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        {leaveType === 'half_leave' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
              }}
            >
              時間帯
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="morning"
                  checked={halfLeavePeriod === 'morning'}
                  onChange={(e) => setHalfLeavePeriod(e.target.value as HalfLeavePeriod)}
                  style={{ marginRight: '0.5rem' }}
                />
                午前半休
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="afternoon"
                  checked={halfLeavePeriod === 'afternoon'}
                  onChange={(e) => setHalfLeavePeriod(e.target.value as HalfLeavePeriod)}
                  style={{ marginRight: '0.5rem' }}
                />
                午後半休
              </label>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
