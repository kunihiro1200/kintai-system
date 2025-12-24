# デプロイガイド

## 概要

このドキュメントでは、勤怠管理システムをVercelにデプロイする手順を説明します。

## 前提条件

- GitHubアカウント
- Vercelアカウント
- Supabaseプロジェクト（既に作成済み）

## デプロイ手順

### 1. GitHubリポジトリの作成と連携

#### リポジトリの初期化
```bash
# Gitリポジトリを初期化
git init

# .gitignoreが正しく設定されていることを確認
# （.env.local、node_modules、.nextなどが除外されている）

# 初回コミット
git add .
git commit -m "Initial commit: 勤怠管理システム"
```

#### GitHubリポジトリの作成
1. GitHubにログイン
2. 新しいリポジトリを作成
3. リポジトリ名: `attendance-tracking` (任意)
4. プライベートまたはパブリックを選択

#### リモートリポジトリの追加とプッシュ
```bash
# リモートリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/attendance-tracking.git

# プッシュ
git branch -M main
git push -u origin main
```

### 2. Vercelプロジェクトの作成

#### Vercelにログイン
1. https://vercel.com/ にアクセス
2. GitHubアカウントでログイン

#### プロジェクトのインポート
1. 「Add New...」→「Project」をクリック
2. GitHubリポジトリから `attendance-tracking` を選択
3. 「Import」をクリック

#### プロジェクト設定
- **Framework Preset**: Next.js（自動検出）
- **Root Directory**: `./`（デフォルト）
- **Build Command**: `npm run build`（デフォルト）
- **Output Directory**: `.next`（デフォルト）

### 3. 環境変数の設定

Vercelのプロジェクト設定で環境変数を追加します。

#### 設定方法
1. Vercelプロジェクトの「Settings」タブを開く
2. 「Environment Variables」セクションに移動
3. 以下の環境変数を追加:

```
NEXT_PUBLIC_SUPABASE_URL=https://krxhrbtlgfjzsseegaqq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### 環境の選択
- **Production**: 本番環境用
- **Preview**: プレビュー環境用（プルリクエスト）
- **Development**: 開発環境用

すべての環境にチェックを入れることを推奨します。

### 4. デプロイの実行

#### 初回デプロイ
1. 環境変数を設定後、「Deploy」ボタンをクリック
2. ビルドとデプロイが自動的に開始される
3. 完了すると、デプロイURLが表示される

#### 自動デプロイ
- `main`ブランチへのプッシュで自動的に本番環境にデプロイ
- プルリクエストで自動的にプレビュー環境を作成

### 5. カスタムドメインの設定（オプション）

#### ドメインの追加
1. Vercelプロジェクトの「Settings」→「Domains」を開く
2. 「Add」ボタンをクリック
3. ドメイン名を入力
4. DNSレコードを設定（Vercelが指示を表示）

## デプロイ後の確認

### 1. アプリケーションの動作確認
- デプロイURLにアクセス
- ログイン機能の確認
- 出勤/退勤機能の確認
- 履歴表示の確認

### 2. Google OAuth の設定

#### Supabaseでの設定
1. Supabaseダッシュボードで「Authentication」→「Providers」を開く
2. Googleプロバイダーの設定を開く
3. 「Authorized redirect URIs」に以下を追加:
   ```
   https://krxhrbtlgfjzsseegaqq.supabase.co/auth/v1/callback
   https://your-app.vercel.app/auth/callback
   ```

#### Google Cloud Consoleでの設定
1. Google Cloud Consoleにアクセス
2. OAuth 2.0 クライアントIDの設定を開く
3. 「承認済みのリダイレクトURI」に以下を追加:
   ```
   https://krxhrbtlgfjzsseegaqq.supabase.co/auth/v1/callback
   ```

### 3. スタッフデータの登録

本番環境のSupabaseで、スタッフデータを登録します:

```sql
INSERT INTO staffs (email, name) VALUES
  ('staff1@example.com', 'スタッフ1'),
  ('staff2@example.com', 'スタッフ2');
```

## トラブルシューティング

### ビルドエラー
- 環境変数が正しく設定されているか確認
- `npm run build` をローカルで実行してエラーを確認

### 認証エラー
- Supabaseの環境変数が正しいか確認
- Google OAuthのリダイレクトURIが正しく設定されているか確認

### データベース接続エラー
- SupabaseのURLとキーが正しいか確認
- Supabaseプロジェクトが稼働しているか確認

## 継続的デプロイ

### ワークフロー
1. ローカルで開発
2. 変更をコミット
3. GitHubにプッシュ
4. Vercelが自動的にデプロイ
5. デプロイ完了の通知を受け取る

### ロールバック
問題が発生した場合、Vercelのダッシュボードから以前のデプロイに簡単にロールバックできます。

## セキュリティ

- 環境変数は絶対にGitにコミットしない
- `.env.local`は`.gitignore`に含まれている
- Supabase Anon Keyは公開されても安全（RLSで保護）
- Service Role Keyは使用していない（必要な場合は環境変数で管理）

## モニタリング

### Vercel Analytics
- Vercelダッシュボードでアクセス統計を確認
- パフォーマンスメトリクスを監視

### Supabase Logs
- Supabaseダッシュボードでデータベースログを確認
- エラーやパフォーマンスの問題を監視

## まとめ

このガイドに従うことで、勤怠管理システムを簡単にVercelにデプロイできます。自動デプロイにより、開発から本番環境への反映がスムーズに行えます。
