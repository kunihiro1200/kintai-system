// システム管理者ステータス取得API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StaffService } from '@/lib/services/StaffService';
import { GoogleCalendarService } from '@/lib/services/GoogleCalendarService';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: '認証が必要です',
        },
        { status: 401 }
      );
    }

    // StaffServiceのインスタンスを作成
    const staffService = new StaffService(supabase);

    // システム管理者のステータスを取得
    const systemAdminStatus = await staffService.getSystemAdminStatus();

    // Google連携状態を確認
    let isGoogleConnected = false;
    if (systemAdminStatus.hasSystemAdmin) {
      const systemAdmin = await staffService.getSystemAdmin();
      if (systemAdmin) {
        // google_refresh_tokenまたはgoogle_calendar_emailが存在すればGoogle連携済みと判断
        isGoogleConnected = !!(systemAdmin.google_refresh_token || systemAdmin.google_calendar_email);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        hasSystemAdmin: systemAdminStatus.hasSystemAdmin,
        systemAdminEmail: systemAdminStatus.systemAdminEmail,
        systemAdminName: systemAdminStatus.systemAdminName,
        isGoogleConnected,
      },
    });
  } catch (error) {
    console.error('システム管理者ステータス取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'システム管理者ステータスの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}
