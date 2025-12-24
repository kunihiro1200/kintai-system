import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AttendanceService } from '@/lib/services/AttendanceService';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { createErrorResponse, getErrorStatusCode } from '@/lib/utils/errors';

export async function PUT(request: NextRequest) {
  try {
    // 認証情報の取得とスタッフIDの特定
    const staff = await getCurrentStaff();
    
    // リクエストボディの取得
    const body = await request.json();
    const { recordId, clockIn, clockOut } = body;

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: { message: '記録IDが必要です' } },
        { status: 400 }
      );
    }

    // Supabaseクライアントの作成
    const supabase = await createClient();
    const attendanceService = new AttendanceService(supabase);

    // 記録の取得と権限確認
    const { data: record, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (fetchError || !record) {
      return NextResponse.json(
        { success: false, error: { message: '記録が見つかりません' } },
        { status: 404 }
      );
    }

    // 自分の記録かチェック
    if (record.staff_id !== staff.id) {
      return NextResponse.json(
        { success: false, error: { message: '他のスタッフの記録は修正できません' } },
        { status: 403 }
      );
    }

    // 更新データの準備
    const updateData: any = {};
    
    if (clockIn) {
      updateData.clock_in = clockIn;
    }
    
    if (clockOut) {
      updateData.clock_out = clockOut;
    }

    // 両方の時刻がある場合、労働時間と残業時間を再計算
    if ((clockIn || record.clock_in) && (clockOut || record.clock_out)) {
      const clockInDate = new Date(clockIn || record.clock_in);
      const clockOutDate = new Date(clockOut || record.clock_out);
      
      const overtimeCalculator = attendanceService['overtimeCalculator'];
      const { workHours, overtime } = overtimeCalculator.calculate(clockInDate, clockOutDate);
      
      updateData.work_hours = workHours;
      updateData.overtime = overtime;
    }

    // 記録を更新
    const { data: updatedRecord, error: updateError } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (updateError) {
      throw new Error('記録の更新に失敗しました');
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      data: updatedRecord,
    });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    return NextResponse.json(createErrorResponse(error), { status: statusCode });
  }
}
