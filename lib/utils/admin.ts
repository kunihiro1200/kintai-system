// 管理者権限チェック

// 管理者のメールアドレスリスト
const ADMIN_EMAILS = [
  'tenant@ifoo-oita.com',
  'tomoko.kunihiro@ifoo-oita.com',
  'yurine.kimura@ifoo-oita.com',
  'mariko.kume@ifoo-oita.com',
];

/**
 * 指定されたメールアドレスが管理者かどうかをチェック
 */
export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}

/**
 * 管理者のメールアドレスリストを取得
 */
export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS];
}
