// 休暇記録モーダルコンポーネント

import { useState, useEffect } from 'react';
import { LeaveType, HalfLeavePeriod } from '@/types/database';
import { formatDateJapanese } from '@/lib/utils/date';

interface LeaveModalProps {
  leaveType: LeaveType;
  leaveLabel: string;
  onClose: () => void;
  onSave: (
    date: string,
    halfLeavePeriod?: HalfLeavePeriod,
    compensatoryLeaveDate?: string,
    overrideLeaveType?: LeaveType
  ) => void;
}

// 有給休暇の取得区分（1日 / 午前半休 / 午後半休）
type PaidLeaveMode = 'full' | 'morning' | 'afternoon';

export function LeaveModal({
  leaveType,
  leaveLabel,
  onClose,
  onSave,
}: LeaveModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [halfLeavePeriod, setHalfLeavePeriod] = useState<HalfLeavePeriod>('morning');
  const [compensatoryLeaveDate, setCompensatoryLeaveDate] = useState('');
  const [paidLeaveMode, setPaidLeaveMode] = useState<PaidLeaveMode>('full');
  // 代休で選択できる未消化の休日出勤日
  const [availableHolidayWorkDates, setAvailableHolidayWorkDates] = useState<string[]>([]);
  const [loadingHolidayWork, setLoadingHolidayWork] = useState(false);

  // 代休の場合は、相殺できる未消化の休日出勤日を取得する
  useEffect(() => {
    if (leaveType !== 'compensatory_leave') return;

    const fetchAvailable = async () => {
      setLoadingHolidayWork(true);
      try {
        const response = await fetch('/api/attendance/available-holiday-work');
        const data = await response.json();
        if (data.success) {
          setAvailableHolidayWorkDates(data.data.dates ?? []);
        } else {
          setAvailableHolidayWorkDates([]);
        }
      } catch {
        setAvailableHolidayWorkDates([]);
      } finally {
        setLoadingHolidayWork(false);
      }
    };

    fetchAvailable();
  }, [leaveType]);

  const handleSave = () => {
    if (leaveType === 'half_leave') {
      onSave(date, halfLeavePeriod);
    } else if (leaveType === 'compensatory_leave') {
      // 代休は必ず休日出勤と相殺するため、対象日の選択を必須にする
      if (!compensatoryLeaveDate) {
        alert('代休は対象の休日出勤日を選択してください。');
        return;
      }
      onSave(date, undefined, compensatoryLeaveDate);
    } else if (leaveType === 'paid_leave') {
      // 有給休暇: 半休を選んだ場合は half_leave として記録する
      if (paidLeaveMode === 'full') {
        onSave(date);
      } else {
        onSave(date, paidLeaveMode, undefined, 'half_leave');
      }
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

        {leaveType === 'paid_leave' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
              }}
            >
              取得区分
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="full"
                  checked={paidLeaveMode === 'full'}
                  onChange={(e) => setPaidLeaveMode(e.target.value as PaidLeaveMode)}
                  style={{ marginRight: '0.5rem' }}
                />
                1日
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="morning"
                  checked={paidLeaveMode === 'morning'}
                  onChange={(e) => setPaidLeaveMode(e.target.value as PaidLeaveMode)}
                  style={{ marginRight: '0.5rem' }}
                />
                午前半休
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="afternoon"
                  checked={paidLeaveMode === 'afternoon'}
                  onChange={(e) => setPaidLeaveMode(e.target.value as PaidLeaveMode)}
                  style={{ marginRight: '0.5rem' }}
                />
                午後半休
              </label>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
              半休を選ぶと0.5日分の有給として記録されます。
            </div>
          </div>
        )}

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

        {leaveType === 'compensatory_leave' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
              }}
            >
              対象の休日出勤日（いつの代休か）<span style={{ color: '#dc3545' }}>*</span>
            </label>
            {loadingHolidayWork ? (
              <div style={{ fontSize: '0.9rem', color: '#888', padding: '0.5rem 0' }}>
                読み込み中...
              </div>
            ) : availableHolidayWorkDates.length === 0 ? (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: '4px',
                  color: '#721c24',
                  fontSize: '0.85rem',
                }}
              >
                相殺できる未消化の休日出勤がありません。代休は休日出勤と1対1で相殺するため、先に休日出勤を記録してください。
              </div>
            ) : (
              <>
                <select
                  value={compensatoryLeaveDate}
                  onChange={(e) => setCompensatoryLeaveDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    backgroundColor: '#fff',
                  }}
                >
                  <option value="">選択してください</option>
                  {availableHolidayWorkDates.map((d, index) => (
                    <option key={`${d}-${index}`} value={d}>
                      {formatDateJapanese(d)}の休日出勤
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
                  代休は休日出勤と必ず1対1で相殺されます。相殺できる休日出勤: {availableHolidayWorkDates.length}日分
                </div>
              </>
            )}
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
          {(() => {
            // 代休は未消化の休日出勤が無い場合、保存できない
            const disableSave =
              leaveType === 'compensatory_leave' &&
              (loadingHolidayWork || availableHolidayWorkDates.length === 0);
            return (
              <button
                onClick={handleSave}
                disabled={disableSave}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: disableSave ? '#adb5bd' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: disableSave ? 'not-allowed' : 'pointer',
                }}
              >
                保存
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
