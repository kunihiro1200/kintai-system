// システム管理者解除API

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { StaffService } from '@/lib/services/StaffService';

export async function POST(request: NextRequest) {
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

    // リクエストボディを取得
    const body = await request.json();
    const { staffId } = body;

    if (!staffId) {
      return NextResponse.json(
        {
          success: false,
          error: 'スタッフIDが必要です',
        },
        { status: 400 }
      );
    }

    // RLSをバイパスするためサービスロールクライアントを使用
    const serviceRoleClient = createServiceRoleClient();
    const staffService = new StaffService(serviceRoleClient);

    // システム管理者を解除
    const updatedStaff = await staffService.removeSystemAdmin(staffId);

    return NextResponse.json({
      success: true,
      data: {
        staff: updatedStaff,
      },
    });
  } catch (error: any) {
    console.error('システム管理者解除エラー:', error);

    if (error.message === 'スタッフが見つかりません') {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'システム管理者の解除に失敗しました',
      },
      { status: 500 }
    );
  }
}
