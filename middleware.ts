import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションをリフレッシュ
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 認証が必要なパスで未認証の場合、ログインページにリダイレクト
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 認証済みでログインページにアクセスした場合、ホームにリダイレクト
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // 認証済みユーザーのスタッフレコードを確認・作成
  if (user && user.email) {
    try {
      // スタッフレコードが存在するか確認
      const { data: existingStaff, error: selectError } = await supabase
        .from('staffs')
        .select('id')
        .eq('email', user.email)
        .maybeSingle(); // singleの代わりにmaybeSingleを使用

      if (selectError) {
        console.error('スタッフレコード検索エラー:', selectError);
      }

      // スタッフレコードが存在しない場合は作成
      if (!existingStaff) {
        // ユーザー名を取得（user_metadataから取得、なければメールアドレスから生成）
        const userName = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.email.split('@')[0];

        const { data: newStaff, error: insertError } = await supabase
          .from('staffs')
          .insert({
            email: user.email,
            name: userName,
          })
          .select()
          .single();

        if (insertError) {
          console.error('スタッフレコード作成エラー:', insertError);
        } else {
          console.log(`スタッフレコードを自動作成しました: ${user.email} (ID: ${newStaff?.id})`);
        }
      }
    } catch (error) {
      console.error('スタッフレコード確認・作成エラー:', error);
      // エラーが発生してもリクエストは続行
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico (faviconファイル)
     * - public フォルダ内のファイル
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
