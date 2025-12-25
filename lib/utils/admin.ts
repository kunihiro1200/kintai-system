// 管理者権限チェック

import { createClient } from '@/lib/supabase/server';

/**
 * 指定されたメールアドレスが管理者かどうかをデータベースでチェック
 */
export async function isAdmin(email: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('staffs')
      .select('is_system_admin')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.is_system_admin === true;
  } catch (error) {
    console.error('管理者チェックエラー:', error);
    return false;
  }
}
