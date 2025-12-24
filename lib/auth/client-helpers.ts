// クライアントサイド認証ヘルパー関数

import { createClient } from '@/lib/supabase/client';
import { StaffService } from '@/lib/services/StaffService';
import type { Staff } from '@/types/database';

/**
 * 現在認証されているユーザーのメールアドレスを取得（クライアントサイド）
 */
export async function getCurrentUserEmailClient(): Promise<string | null> {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email || null;
}

/**
 * 現在認証されているユーザーのスタッフ情報を取得（クライアントサイド）
 */
export async function getCurrentStaffClient(): Promise<Staff | null> {
  const email = await getCurrentUserEmailClient();
  
  if (!email) {
    return null;
  }

  const supabase = createClient();
  const staffService = new StaffService(supabase);

  return await staffService.findByEmail(email);
}
