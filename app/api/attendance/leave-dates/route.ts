// 特定の休暇タイプの日付一覧を取得するAPI

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

    // クエリパラメータから取得
    const searchParams = request.nextUrl.searchParams;
    const requestedStaffId = searchParams.get('staffId');
    const leaveType = searchParams.get('leaveType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!leaveType) {
      return NextResponse.json(
        { success: false, error: { message: 'leaveTypeは必須です' } },
        { status: 400 }
      );
    }

    // 対象スタッフを決定する。
    // staffId が未指定、または本人の staffId の場合は本人のデータを閲覧できる。
    // 本人以外の staffId を指定する場合のみ管理者権限が必要。
    let staffId = requestedStaffId ?? staff.id;

    if (requestedStaffId && requestedStaffId !== staff.id) {
      const adminCheck = await isAdmin(staff.email);
      if (!adminCheck) {
        return NextResponse.json(
          { success: false, error: { message: 'アクセス権限がありません' } },
          { status: 403 }
        );
      }
      staffId = requestedStaffId;
    }

    // 日付一覧を取得
    let query = supabase
      .from('attendance_records')
      .select('date, half_leave_period, leave_type, compensatory_leave_date')
      .eq('staff_id', staffId)
      .order('date', { ascending: false });

    // 有給休暇の場合は、paid_leaveとhalf_leaveの両方を取得
    if (leaveType === 'paid_leave') {
      query = query.in('leave_type', ['paid_leave', 'half_leave']);
    } else {
      query = query.eq('leave_type', leaveType);
    }

    // 期間フィルター
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('日付一覧取得エラー:', error);
      return NextResponse.json(
        { success: false, error: { message: '日付一覧の取得に失敗しました' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { dates: data },
    });
  } catch (error) {
    console.error('日付一覧取得エラー:', error);
    return NextResponse.json(
      { success: false, error: { message: '日付一覧の取得に失敗しました' } },
      { status: 500 }
    );
  }
}
