// スタッフ管理サービス

import { SupabaseClient } from '@supabase/supabase-js';
import { Staff } from '@/types/database';
import { DuplicateError, NotFoundError, DatabaseError } from '@/lib/utils/errors';
import { isValidEmail } from '@/lib/utils/validation';

export class StaffService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * メールアドレスでスタッフを検索
   */
  async findByEmail(email: string): Promise<Staff | null> {
    if (!isValidEmail(email)) {
      throw new Error('無効なメールアドレスです');
    }

    const { data, error } = await this.supabase
      .from('staffs')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      // レコードが見つからない場合はnullを返す
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError('スタッフ情報の取得に失敗しました');
    }

    return data as Staff;
  }

  /**
   * IDでスタッフを検索
   */
  async findById(id: string): Promise<Staff | null> {
    const { data, error } = await this.supabase
      .from('staffs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError('スタッフ情報の取得に失敗しました');
    }

    return data as Staff;
  }

  /**
   * スタッフを作成
   */
  async create(email: string, name: string): Promise<Staff> {
    if (!isValidEmail(email)) {
      throw new Error('無効なメールアドレスです');
    }

    if (!name || name.trim().length === 0) {
      throw new Error('名前は必須です');
    }

    // メールアドレスの重複チェック
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new DuplicateError('このメールアドレスは既に登録されています');
    }

    const { data, error } = await this.supabase
      .from('staffs')
      .insert({
        email: email.trim(),
        name: name.trim(),
      })
      .select()
      .single();

    if (error) {
      // 一意制約違反
      if (error.code === '23505') {
        throw new DuplicateError('このメールアドレスは既に登録されています');
      }
      throw new DatabaseError('スタッフの作成に失敗しました');
    }

    return data as Staff;
  }

  /**
   * スタッフ情報を更新
   */
  async update(id: string, updates: { name?: string; email?: string; is_active?: boolean }): Promise<Staff> {
    // 更新するフィールドがあるか確認
    if (!updates.name && !updates.email && updates.is_active === undefined) {
      throw new Error('更新する情報がありません');
    }

    // スタッフが存在するか確認
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError('スタッフが見つかりません');
    }

    // メールアドレスの検証
    if (updates.email && !isValidEmail(updates.email)) {
      throw new Error('無効なメールアドレスです');
    }

    // メールアドレスの重複チェック（変更する場合）
    if (updates.email && updates.email !== existing.email) {
      const duplicate = await this.findByEmail(updates.email);
      if (duplicate) {
        throw new DuplicateError('このメールアドレスは既に登録されています');
      }
    }

    const updateData: any = {};
    if (updates.name) updateData.name = updates.name.trim();
    if (updates.email) updateData.email = updates.email.trim();
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

    const { data, error } = await this.supabase
      .from('staffs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new DuplicateError('このメールアドレスは既に登録されています');
      }
      throw new DatabaseError('スタッフ情報の更新に失敗しました');
    }

    return data as Staff;
  }

  /**
   * すべてのスタッフを取得
   */
  async findAll(): Promise<Staff[]> {
    const { data, error } = await this.supabase
      .from('staffs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError('スタッフ一覧の取得に失敗しました');
    }

    return data as Staff[];
  }

  /**
   * システム管理者を設定（複数人設定可能）
   */
  async setSystemAdmin(staffId: string): Promise<Staff> {
    // スタッフが存在するか確認
    const staff = await this.findById(staffId);
    if (!staff) {
      throw new NotFoundError('スタッフが見つかりません');
    }

    // すでにシステム管理者の場合は何もしない
    if (staff.is_system_admin) {
      return staff;
    }

    // システム管理者に設定
    const { data, error } = await this.supabase
      .from('staffs')
      .update({ is_system_admin: true })
      .eq('id', staffId)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('システム管理者の設定に失敗しました');
    }

    return data as Staff;
  }

  /**
   * システム管理者を解除
   */
  async removeSystemAdmin(staffId: string): Promise<Staff> {
    // スタッフが存在するか確認
    const staff = await this.findById(staffId);
    if (!staff) {
      throw new NotFoundError('スタッフが見つかりません');
    }

    // システム管理者を解除
    const { data, error } = await this.supabase
      .from('staffs')
      .update({ is_system_admin: false })
      .eq('id', staffId)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('システム管理者の解除に失敗しました');
    }

    return data as Staff;
  }

  /**
   * すべてのシステム管理者を取得
   */
  async getSystemAdmins(): Promise<Staff[]> {
    const { data, error } = await this.supabase
      .from('staffs')
      .select('*')
      .eq('is_system_admin', true)
      .order('name');

    if (error) {
      throw new DatabaseError('システム管理者の取得に失敗しました');
    }

    return data as Staff[];
  }

  /**
   * システム管理者を取得（後方互換性のため残す）
   */
  async getSystemAdmin(): Promise<Staff | null> {
    const admins = await this.getSystemAdmins();
    return admins.length > 0 ? admins[0] : null;
  }

  /**
   * システム管理者のステータスを取得
   */
  async getSystemAdminStatus(): Promise<{
    hasSystemAdmin: boolean;
    systemAdmins: Array<{
      email: string;
      name: string;
      isGoogleConnected: boolean;
    }>;
  }> {
    const systemAdmins = await this.getSystemAdmins();

    if (systemAdmins.length === 0) {
      return {
        hasSystemAdmin: false,
        systemAdmins: [],
      };
    }

    return {
      hasSystemAdmin: true,
      systemAdmins: systemAdmins.map(admin => ({
        email: admin.email,
        name: admin.name,
        isGoogleConnected: !!(admin.google_refresh_token || admin.google_calendar_email),
      })),
    };
  }

  /**
   * 祝日対応スタッフを設定
   */
  async setHolidayStaff(staffId: string, isHolidayStaff: boolean): Promise<Staff> {
    // スタッフが存在するか確認
    const staff = await this.findById(staffId);
    if (!staff) {
      throw new NotFoundError('スタッフが見つかりません');
    }

    // 祝日対応フラグを更新
    const { data, error } = await this.supabase
      .from('staffs')
      .update({ is_holiday_staff: isHolidayStaff })
      .eq('id', staffId)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('祝日対応スタッフの設定に失敗しました');
    }

    return data as Staff;
  }

  /**
   * スタッフ情報を取得（祝日対応フラグを含む）
   */
  async getStaff(staffId: string): Promise<Staff> {
    const staff = await this.findById(staffId);
    if (!staff) {
      throw new NotFoundError('スタッフが見つかりません');
    }
    return staff;
  }

  /**
   * Google Sheetsからスタッフ情報を同期
   * @param spreadsheetId スプレッドシートID
   * @param sheetName シート名
   * @returns 同期結果
   */
  async syncStaffFromSheet(
    spreadsheetId: string,
    sheetName: string = 'スタッフ'
  ): Promise<{
    synced: number;
    added: number;
    updated: number;
  }> {
    // GoogleSheetsServiceをインポート（循環参照を避けるため動的インポート）
    const { GoogleSheetsService } = await import('./GoogleSheetsService');
    
    const sheetsService = new GoogleSheetsService(this.supabase);
    
    // スプレッドシートからスタッフ情報を取得
    const sheetStaffList = await sheetsService.fetchStaffFromSheet(
      spreadsheetId,
      sheetName
    );

    let added = 0;
    let updated = 0;

    // 各スタッフを処理
    for (const sheetStaff of sheetStaffList) {
      try {
        // 既存のスタッフを検索
        const existingStaff = await this.findByEmail(sheetStaff.email);

        if (existingStaff) {
          // 名前が異なる場合は更新
          if (existingStaff.name !== sheetStaff.name) {
            await this.update(existingStaff.id, { name: sheetStaff.name });
            updated++;
          }
        } else {
          // 新規作成
          await this.create(sheetStaff.email, sheetStaff.name);
          added++;
        }
      } catch (error) {
        console.error(`スタッフ同期エラー (${sheetStaff.email}):`, error);
        // エラーが発生しても続行
      }
    }

    return {
      synced: sheetStaffList.length,
      added,
      updated,
    };
  }
}
