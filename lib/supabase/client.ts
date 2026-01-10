import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Supabase環境変数が設定されていません。URL: ${supabaseUrl ? '設定済み' : '未設定'}, Key: ${supabaseAnonKey ? '設定済み' : '未設定'}`
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
