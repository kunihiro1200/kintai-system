import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AttendanceService } from '@/lib/services/AttendanceService';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { createErrorResponse, getErrorStatusCode } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    // 認証情報の取得とスタッフIDの特定
    const staff = await getCurrentStaff();
    
    // クエリパラメータの取得
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // ページネーションの計算
    const offset = (page - 1) * limit;

    // Supabaseクライアントの作成
    const supabase = await createClient();
    const attendanceService = new AttendanceService(supabase);

    // 勤怠履歴を取得
    const { records, total } = await attendanceService.getHistory(staff.id, {
      startDate,
      endDate,
      limit,
      offset,
    });

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      data: {
        records,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    return NextResponse.json(createErrorResponse(error), { status: statusCode });
  }
}
