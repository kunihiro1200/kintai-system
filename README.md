# 勤怠管理システム

スタッフの出退勤時刻を記録し、労働時間と残業時間を自動計算するシステムです。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), TypeScript, React
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth with Google OAuth
- **デプロイ**: Vercel

## 主な機能

### 勤怠管理
- 出勤・退勤時刻の記録
- 労働時間と残業時間の自動計算
- 月曜日と他の曜日で異なる標準労働時間に対応
- 勤怠履歴の閲覧

### 休暇管理
- 有給休暇、特別休暇、半休、代休、休日出勤の記録
- 半休（午前/午後）の記録と特別な残業計算
- 休暇サマリーの表示
- Googleカレンダーへの自動連携

### スタッフ管理
- Googleスプレッドシートからのスタッフ情報同期
- スタッフ一覧の表示
- 管理者のみアクセス可能

### 管理機能
- 全社員の勤怠サマリー表示
- 期間指定での絞り込み
- 休暇日付の詳細表示

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/)にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトの設定から以下の情報を取得:
   - Project URL
   - Anon/Public Key

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. データベースのセットアップ

Supabaseのダッシュボードで、SQL Editorを開き、以下のマイグレーションファイルを順番に実行:

1. `supabase/migrations/001_create_tables.sql` - テーブル作成
2. `supabase/migrations/002_setup_rls.sql` - RLSポリシー設定

### 5. Google OAuth の設定

1. Supabaseダッシュボードで「Authentication」→「Providers」を開く
2. Googleプロバイダーを有効化
3. Google Cloud Consoleで OAuth 2.0 クライアントIDを作成
4. リダイレクトURIを設定: `https://your-project.supabase.co/auth/v1/callback`
5. クライアントIDとシークレットをSupabaseに設定

### 6. スタッフデータの登録

#### 方法1: Googleスプレッドシートから同期（推奨）

1. スプレッドシート（ID: `19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs`）の「スタッフ」シートにスタッフ情報を入力
2. 管理者アカウントでログイン
3. 「スタッフ管理」画面で「スプレッドシートから同期」ボタンをクリック

詳細は [docs/staff-management.md](docs/staff-management.md) を参照してください。

#### 方法2: 直接データベースに登録

Supabaseのダッシュボードで、`staffs`テーブルに初期スタッフデータを登録:

```sql
INSERT INTO staffs (email, name) VALUES
  ('staff1@example.com', 'スタッフ1'),
  ('staff2@example.com', 'スタッフ2');
```


### 7. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開く

## 開発コマンド

- `npm run dev` - 開発サーバーを起動
- `npm run build` - 本番用ビルド
- `npm run start` - 本番サーバーを起動
- `npm run lint` - リント実行

## デプロイ

詳細なデプロイ手順は [docs/deployment.md](docs/deployment.md) を参照してください。

### 簡易手順

1. GitHubリポジトリを作成してコードをプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定（NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY）
4. デプロイ実行

### 自動デプロイ

- `main`ブランチへのプッシュで自動的に本番環境にデプロイ
- プルリクエストで自動的にプレビュー環境を作成

## プロジェクト構造

```
.
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホームページ
│   └── globals.css        # グローバルスタイル
├── lib/                   # ユーティリティとヘルパー
│   └── supabase/          # Supabase設定
│       ├── client.ts      # クライアントサイド
│       └── server.ts      # サーバーサイド
├── supabase/              # Supabaseマイグレーション
│   └── migrations/        # SQLマイグレーションファイル
├── .env.example           # 環境変数のテンプレート
├── next.config.ts         # Next.js設定
├── tsconfig.json          # TypeScript設定
└── package.json           # 依存パッケージ
```

## ドキュメント

- [デプロイ手順](docs/deployment.md) - 本番環境へのデプロイ方法
- [スタッフ管理](docs/staff-management.md) - Googleスプレッドシートからのスタッフ同期
- [休暇機能](docs/leave-feature.md) - 休暇管理機能の詳細
- [Googleカレンダー連携](docs/google-calendar-setup.md) - カレンダー連携の設定方法
- [実装サマリー](docs/implementation-summary.md) - システムの実装詳細
- [並行処理](docs/concurrency.md) - 並行処理の考慮事項

## ライセンス

ISC
