import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AttendanceService } from '@/lib/services/AttendanceService';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { createErrorResponse, getErrorStatusCode } from '@/lib/utils/errors';

export async function GET() {
  try {
    // 認証情報の取得とスタッフIDの特定
    const staff = await getCurrentStaff();
    
    // Supabaseクライアントの作成
    const supabase = await createClient();
    const attendanceService = new AttendanceService(supabase);

    // 当日の記録を取得
    const todayRecord = await attendanceService.getTodayRecord(staff.id);

    // ステータスの判定
    let status: 'not_clocked_in' | 'clocked_in' | 'clocked_out' | 'on_leave';
    
    if (!todayRecord) {
      // 本日の記録がない = 未出勤
      status = 'not_clocked_in';
    } else if (todayRecord.leave_type && 
               todayRecord.leave_type !== 'normal' && 
               todayRecord.leave_type !== 'half_leave' && 
               todayRecord.leave_type !== 'holiday_work') {
      // 休暇記録がある（半休・休日出勤以外）= 休暇中
      status = 'on_leave';
    } else if (todayRecord.clock_out) {
      // 退勤時刻がある = 退勤済み
      status = 'clocked_out';
    } else if (todayRecord.clock_in) {
      // 出勤時刻のみある = 出勤中
      status = 'clocked_in';
    } else if (todayRecord.leave_type === 'half_leave' || todayRecord.leave_type === 'holiday_work') {
      // 半休・休日出勤の記録はあるが出勤していない = 未出勤（出勤ボタンを表示）
      status = 'not_clocked_in';
    } else {
      // その他の場合は未出勤
      status = 'not_clocked_in';
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      data: {
        status,
        record: todayRecord
          ? {
              date: todayRecord.date,
              clock_in: todayRecord.clock_in,
              clock_out: todayRecord.clock_out || undefined,
              work_hours: todayRecord.work_hours || undefined,
              overtime: todayRecord.overtime || undefined,
              leave_type: todayRecord.leave_type || undefined,
            }
          : undefined,
      },
    });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    return NextResponse.json(createErrorResponse(error), { status: statusCode });
  }
}
