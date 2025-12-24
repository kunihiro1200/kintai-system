# 休暇機能の追加

## 概要

有給休暇、半休、代休、休日出勤を記録する機能を追加しました。

## 機能

### 1. 休暇タイプ

- **有給休暇**: 1日単位でカウント
- **半休**: 0.5日単位でカウント
- **代休**: 1日単位でカウント
- **休日出勤**: 1日単位でカウント

### 2. メイン画面

- 休暇サマリー表示（有給休暇、代休、休日出勤の累計）
- 4つの休暇ボタン（有給休暇、半休、代休、休日出勤）
- 休暇記録時は通常の出退勤ボタンが無効化

### 3. 履歴画面

- 休暇記録は色分けして表示
- 休暇タイプのラベル表示
- 休暇記録は修正不可

## データベースマイグレーション

新しい機能を使用するには、データベースマイグレーションを実行する必要があります。

### Supabase CLIを使用する場合

```bash
# マイグレーションを実行
supabase db push

# または、特定のマイグレーションファイルを実行
supabase migration up
```

### Supabase Dashboardを使用する場合

1. Supabase Dashboardにログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. `supabase/migrations/003_add_leave_types.sql`の内容をコピー
5. SQLエディタに貼り付けて実行

### マイグレーション内容

**マイグレーション 003: 休暇タイプの追加**
```sql
-- 休暇タイプのENUM型を作成
CREATE TYPE leave_type AS ENUM (
  'normal',           -- 通常勤務
  'paid_leave',       -- 有給休暇
  'half_leave',       -- 半休
  'compensatory_leave', -- 代休
  'holiday_work'      -- 休日出勤
);

-- attendance_recordsテーブルに新しいカラムを追加
ALTER TABLE attendance_records
  ADD COLUMN leave_type leave_type DEFAULT 'normal' NOT NULL;

-- 休暇タイプの場合、clock_inとclock_outはNULLを許可
ALTER TABLE attendance_records
  ALTER COLUMN clock_in DROP NOT NULL;

-- チェック制約を追加
ALTER TABLE attendance_records
  ADD CONSTRAINT check_clock_in_required 
  CHECK (
    (leave_type = 'normal' AND clock_in IS NOT NULL) OR
    (leave_type != 'normal' AND clock_in IS NULL)
  );

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_attendance_leave_type ON attendance_records(leave_type);
```

**マイグレーション 004: 半休時間帯の追加**
```sql
-- 半休タイプのENUM型を作成
CREATE TYPE half_leave_period AS ENUM (
  'morning',    -- 午前半休
  'afternoon'   -- 午後半休
);

-- attendance_recordsテーブルに半休時間帯カラムを追加
ALTER TABLE attendance_records
  ADD COLUMN half_leave_period half_leave_period;

-- 半休の場合は時間帯が必須というチェック制約を追加
ALTER TABLE attendance_records
  ADD CONSTRAINT check_half_leave_period 
  CHECK (
    (leave_type = 'half_leave' AND half_leave_period IS NOT NULL) OR
    (leave_type != 'half_leave' AND half_leave_period IS NULL)
  );
```

## 使い方

### 休暇を記録する

1. メイン画面を開く
2. 「休暇・休日出勤の記録」セクションで該当するボタンをクリック
3. モーダルが開くので、日付を選択
   - デフォルトは今日の日付
   - 過去や未来の日付も選択可能
4. 半休の場合は、時間帯（午前/午後）を選択
5. 「保存」ボタンをクリック
6. 成功メッセージが表示される
7. 休暇サマリーが自動更新される

### 休暇サマリーを確認する

メイン画面の「休暇・休日出勤サマリー」セクションに以下が表示されます：

- 有給休暇日数（有給休暇 + 半休×0.5）
- 代休日数
- 休日出勤日数

### 履歴を確認する

1. 「勤怠履歴を見る」をクリック
2. 休暇記録は色分けされて表示される
   - 有給休暇: 緑色
   - 半休: 水色
   - 代休: グレー
   - 休日出勤: 赤色

## 注意事項

- 休暇を記録すると、その日は通常の出退勤記録ができません
- 既に出退勤記録がある日は、休暇を記録できません
- 休暇記録は修正できません（必要な場合は管理者に連絡）

## API エンドポイント

### POST /api/attendance/leave

休暇を記録します。

**リクエスト:**
```json
{
  "leaveType": "paid_leave" | "half_leave" | "compensatory_leave" | "holiday_work",
  "date": "2024-01-01",  // オプション、デフォルトは今日
  "halfLeavePeriod": "morning" | "afternoon"  // 半休の場合は必須
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "staff_id": "uuid",
    "date": "2024-01-01",
    "leave_type": "paid_leave",
    ...
  }
}
```

### GET /api/attendance/leave-summary

休暇サマリーを取得します。

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "paid_leave_count": 5.5,
    "compensatory_leave_count": 2,
    "holiday_work_count": 1
  }
}
```
