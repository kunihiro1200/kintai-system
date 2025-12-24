// Googleカレンダー連携状態確認エンドポイント

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleCalendarService } from '@/lib/services/GoogleCalendarService';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { createErrorResponse, getErrorStatusCode } from '@/lib/utils/errors';

export async function GET() {
  try {
    // 認証されたスタッフを取得
    const staff = await getCurrentStaff();

    // Supabaseクライアントを作成
    const supabase = await createClient();

    // Google Calendar サービスを初期化
    const calendarService = new GoogleCalendarService();

    // 連携状態を確認
    const isConnected = await calendarService.isCalendarConnected(supabase, staff.id);

    // 連携されている場合、Googleメールアドレスも取得
    let googleEmail = null;
    if (isConnected) {
      const { data } = await supabase
        .from('staffs')
        .select('google_calendar_email')
        .eq('id', staff.id)
        .single();
      
      googleEmail = data?.google_calendar_email;
    }

    return NextResponse.json({
      success: true,
      data: {
        isConnected,
        googleEmail,
      },
    });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    return NextResponse.json(createErrorResponse(error), { status: statusCode });
  }
}
