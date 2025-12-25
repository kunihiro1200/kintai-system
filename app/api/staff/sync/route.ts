// スタッフ情報同期API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/helpers';
import { StaffService } from '@/lib/services/StaffService';

// 管理者メールアドレス
const ADMIN_EMAILS = [
  'tomoko.kunihiro@ifoo-oita.com',
  'yurine.kimura@ifoo-oita.com',
  'mariko.kume@ifoo-oita.com',
];

// スプレッドシート設定
const SPREADSHEET_ID = '19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs';
const SHEET_NAME = 'スタッフ';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser(supabase);

    console.log('スタッフ同期API開始:', { userId: user?.id, email: user?.email });

    if (!user) {
      console.log('認証エラー: ユーザーが見つかりません');
      return NextResponse.json(
        { success: false, error: { message: '認証が必要です' } },
        { status: 401 }
      );
    }

    // 管理者チェック
    if (!ADMIN_EMAILS.includes(user.email || '')) {
      console.log('権限エラー: 管理者ではありません', user.email);
      return NextResponse.json(
        { success: false, error: { message: 'アクセス権限がありません' } },
        { status: 403 }
      );
    }

    // StaffServiceのインスタンスを作成
    const staffService = new StaffService(supabase);

    // システム管理者の存在確認
    const systemAdmin = await staffService.getSystemAdmin();
    
    if (!systemAdmin) {
      console.log('システム管理者エラー: システム管理者が設定されていません');
      return NextResponse.json(
        {
          success: false,
          error: { 
            message: 'システム管理者が設定されていません。スタッフ管理画面でシステム管理者を設定してください。',
            code: 'NO_SYSTEM_ADMIN'
          },
        },
        { status: 400 }
      );
    }

    console.log('システム管理者:', { email: systemAdmin.email, name: systemAdmin.name });

    // スプレッドシートからスタッフ情報を同期
    // StaffService.syncStaffFromSheetメソッドが内部でGoogleSheetsServiceを使用し、
    // システム管理者のトークンを自動的に取得して使用する
    console.log('スタッフ同期開始:', { spreadsheetId: SPREADSHEET_ID, sheetName: SHEET_NAME });
    
    const result = await staffService.syncStaffFromSheet(
      SPREADSHEET_ID,
      SHEET_NAME
    );

    console.log('スタッフ同期成功:', result);

    return NextResponse.json({
      success: true,
      data: {
        message: 'スタッフ情報を同期しました',
        added: result.added,
        updated: result.updated,
        total: result.synced,
      },
    });
  } catch (error: any) {
    console.error('スタッフ同期API エラー:', error);
    
    // トークン期限切れエラー
    if (error.message?.includes('期限が切れています')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: 'TOKEN_EXPIRED'
          },
        },
        { status: 401 }
      );
    }
    
    // アクセス権限エラー
    if (error.message?.includes('アクセス権限がありません')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'スプレッドシートへのアクセス権限がありません。Googleカレンダー連携の「再接続」ボタンをクリックして、スプレッドシートへのアクセス権限を付与してください。',
            code: 'ACCESS_DENIED'
          },
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'スタッフ情報の同期に失敗しました',
        },
      },
      { status: 500 }
    );
  }
}
