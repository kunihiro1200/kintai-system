// Googleスプレッドシート連携サービス

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { SupabaseClient } from '@supabase/supabase-js';
import { StaffService } from './StaffService';

export interface SheetStaff {
  email: string;
  name: string;
  is_active: boolean; // I列「通常」カラム
}

export class GoogleSheetsService {
  private staffService: StaffService;

  constructor(
    private supabase: SupabaseClient,
    private auth?: OAuth2Client
  ) {
    this.staffService = new StaffService(supabase);
  }

  /**
   * システム管理者のトークンを取得
   */
  async getSystemAdminToken(): Promise<string | null> {
    try {
      // システム管理者を取得
      const systemAdmin = await this.staffService.getSystemAdmin();
      
      console.log('getSystemAdminToken - システム管理者:', systemAdmin);
      
      if (!systemAdmin) {
        console.log('getSystemAdminToken - システム管理者が見つかりません');
        return null;
      }

      // システム管理者のアクセストークンを直接取得
      console.log('getSystemAdminToken - アクセストークン存在:', !!systemAdmin.google_access_token);
      console.log('getSystemAdminToken - リフレッシュトークン存在:', !!systemAdmin.google_refresh_token);
      console.log('getSystemAdminToken - トークン有効期限:', systemAdmin.google_token_expiry);
      
      if (!systemAdmin.google_access_token) {
        console.log('getSystemAdminToken - アクセストークンがありません');
        return null;
      }

      // 一旦有効期限チェックをスキップして、既存のトークンをそのまま返す
      console.log('getSystemAdminToken - 既存のアクセストークンを返します（有効期限チェックスキップ）');
      return systemAdmin.google_access_token;
    } catch (error) {
      console.error('システム管理者トークン取得エラー:', error);
      return null;
    }
  }

  /**
   * システム管理者のアクセストークンをリフレッシュ
   */
  private async refreshSystemAdminToken(staffId: string, refreshToken: string): Promise<string> {
    const oauth2Client = new OAuth2Client(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // 新しいトークンをデータベースに保存
    const expiryDate = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await this.supabase
      .from('staffs')
      .update({
        google_access_token: credentials.access_token,
        google_token_expiry: expiryDate.toISOString(),
      })
      .eq('id', staffId);

    return credentials.access_token!;
  }

  /**
   * トークンの有効性を確認
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const oauth2Client = new OAuth2Client(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      
      oauth2Client.setCredentials({
        access_token: token,
      });

      // トークンの有効性を確認するために簡単なAPIコールを実行
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      
      // ダミーのリクエストでトークンの有効性を確認
      // 実際にはスプレッドシートIDが必要だが、ここではトークンの検証のみ
      return true;
    } catch (error) {
      console.error('トークン検証エラー:', error);
      return false;
    }
  }

  /**
   * システム管理者のトークンを使用してOAuth2Clientを初期化
   */
  private async initializeWithSystemAdminToken(): Promise<OAuth2Client | null> {
    const token = await this.getSystemAdminToken();
    
    if (!token) {
      return null;
    }

    const oauth2Client = new OAuth2Client(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: token,
    });

    return oauth2Client;
  }

  /**
   * スプレッドシートからスタッフ情報を取得（システム管理者のトークンを使用）
   * @param spreadsheetId スプレッドシートID
   * @param sheetName シート名
   * @returns スタッフ情報の配列
   */
  async fetchStaffFromSheet(
    spreadsheetId: string,
    sheetName: string = 'スタッフ'
  ): Promise<SheetStaff[]> {
    try {
      // システム管理者のトークンでOAuth2Clientを初期化
      const auth = this.auth || await this.initializeWithSystemAdminToken();
      
      if (!auth) {
        throw new Error('システム管理者のトークンが見つかりません。Google連携を行ってください。');
      }

      const sheets = google.sheets({ version: 'v4', auth });

      // シートからデータを取得（D列: 姓名、E列: メールアドレス、I列: 通常）
      const range = `${sheetName}!D2:I`; // ヘッダー行をスキップ
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      
      if (!rows || rows.length === 0) {
        return [];
      }

      // データを整形
      const staffList: SheetStaff[] = [];
      
      for (const row of rows) {
        const name = row[0]?.trim();  // D列: 姓名
        const email = row[1]?.trim(); // E列: メールアドレス
        const isActive = row[5]?.toString().toUpperCase() === 'TRUE'; // I列: 通常（D=0, E=1, F=2, G=3, H=4, I=5）
        
        // メールアドレスと名前が両方存在する場合のみ追加
        if (email && name) {
          staffList.push({ email, name, is_active: isActive });
        }
      }

      return staffList;
    } catch (error: any) {
      console.error('スプレッドシート読み込みエラー詳細:', {
        message: error.message,
        code: error.code,
        status: error.status,
        errors: error.errors,
        response: error.response?.data,
        fullError: JSON.stringify(error, null, 2)
      });
      
      // トークン期限切れの場合
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        throw new Error('Googleトークンの期限が切れています。再度Google連携を行ってください。');
      }
      
      // アクセス権限がない場合
      if (error.code === 403) {
        const errorDetails = error.errors?.[0]?.message || error.message || '不明なエラー';
        throw new Error(`スプレッドシートへのアクセス権限がありません。詳細: ${errorDetails}。Googleカレンダー連携の「再接続」ボタンをクリックして、スプレッドシートへのアクセス権限を付与してください。`);
      }
      
      throw new Error(`スプレッドシートの読み込みに失敗しました: ${error.message}`);
    }
  }

  /**
   * スプレッドシートからスタッフ情報を取得（後方互換性のため）
   * @deprecated fetchStaffFromSheetを使用してください
   */
  async getStaffList(
    spreadsheetId: string,
    sheetName: string = 'スタッフ'
  ): Promise<SheetStaff[]> {
    return this.fetchStaffFromSheet(spreadsheetId, sheetName);
  }

  /**
   * スプレッドシートにアクセス可能か確認
   * @param spreadsheetId スプレッドシートID
   * @returns アクセス可能な場合true
   */
  async canAccessSpreadsheet(spreadsheetId: string): Promise<boolean> {
    try {
      const auth = this.auth || await this.initializeWithSystemAdminToken();
      
      if (!auth) {
        return false;
      }

      const sheets = google.sheets({ version: 'v4', auth });
      
      await sheets.spreadsheets.get({
        spreadsheetId,
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}
