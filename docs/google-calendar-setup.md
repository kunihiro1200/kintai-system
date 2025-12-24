# Googleカレンダー連携セットアップガイド

## 概要

このドキュメントでは、勤怠管理システムとGoogleカレンダーを連携させるための設定手順を説明します。

## 前提条件

- Googleアカウント（`[email protected]`など）
- Google Cloud Consoleへのアクセス権限

## ステップ1: Google Cloud Projectの作成

### 1.1 Google Cloud Consoleにアクセス

1. https://console.cloud.google.com/ にアクセス
2. Googleアカウントでログイン

### 1.2 新しいプロジェクトを作成

1. 左上の「プロジェクトを選択」をクリック
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を入力（例: 「勤怠管理システム」）
4. 「作成」をクリック
5. プロジェクトが作成されるまで待つ（数秒）

## ステップ2: Google Calendar APIの有効化

### 2.1 APIライブラリにアクセス

1. 左メニューの「APIとサービス」→「ライブラリ」をクリック
2. 検索ボックスに「Google Calendar API」と入力
3. 「Google Calendar API」をクリック
4. 「有効にする」をクリック

## ステップ3: OAuth同意画面の設定

### 3.1 OAuth同意画面の作成

1. 左メニューの「APIとサービス」→「OAuth同意画面」をクリック
2. ユーザータイプを選択:
   - **外部**: 誰でもアクセス可能（テスト段階では100ユーザーまで）
   - **内部**: Google Workspaceの組織内のみ（推奨）
3. 「作成」をクリック

### 3.2 アプリ情報の入力

1. **アプリ名**: 「勤怠管理システム」
2. **ユーザーサポートメール**: `[email protected]`
3. **アプリのロゴ**: （オプション）
4. **アプリのドメイン**: （オプション）
5. **デベロッパーの連絡先情報**: `[email protected]`
6. 「保存して次へ」をクリック

### 3.3 スコープの追加

1. 「スコープを追加または削除」をクリック
2. 検索ボックスに「calendar」と入力
3. 以下のスコープを選択:
   - `https://www.googleapis.com/auth/calendar.events` (カレンダーイベントの作成・編集)
4. 「更新」をクリック
5. 「保存して次へ」をクリック

### 3.4 テストユーザーの追加（外部を選択した場合）

1. 「テストユーザーを追加」をクリック
2. 使用するGmailアドレスを入力（例: `[email protected]`）
3. 「追加」をクリック
4. 「保存して次へ」をクリック

## ステップ4: OAuth 2.0クライアントIDの作成

### 4.1 認証情報の作成

1. 左メニューの「APIとサービス」→「認証情報」をクリック
2. 「認証情報を作成」→「OAuth クライアント ID」をクリック

### 4.2 クライアント情報の入力

1. **アプリケーションの種類**: 「ウェブアプリケーション」を選択
2. **名前**: 「勤怠管理Webアプリ」
3. **承認済みのJavaScript生成元**: （空欄でOK）
4. **承認済みのリダイレクトURI**: 以下を追加
   - 開発環境: `http://localhost:3000/api/auth/google/callback`
   - 本番環境: `https://your-domain.com/api/auth/google/callback`（後で追加）
5. 「作成」をクリック

### 4.3 認証情報のコピー

1. ポップアップが表示されたら、以下をコピー:
   - **クライアントID**: `xxxxx.apps.googleusercontent.com`
   - **クライアントシークレット**: `GOCSPX-xxxxx`
2. 「OK」をクリック

## ステップ5: 環境変数の設定

### 5.1 .env.localファイルの編集

プロジェクトルートの`.env.local`ファイルに以下を追加:

```env
# Google Calendar API
GOOGLE_CLIENT_ID=あなたのクライアントID
GOOGLE_CLIENT_SECRET=あなたのクライアントシークレット
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5.2 本番環境の設定

本番環境では、以下を設定:

```env
GOOGLE_CLIENT_ID=あなたのクライアントID
GOOGLE_CLIENT_SECRET=あなたのクライアントシークレット
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## ステップ6: データベースマイグレーションの実行

Supabaseダッシュボードで以下のSQLを実行:

```sql
-- supabase/migrations/003_add_google_calendar_integration.sql の内容を実行
```

または、Supabase CLIを使用:

```bash
supabase db push
```

## ステップ7: 動作確認

### 7.1 開発サーバーの起動

```bash
npm run dev
```

### 7.2 Googleアカウント連携

1. ブラウザで `http://localhost:3000` にアクセス
2. ログイン後、設定画面でGoogleカレンダー連携を有効化
3. Googleの認証画面が表示されるので、許可をクリック
4. 連携完了

### 7.3 カレンダーイベントのテスト

1. 有給休暇または特別休暇を申請
2. Googleカレンダーを確認
3. イベントが作成されていることを確認

## トラブルシューティング

### エラー: "redirect_uri_mismatch"

- OAuth 2.0クライアントIDの「承認済みのリダイレクトURI」を確認
- URLが完全に一致しているか確認（末尾のスラッシュも含む）

### エラー: "access_denied"

- OAuth同意画面のテストユーザーに追加されているか確認
- スコープが正しく設定されているか確認

### トークンの有効期限切れ

- リフレッシュトークンを使用して自動更新される仕組みを実装済み
- エラーが発生した場合は、再度Googleアカウント連携を実行

## セキュリティに関する注意事項

1. **クライアントシークレットの管理**
   - `.env.local`ファイルは`.gitignore`に追加済み
   - 本番環境では環境変数として安全に管理

2. **アクセストークンの保存**
   - データベースに保存される際は暗号化を推奨
   - 現在は平文で保存（将来的に暗号化を検討）

3. **スコープの最小化**
   - 必要最小限のスコープ（`calendar.events`）のみを使用
   - カレンダー全体へのアクセスは不要

## 参考リンク

- [Google Calendar API ドキュメント](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 認証](https://developers.google.com/identity/protocols/oauth2)
- [googleapis Node.js クライアント](https://github.com/googleapis/google-api-nodejs-client)
