// 全社員の勤怠サマリー取得API

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { isAdmin } from '@/lib/utils/admin';

export async function GET(request: NextRequest) {
  try {
    // データ取得用のサービスロールクライアント（RLSをバイパス）
    const supabase = createServiceRoleClient();
    
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

    // 除外するメールアドレスのリスト
    const EXCLUDED_EMAILS = [
      'tenant@ifoo-oita.com',
      'oitaifoo@gmail.com',
      'tomoko.kunihiro@ifoo-oita.com',
      'naomi.hirose@ifoo-oita.com',
    ];

    // アクティブなスタッフのみを取得
    const { data: staffs, error: staffError } = await supabase
      .from('staffs')
      .select('id, name, email, is_holiday_staff, is_active')
      .eq('is_active', true)
      .order('name');

    if (staffError) {
      console.error('スタッフ取得エラー:', staffError);
      return NextResponse.json(
        { success: false, error: { message: 'スタッフの取得に失敗しました' } },
        { status: 500 }
      );
    }

    // 除外リストに含まれるスタッフをフィルタリング
    const filteredStaffs = staffs.filter(s => !EXCLUDED_EMAILS.includes(s.email));

    console.log('全社員サマリー - 取得したスタッフ数:', filteredStaffs.length);
    console.log('全社員サマリー - スタッフ詳細:', filteredStaffs.map(s => ({ 
      name: s.name, 
      email: s.email, 
      is_active: s.is_active 
    })));
    
    // 角井さんを探す（複数の条件で検索）
    const kakuiStaff = filteredStaffs.find(s => 
      s.name.includes('角井') || 
      s.email.includes('kakui') ||
      s.email === 'hiromitsu-kakui@ifoo-oita.com'
    );
    if (kakuiStaff) {
      console.log('=== 角井さんを発見 ===');
      console.log('名前:', kakuiStaff.name);
      console.log('メール:', kakuiStaff.email);
      console.log('ID:', kakuiStaff.id);
      console.log('is_active:', kakuiStaff.is_active);
    } else {
      console.log('⚠️ 角井さんが見つかりません');
      console.log('全スタッフのメールアドレス:', filteredStaffs.map(s => s.email));
    }
    
    // 非アクティブなスタッフが含まれていないか確認
    const inactiveStaffs = filteredStaffs.filter(s => !s.is_active);
    if (inactiveStaffs.length > 0) {
      console.warn('⚠️ 非アクティブなスタッフが含まれています:', inactiveStaffs);
    }

    // 各スタッフの勤怠サマリーを取得
    const summaries = await Promise.all(
      filteredStaffs.map(async (staff) => {
        let query = supabase
          .from('attendance_records')
          .select('*')
          .eq('staff_id', staff.id);

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data: records } = await query;

        // 角井さんのデータをデバッグ
        const isKakui = staff.name.includes('角井') || 
                       staff.email.includes('kakui') || 
                       staff.email === 'hiromitsu-kakui@ifoo-oita.com';
        
        if (isKakui) {
          console.log('=== 角井さんのデータ ===');
          console.log('名前:', staff.name);
          console.log('メール:', staff.email);
          console.log('スタッフID:', staff.id);
          console.log('期間:', startDate, '~', endDate);
          console.log('取得したレコード数:', records?.length || 0);
          console.log('レコード詳細:', JSON.stringify(records, null, 2));
        }

        // 集計
        let totalWorkHours = 0;
        let totalOvertimeBeforeThreshold = 0; // 閾値適用前の総残業時間
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
          // 各日の残業時間を合計
          if (record.overtime) {
            totalOvertimeBeforeThreshold += record.overtime;
          }

          switch (record.leave_type) {
            case 'paid_leave':
              paidLeaveCount += 1;
              paidLeaveDates.push(record.date);
              // 角井さんのデバッグ
              if (isKakui) {
                console.log('有給休暇を検出:', record.date, record.leave_type);
              }
              break;
            case 'half_leave':
              paidLeaveCount += 0.5;
              paidLeaveDates.push(record.date);
              // 角井さんのデバッグ
              if (isKakui) {
                console.log('半休を検出:', record.date, record.leave_type);
              }
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

        // 祝日対応スタッフかどうかで残業時間の閾値を変更
        // 月の総残業時間から閾値を引く
        // 祝日対応: 月10時間超過で残業としてカウント
        // 通常: 月7時間超過で残業としてカウント
        const overtimeThreshold = staff.is_holiday_staff ? 10 : 7;
        const totalOvertime = Math.max(0, totalOvertimeBeforeThreshold - overtimeThreshold);

        // 角井さんの集計結果をデバッグ
        if (isKakui) {
          console.log('=== 角井さんの集計結果 ===');
          console.log('有給休暇日数:', paidLeaveCount);
          console.log('有給休暇日付:', paidLeaveDates);
          console.log('総労働時間:', totalWorkHours);
          console.log('閾値適用前の総残業時間:', totalOvertimeBeforeThreshold);
          console.log('残業閾値:', overtimeThreshold);
          console.log('表示する残業時間:', totalOvertime);
        }

        return {
          staff_id: staff.id,
          staff_name: staff.name,
          staff_email: staff.email,
          is_holiday_staff: staff.is_holiday_staff,
          work_days: workDays,
          total_overtime: Math.round(totalOvertimeBeforeThreshold * 10) / 10, // 閾値適用前の総残業時間
          confirmed_overtime: Math.round(totalOvertime * 10) / 10, // 確定残業時間（閾値適用後）
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
