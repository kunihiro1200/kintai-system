// 全社員の勤怠サマリー取得API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { isAdmin } from '@/lib/utils/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 認証チェック
    const staff = await getCurrentStaff();
    
    // 管理者チェック（データベースベース）
    const adminCheck = await isAdmin(staff.email);
    if (!adminCheck) {
      return NextResponse.json(
        { success: false, error: { message: 'アクセス権限がありません' } },
        { status: 403 }
      );
    }

    // URLパラメータから期間を取得
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 全スタッフを取得
    const { data: staffs, error: staffError } = await supabase
      .from('staffs')
      .select('id, name, email, is_holiday_staff')
      .order('name');

    if (staffError) {
      console.error('スタッフ取得エラー:', staffError);
      return NextResponse.json(
        { success: false, error: { message: 'スタッフの取得に失敗しました' } },
        { status: 500 }
      );
    }

    // 各スタッフの勤怠サマリーを取得
    const summaries = await Promise.all(
      staffs.map(async (staff) => {
        let query = supabase
          .from('attendance_records')
          .select('*')
          .eq('staff_id', staff.id);

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data: records } = await query;

        // 集計
        let totalWorkHours = 0;
        let totalOvertime = 0;
        let paidLeaveCount = 0;
        let compensatoryLeaveCount = 0;
        let holidayWorkCount = 0;
        let newEmployeeLeaveCount = 0;
        let workDays = 0;
        const paidLeaveDates: string[] = [];

        records?.forEach((record) => {
          if (record.work_hours) {
            totalWorkHours += record.work_hours;
            workDays += 1;
          }
          if (record.overtime) {
            totalOvertime += record.overtime;
          }

          switch (record.leave_type) {
            case 'paid_leave':
              paidLeaveCount += 1;
              paidLeaveDates.push(record.date);
              break;
            case 'half_leave':
              paidLeaveCount += 0.5;
              paidLeaveDates.push(record.date);
              break;
            case 'compensatory_leave':
              compensatoryLeaveCount += 1;
              break;
            case 'holiday_work':
              holidayWorkCount += 1;
              break;
            case 'new_employee_leave':
              newEmployeeLeaveCount += 1;
              break;
          }
        });

        return {
          staff_id: staff.id,
          staff_name: staff.name,
          staff_email: staff.email,
          is_holiday_staff: staff.is_holiday_staff,
          work_days: workDays,
          total_work_hours: Math.round(totalWorkHours * 10) / 10,
          total_overtime: Math.round(totalOvertime * 10) / 10,
          paid_leave_count: paidLeaveCount,
          paid_leave_dates: paidLeaveDates,
          compensatory_leave_count: compensatoryLeaveCount,
          holiday_work_count: holidayWorkCount,
          new_employee_leave_count: newEmployeeLeaveCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        summaries,
        period: {
          start_date: startDate,
          end_date: endDate,
        },
      },
    });
  } catch (error) {
    console.error('全社員サマリー取得エラー:', error);
    return NextResponse.json(
      { success: false, error: { message: '全社員サマリーの取得に失敗しました' } },
      { status: 500 }
    );
  }
}
