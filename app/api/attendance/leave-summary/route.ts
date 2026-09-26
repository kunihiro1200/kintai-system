// 休暇サマリー取得API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 認証チェック
    const staff = await getCurrentStaff();

    // 全ての休暇記録を取得
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('leave_type')
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
          // 代休は必ず休日出勤と相殺されるため、対象日の有無に関わらず休日出勤を1日消化する
          // （過去に対象日を紐づけずに記録された代休も消化済みとして数える）
          holidayWorkConsumedCount += 1;
          break;
        case 'holiday_work':
          holidayWorkCount += 1;
          break;
        case 'new_employee_leave':
          newEmployeeLeaveCount += 1;
          break;
      }
    });

    // 休日出勤は「代休の相殺」と「6ヶ月以内社員休暇の埋め合わせ」の両方で消費される。
    // 6ヶ月以内社員休暇は取得したら休日出勤で埋める必要があるため、休日出勤を1日ずつ消費する。
    const holidayWorkConsumedTotal = holidayWorkConsumedCount + newEmployeeLeaveCount;

    // 休日出勤の残数（未消化）。消化数が休日出勤数を超えないよう下限0でクランプ
    const holidayWorkRemainingCount = Math.max(
      holidayWorkCount - holidayWorkConsumedTotal,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        staff_id: staff.id,
        paid_leave_count: paidLeaveCount,
        compensatory_leave_count: compensatoryLeaveCount,
        holiday_work_count: holidayWorkCount,
        // 代休による消化分
        holiday_work_consumed_count: holidayWorkConsumedCount,
        // 6ヶ月以内社員休暇による消化分
        holiday_work_used_by_new_employee_leave_count: newEmployeeLeaveCount,
        // 未消化（代休・6ヶ月以内社員休暇のどちらにもまだ使われていない）
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
