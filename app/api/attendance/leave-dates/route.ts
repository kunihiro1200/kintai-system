// 特定の休暇タイプの日付一覧を取得するAPI

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 認証チェック（管理者のみ）
    const staff = await getCurrentStaff();
    const adminEmails = [
      'tomoko.kunihiro@ifoo-oita.com',
      'yurine.kimura@ifoo-oita.com',
      'mariko.kume@ifoo-oita.com',
    ];
    if (!adminEmails.includes(staff.email)) {
      return NextResponse.json(
        { success: false, error: { message: 'アクセス権限がありません' } },
        { status: 403 }
      );
    }

    // クエリパラメータから取得
    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get('staffId');
    const leaveType = searchParams.get('leaveType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!staffId || !leaveType) {
      return NextResponse.json(
        { success: false, error: { message: 'staffIdとleaveTypeは必須です' } },
        { status: 400 }
      );
    }

    // 日付一覧を取得
    let query = supabase
      .from('attendance_records')
      .select('date, half_leave_period, leave_type')
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
