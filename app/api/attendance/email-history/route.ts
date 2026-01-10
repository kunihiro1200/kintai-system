// メール送信履歴取得API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';

/**
 * GET /api/attendance/email-history
 * メール送信履歴を取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 認証チェック
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 送信履歴を取得（最新10件）
    const { data: history, error } = await supabase
      .from('email_history')
      .select(`
        *,
        staffs:sent_by_staff_id (
          name,
          email
        )
      `)
      .order('sent_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('送信履歴取得エラー:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: {
            message: '送信履歴の取得に失敗しました',
            details: error.message,
            code: error.code
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { history },
    });
  } catch (error: any) {
    console.error('送信履歴取得エラー:', error);
    // テーブルが存在しない場合は空の配列を返す
    return NextResponse.json({
      success: true,
      data: { history: [] },
    });
  }
}
