// システム管理者ステータス取得API

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { StaffService } from '@/lib/services/StaffService';

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

    // RLSをバイパスしてシステム管理者情報を取得
    const serviceRoleClient = createServiceRoleClient();
    const staffService = new StaffService(serviceRoleClient);

    // システム管理者のステータスを取得
    const systemAdminStatus = await staffService.getSystemAdminStatus();

    return NextResponse.json({
      success: true,
      data: systemAdminStatus,
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
