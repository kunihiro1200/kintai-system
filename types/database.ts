// データベース型定義

export type LeaveType = 
  | 'normal'              // 通常勤務
  | 'paid_leave'          // 有給休暇
  | 'special_leave'       // 特別休暇
  | 'half_leave'          // 半休
  | 'compensatory_leave'  // 代休
  | 'holiday_work'        // 休日出勤
  | 'new_employee_leave'; // 6ヶ月以内社員休暇

export type HalfLeavePeriod = 
  | 'morning'    // 午前半休
  | 'afternoon'; // 午後半休

export interface Staff {
  id: string;
  email: string;
  name: string;
  is_system_admin: boolean;
  is_holiday_staff: boolean; // 祝日対応スタッフフラグ
  google_calendar_email?: string;
  google_access_token?: string;
  google_refresh_token?: string;
  google_token_expiry?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  date: string; // YYYY-MM-DD
  clock_in?: string; // ISO 8601 (休暇の場合はnull)
  clock_out?: string; // ISO 8601
  work_hours?: number;
  overtime?: number;
  leave_type: LeaveType;
  half_leave_period?: HalfLeavePeriod; // 半休の時間帯
  created_at: Date;
  updated_at: Date;
}

export interface LeaveSummary {
  paid_leave_count: number;      // 有給休暇日数
  compensatory_leave_count: number; // 代休日数
  holiday_work_count: number;    // 休日出勤日数
  new_employee_leave_count: number; // 6ヶ月以内社員休暇日数
}

export interface AttendanceStatus {
  status: 'not_clocked_in' | 'clocked_in' | 'clocked_out' | 'on_leave';
  record?: AttendanceRecord;
  leaveSummary?: LeaveSummary;
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ClockInResponse {
  id: string;
  staff_id: string;
  date: string;
  clock_in: string;
}

export interface ClockOutResponse {
  id: string;
  staff_id: string;
  date: string;
  clock_in: string;
  clock_out: string;
  work_hours: number;
  overtime: number;
}

export interface CurrentStatusResponse {
  status: 'not_clocked_in' | 'clocked_in' | 'clocked_out';
  record?: {
    date: string;
    clock_in?: string;
    clock_out?: string;
  };
}

export interface HistoryResponse {
  records: AttendanceRecord[];
  total: number;
  page: number;
}

export interface EmailHistory {
  id: string;
  sent_by_staff_id: string;
  recipient_email: string;
  subject: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  sent_at: Date;
  created_at: Date;
}
