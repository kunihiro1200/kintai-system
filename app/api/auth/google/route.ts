// Google OAuth認証開始エンドポイント

import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/lib/services/GoogleCalendarService';
import { getCurrentStaff } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  try {
    // 認証されたスタッフを取得
    const staff = await getCurrentStaff();

    // Google Calendar サービスを初期化
    const calendarService = new GoogleCalendarService();

    // OAuth認証URLを生成
    const authUrl = calendarService.getAuthUrl(staff.id);

    // 認証URLにリダイレクト
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google OAuth開始エラー:', error);
    return NextResponse.json(
      { success: false, error: { message: '認証の開始に失敗しました' } },
      { status: 500 }
    );
  }
}
