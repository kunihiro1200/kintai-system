// 勤怠記録サービス

import { SupabaseClient } from '@supabase/supabase-js';
import { AttendanceRecord } from '@/types/database';
import { OvertimeCalculator } from './OvertimeCalculator';
import { DuplicateError, ValidationError, NotFoundError, DatabaseError } from '@/lib/utils/errors';
import { formatDate, getCurrentDateTime, parseDateTime } from '@/lib/utils/date';

export class AttendanceService {
  private overtimeCalculator: OvertimeCalculator;

  constructor(private supabase: SupabaseClient) {
    this.overtimeCalculator = new OvertimeCalculator();
  }

  /**
   * 出勤記録を作成
   */
  async createClockIn(staffId: string): Promise<AttendanceRecord> {
    const now = new Date();
    const today = formatDate(now);
    const clockInTime = getCurrentDateTime();

    // 既存の記録をチェック
    const existingRecord = await this.getTodayRecord(staffId);

    // 既に出勤記録がある場合はエラー
    if (existingRecord && existingRecord.clock_in) {
      throw new DuplicateError('本日は既に出勤済みです');
    }

    // 半休または休日出勤の記録がある場合は更新
    if (existingRecord && 
        (existingRecord.leave_type === 'half_leave' || existingRecord.leave_type === 'holiday_work')) {
      console.log('半休/休日出勤の記録を更新します:', existingRecord);
      const { data, error } = await this.supabase
        .from('attendance_records')
        .update({
          clock_in: clockInTime,
        })
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (error) {
        console.error('出勤記録の更新エラー:', error);
        throw new DatabaseError(`出勤記録の更新に失敗しました: ${error.message}`);
      }

      return data as AttendanceRecord;
    }

    // 新規作成
    const { data, error } = await this.supabase
      .from('attendance_records')
      .insert({
        staff_id: staffId,
        date: today,
        clock_in: clockInTime,
      })
      .select()
      .single();

    if (error) {
      // 一意制約違反
      if (error.code === '23505') {
        throw new DuplicateError('本日は既に出勤済みです');
      }
      throw new DatabaseError('出勤記録の作成に失敗しました');
    }

    return data as AttendanceRecord;
  }

  /**
   * 退勤記録を更新
   */
  async updateClockOut(staffId: string): Promise<AttendanceRecord> {
    const today = formatDate(new Date());
    const clockOutTime = getCurrentDateTime();

    // 当日の出勤記録を取得
    const todayRecord = await this.getTodayRecord(staffId);

    if (!todayRecord) {
      throw new NotFoundError('本日の出勤記録が見つかりません。先に出勤してください。');
    }

    if (!todayRecord.clock_in) {
      throw new ValidationError('出勤時刻が記録されていません');
    }

    if (todayRecord.clock_out) {
      throw new DuplicateError('本日は既に退勤済みです');
    }

    // 労働時間と残業時間を計算
    const clockIn = parseDateTime(todayRecord.clock_in);
    const clockOut = parseDateTime(clockOutTime);
    
    let workHours: number;
    let overtime: number;

    // 半休の場合は特別な計算ルールを適用
    if (todayRecord.leave_type === 'half_leave' && todayRecord.half_leave_period) {
      const result = this.overtimeCalculator.calculateHalfLeave(
        clockIn,
        clockOut,
        todayRecord.half_leave_period as 'morning' | 'afternoon'
      );
      workHours = result.workHours;
      overtime = result.overtime;
    } else {
      // 通常の計算（休日出勤も含む）
      const result = this.overtimeCalculator.calculate(clockIn, clockOut);
      workHours = result.workHours;
      overtime = result.overtime;
    }

    const { data, error } = await this.supabase
      .from('attendance_records')
      .update({
        clock_out: clockOutTime,
        work_hours: workHours,
        overtime: overtime,
      })
      .eq('id', todayRecord.id)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('退勤記録の更新に失敗しました');
    }

    return data as AttendanceRecord;
  }

  /**
   * 当日の記録を取得
   */
  async getTodayRecord(staffId: string): Promise<AttendanceRecord | null> {
    const today = formatDate(new Date());

    const { data, error } = await this.supabase
      .from('attendance_records')
      .select('*')
      .eq('staff_id', staffId)
      .eq('date', today)
      .single();

    if (error) {
      // レコードが見つからない場合はnullを返す
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError('勤怠記録の取得に失敗しました');
    }

    return data as AttendanceRecord;
  }

  /**
   * 勤怠履歴を取得
   */
  async getHistory(
    staffId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ records: AttendanceRecord[]; total: number }> {
    let query = this.supabase
      .from('attendance_records')
      .select('*', { count: 'exact' })
      .eq('staff_id', staffId);

    // 日付範囲フィルター
    if (options?.startDate) {
      query = query.gte('date', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('date', options.endDate);
    }

    // 日付降順でソート
    query = query.order('date', { ascending: false });

    // ページネーション
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new DatabaseError('勤怠履歴の取得に失敗しました');
    }

    return {
      records: data as AttendanceRecord[],
      total: count || 0,
    };
  }

  /**
   * 重複チェック
   */
  async checkDuplicateClockIn(staffId: string, date: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('attendance_records')
      .select('id')
      .eq('staff_id', staffId)
      .eq('date', date)
      .single();

    if (error) {
      // レコードが見つからない場合は重複なし
      if (error.code === 'PGRST116') {
        return false;
      }
      throw new DatabaseError('重複チェックに失敗しました');
    }

    return !!data;
  }
}
