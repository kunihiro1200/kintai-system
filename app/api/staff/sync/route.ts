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

    // 管理者チェック - 現在のユーザーがシステム管理者かどうか確認
    const { data: currentStaff, error: staffError } = await supabase
      .from('staffs')
      .select('*')
      .eq('email', user.email)
      .eq('is_system_admin', true)
      .single();

    if (staffError || !currentStaff) {
      console.log('権限エラー: システム管理者ではありません', user.email);
      return NextResponse.json(
        { success: false, error: { message: 'アクセス権限がありません。システム管理者のみがスプレッドシート同期を実行できます。' } },
        { status: 403 }
      );
    }

    console.log('現在のユーザー（システム管理者）:', { email: currentStaff.email, name: currentStaff.name });

    // StaffServiceのインスタンスを作成
    const staffService = new StaffService(supabase);

    // 現在のユーザーのトークンを確認
    if (!currentStaff.google_access_token || !currentStaff.google_refresh_token) {
      console.log('Google連携エラー: トークンがありません');
      return NextResponse.json(
        {
          success: false,
          error: { 
            message: 'Googleカレンダーが連携されていません。ホーム画面でGoogleカレンダー連携を行ってください。',
            code: 'NO_GOOGLE_CONNECTION'
          },
        },
        { status: 400 }
      );
    }

    console.log('Google連携確認:', {
      hasAccessToken: !!currentStaff.google_access_token,
      hasRefreshToken: !!currentStaff.google_refresh_token,
      tokenExpiry: currentStaff.google_token_expiry
    });

    // 現在のユーザーのトークンでOAuth2Clientを作成
    const { OAuth2Client } = require('google-auth-library');
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: currentStaff.google_access_token,
      refresh_token: currentStaff.google_refresh_token,
    });

    // GoogleSheetsServiceに現在のユーザーのOAuth2Clientを渡す
    const { GoogleSheetsService } = require('@/lib/services/GoogleSheetsService');
    const sheetsService = new GoogleSheetsService(supabase, oauth2Client);

    // スプレッドシートからスタッフ情報を同期
    console.log('スタッフ同期開始:', { spreadsheetId: SPREADSHEET_ID, sheetName: SHEET_NAME });
    
    const staffList = await sheetsService.fetchStaffFromSheet(
      SPREADSHEET_ID,
      SHEET_NAME
    );

    console.log('スプレッドシートから取得したスタッフ数:', staffList.length);
    console.log('スプレッドシートのスタッフ詳細:', staffList.map((s: { email: string; name: string; is_active: boolean }) => ({ email: s.email, name: s.name, is_active: s.is_active })));

    // スタッフ情報をデータベースに同期
    let added = 0;
    let updated = 0;
    let deactivated = 0;

    // スプレッドシートのメールアドレスリストを作成
    const sheetEmails = new Set(staffList.map((s: { email: string }) => s.email));

    // スプレッドシートに存在するスタッフを処理
    for (const sheetStaff of staffList) {
      const existing = await staffService.findByEmail(sheetStaff.email);
      
      if (existing) {
        console.log(`既存スタッフ: ${sheetStaff.email}, DB is_active: ${existing.is_active}, Sheet is_active: ${sheetStaff.is_active}`);
        // 既存スタッフの名前またはis_activeを更新
        if (existing.name !== sheetStaff.name || existing.is_active !== sheetStaff.is_active) {
          console.log(`更新: ${sheetStaff.email} - name: ${existing.name} -> ${sheetStaff.name}, is_active: ${existing.is_active} -> ${sheetStaff.is_active}`);
          await staffService.update(existing.id, { 
            name: sheetStaff.name,
            is_active: sheetStaff.is_active
          });
          updated++;
        }
      } else {
        console.log(`新規スタッフ: ${sheetStaff.email}, is_active: ${sheetStaff.is_active}`);
        // 新規スタッフを作成
        const newStaff = await staffService.create(sheetStaff.email, sheetStaff.name);
        // is_activeを設定（デフォルトはtrueなので、falseの場合のみ更新）
        if (!sheetStaff.is_active) {
          await staffService.update(newStaff.id, { is_active: false });
        }
        added++;
      }
    }

    // データベースに存在するが、スプレッドシートに存在しないスタッフをis_active=falseに設定
    const allStaffs = await staffService.findAll();
    console.log('データベースの全スタッフ数:', allStaffs.length);
    for (const dbStaff of allStaffs) {
      if (!sheetEmails.has(dbStaff.email) && dbStaff.is_active) {
        console.log(`非アクティブ化: ${dbStaff.email} (スプレッドシートに存在しない)`);
        await staffService.update(dbStaff.id, { is_active: false });
        deactivated++;
      }
    }

    const result = {
      synced: staffList.length,
      added,
      updated,
      deactivated,
    };

    console.log('スタッフ同期成功:', result);

    return NextResponse.json({
      success: true,
      data: {
        message: 'スタッフ情報を同期しました',
        added: result.added,
        updated: result.updated,
        deactivated: result.deactivated,
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
