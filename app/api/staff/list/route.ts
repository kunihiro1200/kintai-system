// スタッフ一覧取得API

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/helpers';
import { StaffService } from '@/lib/services/StaffService';

// 管理者メールアドレス
const ADMIN_EMAILS = [
  'tomoko.kunihiro@ifoo-oita.com',
  'yurine.kimura@ifoo-oita.com',
  'mariko.kume@ifoo-oita.com',
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: '認証が必要です' } },
        { status: 401 }
      );
    }

    // 管理者チェック
    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json(
        { success: false, error: { message: 'アクセス権限がありません' } },
        { status: 403 }
      );
    }

    // RLSをバイパスしてすべてのスタッフ情報を取得
    const serviceRoleClient = createServiceRoleClient();
    const staffService = new StaffService(serviceRoleClient);
    const staffs = await staffService.findAll();

    return NextResponse.json({
      success: true,
      data: {
        staffs,
      },
    });
  } catch (error: any) {
    console.error('スタッフ一覧取得API エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'スタッフ一覧の取得に失敗しました',
        },
      },
      { status: 500 }
    );
  }
}
