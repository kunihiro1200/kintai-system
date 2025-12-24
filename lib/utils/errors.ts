// エラーハンドリングユーティリティ

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 認証エラー
export class AuthenticationError extends AppError {
  constructor(message: string = '認証が必要です') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'アクセス権限がありません') {
    super(message, 'UNAUTHORIZED_ERROR', 403);
    this.name = 'UnauthorizedError';
  }
}

// バリデーションエラー
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

// 重複エラー
export class DuplicateError extends AppError {
  constructor(message: string) {
    super(message, 'DUPLICATE_ERROR', 409);
    this.name = 'DuplicateError';
  }
}

// データベースエラー
export class DatabaseError extends AppError {
  constructor(message: string = 'データベースエラーが発生しました') {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}

// 見つからないエラー
export class NotFoundError extends AppError {
  constructor(message: string = 'データが見つかりません') {
    super(message, 'NOT_FOUND_ERROR', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * エラーレスポンスを生成
 */
export function createErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  // 予期しないエラー
  console.error('Unexpected error:', error);
  return {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'サーバーエラーが発生しました',
    },
  };
}

/**
 * エラーのHTTPステータスコードを取得
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}
