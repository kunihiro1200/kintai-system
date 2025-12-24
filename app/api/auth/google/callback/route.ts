// Google OAuthコールバックエンドポイント

import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/lib/services/GoogleCalendarService';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // スタッフID
    const error = searchParams.get('error');

    // ユーザーが認証を拒否した場合
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=access_denied`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=invalid_request`
      );
    }

    const staffId = state;

    console.log('OAuth認証コールバック開始:', { staffId, code: code.substring(0, 20) + '...' });

    // Google Calendar サービスを初期化
    const calendarService = new GoogleCalendarService();

    // 認証コードからトークンを取得
    console.log('トークンを取得中...');
    const tokens = await calendarService.getTokensFromCode(code);
    console.log('トークン取得成功:', { 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      hasIdToken: !!tokens.id_token
    });

    // トークンからユーザー情報を取得（id_tokenをデコード）
    let googleEmail: string | null = null;
    
    if (tokens.id_token) {
      console.log('id_tokenからメールアドレスを取得中...');
      try {
        // id_tokenをデコードしてメールアドレスを取得
        const base64Url = tokens.id_token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          Buffer.from(base64, 'base64')
            .toString()
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        googleEmail = payload.email;
        console.log('メールアドレス取得成功:', googleEmail);
      } catch (decodeError) {
        console.error('id_tokenのデコードエラー:', decodeError);
      }
    } else {
      console.error('id_tokenが存在しません');
    }

    if (!googleEmail) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=no_email`
      );
    }

    // Supabaseクライアントを作成
    const supabase = await createClient();

    // トークンをデータベースに保存
    console.log('トークンをデータベースに保存中...', { staffId, googleEmail });
    try {
      await calendarService.saveStaffTokens(supabase, staffId, tokens, googleEmail);
      console.log('トークン保存成功');
    } catch (saveError) {
      console.error('トークン保存エラー:', saveError);
      throw saveError;
    }

    // 成功時はホームページにリダイレクト
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?calendar_connected=true`
    );
  } catch (error) {
    console.error('Google OAuthコールバックエラー:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=callback_failed`
    );
  }
}
