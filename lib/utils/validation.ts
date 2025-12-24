// バリデーションユーティリティ

/**
 * メールアドレスの形式を検証
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 文字列が空でないことを検証
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * UUIDの形式を検証
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 日付文字列（YYYY-MM-DD）の形式を検証
 */
export function isValidDateString(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * ISO 8601形式の日時文字列を検証
 */
export function isValidISODateTime(dateTimeString: string): boolean {
  const date = new Date(dateTimeString);
  return !isNaN(date.getTime()) && date.toISOString() === dateTimeString;
}

/**
 * 退勤時刻が出勤時刻より後であることを検証
 */
export function isClockOutAfterClockIn(clockIn: string, clockOut: string): boolean {
  const clockInDate = new Date(clockIn);
  const clockOutDate = new Date(clockOut);
  return clockOutDate > clockInDate;
}
