// 月間残業時間取得API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { StaffService } from '@/lib/services/StaffService';
import { OvertimeCalculator } from '@/lib/services/OvertimeCalculator';

/**
 * GET /api/attendance/monthly-overtime
 * 月間残業時間を取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 認証チェック
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const staffIdParam = searchParams.get('staffId');
    const referenceDateParam = searchParams.get('referenceDate');

    // スタッフIDの決定（省略時は認証済みスタッフ）
    const targetStaffId = staffIdParam || currentStaff.id;

    // 基準日の決定（省略時は当日）
    const referenceDate = referenceDateParam 
      ? new Date(referenceDateParam) 
      : new Date();

    // スタッフ情報を取得（祝日対応フラグを含む）
    const staffService = new StaffService(supabase);
    const staff = await staffService.getStaff(targetStaffId);

    // 月間期間を計算（前月16日〜当月15日）
    const calculator = new OvertimeCalculator();
    const { start: periodStart, end: periodEnd } = calculator.getMonthlyPeriod(referenceDate);

    // 期間内の勤怠記録を取得
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('work_hours')
      .eq('staff_id', targetStaffId)
      .gte('date', periodStart.toISOString().split('T')[0])
      .lte('date', periodEnd.toISOString().split('T')[0])
      .not('work_hours', 'is', null);

    if (error) {
      console.error('勤怠記録取得エラー:', error);
      return NextResponse.json(
        { success: false, error: '勤怠記録の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 月間労働時間を計算
    const monthlyWorkHours = records.reduce(
      (sum, record) => sum + (record.work_hours || 0),
      0
    );

    // 祝日対応に基づく残業時間を計算
    const { overtime: monthlyOvertime, threshold } = calculator.calculateMonthlyOvertime(
      monthlyWorkHours,
      staff.is_holiday_staff
    );

    return NextResponse.json({
      success: true,
      data: {
        staffId: targetStaffId,
        isHolidayStaff: staff.is_holiday_staff,
        monthlyWorkHours: Math.round(monthlyWorkHours * 100) / 100,
        overtimeThreshold: threshold,
        monthlyOvertime: monthlyOvertime,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
      },
    });
  } catch (error: any) {
    console.error('月間残業時間取得エラー:', error);
    
    if (error.message === 'スタッフが見つかりません') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: '月間残業時間の取得に失敗しました' },
      { status: 500 }
    );
  }
}
