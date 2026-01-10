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

    // 全てのシステム管理者を取得
    const { data: systemAdmins, error: adminError } = await supabase
      .from('staffs')
      .select('email, name, google_access_token, google_refresh_token')
      .eq('is_system_admin', true);

    if (adminError) {
      console.error('システム管理者取得エラー:', adminError);
      return NextResponse.json(
        {
          success: false,
          error: 'システム管理者情報の取得に失敗しました',
        },
        { status: 500 }
      );
    }

    // システム管理者が存在するかチェック
    const hasSystemAdmin = systemAdmins && systemAdmins.length > 0;

    // システム管理者の詳細情報を構築
    const adminDetails = systemAdmins?.map((admin) => ({
      email: admin.email,
      name: admin.name,
      isGoogleConnected: !!(admin.google_access_token || admin.google_refresh_token),
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        hasSystemAdmin,
        systemAdmins: adminDetails,
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
