// Googleカレンダー連携解除エンドポイント

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleCalendarService } from '@/lib/services/GoogleCalendarService';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { createErrorResponse, getErrorStatusCode } from '@/lib/utils/errors';

export async function POST() {
  try {
    // 認証されたスタッフを取得
    const staff = await getCurrentStaff();

    // Supabaseクライアントを作成
    const supabase = await createClient();

    // Google Calendar サービスを初期化
    const calendarService = new GoogleCalendarService();

    // 連携を解除
    await calendarService.disconnectCalendar(supabase, staff.id);

    return NextResponse.json({
      success: true,
      message: 'Googleカレンダーの連携を解除しました',
    });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    return NextResponse.json(createErrorResponse(error), { status: statusCode });
  }
}
