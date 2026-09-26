// 休暇サマリー取得API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 認証チェック
    const staff = await getCurrentStaff();

    // 全ての休暇記録を取得（代休の相殺集計のため compensatory_leave_date も取得）
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('leave_type, compensatory_leave_date')
      .eq('staff_id', staff.id)
      .neq('leave_type', 'normal');

    if (error) {
      console.error('休暇サマリー取得エラー:', error);
      return NextResponse.json(
        { success: false, error: { message: '休暇サマリーの取得に失敗しました' } },
        { status: 500 }
      );
    }

    // カウントを集計
    let paidLeaveCount = 0;
    let compensatoryLeaveCount = 0;
    let holidayWorkCount = 0;
    let newEmployeeLeaveCount = 0;
    // 代休で相殺（消化）された休日出勤の件数
    let holidayWorkConsumedCount = 0;

    records?.forEach((record) => {
      switch (record.leave_type) {
        case 'paid_leave':
          paidLeaveCount += 1;
          break;
        case 'half_leave':
          paidLeaveCount += 0.5;
          break;
        case 'compensatory_leave':
          compensatoryLeaveCount += 1;
          // 対象の休日出勤日が紐づいている代休は「消化済み」としてカウント
          if (record.compensatory_leave_date) {
            holidayWorkConsumedCount += 1;
          }
          break;
        case 'holiday_work':
          holidayWorkCount += 1;
          break;
        case 'new_employee_leave':
          newEmployeeLeaveCount += 1;
          break;
      }
    });

    // 休日出勤の残数（未消化）。消化数が休日出勤数を超えないよう下限0でクランプ
    const holidayWorkRemainingCount = Math.max(
      holidayWorkCount - holidayWorkConsumedCount,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        staff_id: staff.id,
        paid_leave_count: paidLeaveCount,
        compensatory_leave_count: compensatoryLeaveCount,
        holiday_work_count: holidayWorkCount,
        holiday_work_consumed_count: holidayWorkConsumedCount,
        holiday_work_remaining_count: holidayWorkRemainingCount,
        new_employee_leave_count: newEmployeeLeaveCount,
      },
    });
  } catch (error) {
    console.error('休暇サマリー取得エラー:', error);
    return NextResponse.json(
      { success: false, error: { message: '休暇サマリーの取得に失敗しました' } },
      { status: 500 }
    );
  }
}
