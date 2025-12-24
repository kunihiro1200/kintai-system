// 認証ヘルパー関数

import { createClient } from '@/lib/supabase/server';
import { StaffService } from '@/lib/services/StaffService';
import { AuthenticationError, UnauthorizedError } from '@/lib/utils/errors';
import type { Staff } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 現在認証されているユーザー情報を取得
 */
export async function getCurrentUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    throw new AuthenticationError('認証が必要です');
  }

  return user;
}

/**
 * 現在認証されているユーザーのメールアドレスを取得
 */
export async function getCurrentUserEmail(): Promise<string> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    throw new AuthenticationError('認証が必要です');
  }

  return user.email;
}

/**
 * 現在認証されているユーザーのスタッフ情報を取得
 */
export async function getCurrentStaff(): Promise<Staff> {
  const email = await getCurrentUserEmail();
  const supabase = await createClient();
  const staffService = new StaffService(supabase);

  const staff = await staffService.findByEmail(email);

  if (!staff) {
    throw new UnauthorizedError(
      'このメールアドレスはスタッフとして登録されていません。管理者にお問い合わせください。'
    );
  }

  return staff;
}

/**
 * 認証されたユーザーが指定されたスタッフIDと一致するか確認
 */
export async function verifyStaffAccess(staffId: string): Promise<void> {
  const currentStaff = await getCurrentStaff();

  if (currentStaff.id !== staffId) {
    throw new UnauthorizedError('他のスタッフのデータにはアクセスできません');
  }
}
