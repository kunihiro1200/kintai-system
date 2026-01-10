// メール送信履歴詳細取得API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';

/**
 * GET /api/attendance/email-history/[id]
 * メール送信履歴の詳細を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // 履歴詳細を取得
    const { data: history, error } = await supabase
      .from('email_history')
      .select(`
        *,
        staffs:sent_by_staff_id (
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('履歴詳細取得エラー:', error);
      return NextResponse.json(
        { success: false, error: '履歴詳細の取得に失敗しました' },
        { status: 500 }
      );
    }

    if (!history) {
      return NextResponse.json(
        { success: false, error: '履歴が見つかりません' },
        { status: 404 }
      );
    }

    // レスポンスデータを整形
    const responseData = {
      id: history.id,
      sent_at: history.sent_at,
      sender_name: history.staffs?.name || '不明',
      sender_email: history.staffs?.email || '不明',
      recipient_email: history.recipient_email,
      subject: history.subject,
      start_date: history.start_date,
      end_date: history.end_date,
      email_content: history.email_content || { summaries: [] },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('履歴詳細取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '履歴詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
}
