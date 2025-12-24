// 日付・時刻処理ユーティリティ

/**
 * 日付をYYYY-MM-DD形式の文字列に変換
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日付をISO 8601形式の文字列に変換
 */
export function formatDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * ISO 8601形式の文字列をDateオブジェクトに変換
 */
export function parseDateTime(dateTimeString: string): Date {
  return new Date(dateTimeString);
}

/**
 * YYYY-MM-DD形式の文字列をDateオブジェクトに変換
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * 現在の日付をYYYY-MM-DD形式で取得
 */
export function getCurrentDate(): string {
  return formatDate(new Date());
}

/**
 * 現在の日時をISO 8601形式で取得
 */
export function getCurrentDateTime(): string {
  return formatDateTime(new Date());
}

/**
 * 曜日を取得（0: 日曜日, 1: 月曜日, ..., 6: 土曜日）
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * 月曜日かどうかを判定
 */
export function isMonday(date: Date): boolean {
  return getDayOfWeek(date) === 1;
}

/**
 * 2つの日時の差を時間単位で計算
 */
export function getHoursDifference(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * 時間を小数点2桁に丸める
 */
export function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100;
}

/**
 * HH:MM形式の時刻文字列を作成
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 日付文字列を日本語形式に変換（例: 2024年1月1日）
 */
export function formatDateJapanese(dateString: string): string {
  const date = parseDate(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 日時文字列を日本語形式に変換（例: 2024年1月1日 09:00）
 */
export function formatDateTimeJapanese(dateTimeString: string): string {
  const date = parseDateTime(dateTimeString);
  const dateStr = formatDateJapanese(formatDate(date));
  const timeStr = formatTime(date);
  return `${dateStr} ${timeStr}`;
}
