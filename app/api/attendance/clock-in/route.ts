import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AttendanceService } from '@/lib/services/AttendanceService';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { createErrorResponse, getErrorStatusCode } from '@/lib/utils/errors';

export async function POST() {
  try {
    // 認証情報の取得とスタッフIDの特定
    const staff = await getCurrentStaff();
    
    // Supabaseクライアントの作成
    const supabase = await createClient();
    const attendanceService = new AttendanceService(supabase);

    // 出勤記録の作成
    const record = await attendanceService.createClockIn(staff.id);

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        staff_id: record.staff_id,
        date: record.date,
        clock_in: record.clock_in,
      },
    });
  } catch (error) {
    console.error('出勤API エラー:', error);
    const statusCode = getErrorStatusCode(error);
    return NextResponse.json(createErrorResponse(error), { status: statusCode });
  }
}
