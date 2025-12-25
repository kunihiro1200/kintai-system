// Google Calendar API サービス

import { google } from 'googleapis';
import { SupabaseClient } from '@supabase/supabase-js';

export class GoogleCalendarService {
  private oauth2Client;

  constructor(private supabase?: SupabaseClient) {
    // 本番環境では直接URLを指定（環境変数の改行問題を回避）
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://kintai-system-pi.vercel.app';
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    console.log('OAuth2 Redirect URI:', redirectUri);
    console.log('Base URL:', baseUrl);
    
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  }

  /**
   * OAuth認証URLを生成
   */
  getAuthUrl(staffId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/spreadsheets.readonly', // スプレッドシート読み取り権限
      'https://www.googleapis.com/auth/gmail.send', // Gmail送信権限
    ];
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: staffId, // スタッフIDを状態として渡す
      prompt: 'consent', // 常に同意画面を表示（リフレッシュトークン取得のため）
    });
  }

  /**
   * 認証コードからトークンを取得
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * スタッフのGoogleトークンをデータベースに保存
   */
  async saveStaffTokens(
    supabase: SupabaseClient,
    staffId: string,
    tokens: any,
    googleEmail: string
  ) {
    console.log('saveStaffTokens開始:', { 
      staffId, 
      googleEmail,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });

    const expiryDate = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // デフォルト1時間

    console.log('データベース更新実行中...');
    const { data, error } = await supabase
      .from('staffs')
      .update({
        google_calendar_email: googleEmail,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expiry: expiryDate.toISOString(),
      })
      .eq('id', staffId)
      .select();

    console.log('データベース更新結果:', { data, error });

    if (error) {
      console.error('データベース更新エラー詳細:', JSON.stringify(error, null, 2));
      throw new Error('トークンの保存に失敗しました: ' + error.message);
    }

    console.log('saveStaffTokens完了');
  }

  /**
   * スタッフのGoogleトークンを取得
   */
  async getStaffTokens(supabase: SupabaseClient, staffId: string) {
    const { data, error } = await supabase
      .from('staffs')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', staffId)
      .single();

    if (error || !data) {
      throw new Error('トークンの取得に失敗しました');
    }

    return data;
  }

  /**
   * アクセストークンをリフレッシュ
   */
  async refreshAccessToken(
    supabase: SupabaseClient,
    staffId: string,
    refreshToken: string
  ): Promise<string> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('アクセストークンのリフレッシュに失敗しました');
    }

    // 新しいトークンをデータベースに保存
    const expiryDate = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await supabase
      .from('staffs')
      .update({
        google_access_token: credentials.access_token,
        google_token_expiry: expiryDate.toISOString(),
      })
      .eq('id', staffId);

    return credentials.access_token;
  }

  /**
   * 有効なアクセストークンを取得（必要に応じてリフレッシュ）
   */
  async getValidAccessToken(supabase: SupabaseClient, staffId: string): Promise<string> {
    const tokens = await this.getStaffTokens(supabase, staffId);

    if (!tokens.google_access_token || !tokens.google_refresh_token) {
      throw new Error('Googleカレンダーが連携されていません');
    }

    // トークンの有効期限をチェック
    if (!tokens.google_token_expiry) {
      // 有効期限が設定されていない場合はリフレッシュ
      return await this.refreshAccessToken(
        supabase,
        staffId,
        tokens.google_refresh_token
      );
    }

    const expiryDate = new Date(tokens.google_token_expiry);
    const now = new Date();

    // 有効期限が5分以内の場合はリフレッシュ
    if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000) {
      return await this.refreshAccessToken(
        supabase,
        staffId,
        tokens.google_refresh_token
      );
    }

    return tokens.google_access_token;
  }

  /**
   * カレンダーイベントを作成
   */
  async createCalendarEvent(
    supabase: SupabaseClient,
    staffId: string,
    eventData: {
      summary: string; // イベントタイトル（例: 「有給休暇」）
      date: string; // 日付（YYYY-MM-DD形式）
      description?: string; // 説明（オプション）
    }
  ) {
    // 有効なアクセストークンを取得
    const accessToken = await this.getValidAccessToken(supabase, staffId);

    // OAuth2クライアントにトークンを設定
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    // Calendar APIクライアントを作成
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    // 終日イベントとして作成
    const event = {
      summary: eventData.summary,
      description: eventData.description || '',
      start: {
        date: eventData.date, // 終日イベントは'date'を使用
      },
      end: {
        date: eventData.date, // 終日イベントは開始日と終了日が同じ
      },
      colorId: '11', // 赤色（休暇を目立たせる）
    };

    // イベントを作成
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data;
  }

  /**
   * カレンダーイベントを削除
   */
  async deleteCalendarEvent(
    supabase: SupabaseClient,
    staffId: string,
    eventId: string
  ) {
    // 有効なアクセストークンを取得
    const accessToken = await this.getValidAccessToken(supabase, staffId);

    // OAuth2クライアントにトークンを設定
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    // Calendar APIクライアントを作成
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    // イベントを削除
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
  }

  /**
   * Googleカレンダー連携を解除
   */
  async disconnectCalendar(supabase: SupabaseClient, staffId: string) {
    const { error } = await supabase
      .from('staffs')
      .update({
        google_calendar_email: null,
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
      })
      .eq('id', staffId);

    if (error) {
      throw new Error('連携解除に失敗しました');
    }
  }

  /**
   * スタッフのGoogleカレンダー連携状態を確認
   */
  async isCalendarConnected(supabase: SupabaseClient, staffId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('staffs')
      .select('google_calendar_email, google_access_token, google_refresh_token')
      .eq('id', staffId)
      .single();

    console.log('isCalendarConnected チェック:', {
      staffId,
      hasData: !!data,
      error: error,
      google_calendar_email: data?.google_calendar_email,
      has_access_token: !!data?.google_access_token,
      has_refresh_token: !!data?.google_refresh_token,
    });

    return !!(
      data?.google_calendar_email &&
      data?.google_access_token &&
      data?.google_refresh_token
    );
  }
}
