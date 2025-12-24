# 並行アクセス処理

## 概要

勤怠管理システムは、複数のスタッフが同時にアクセスしても正確で一貫性のあるデータを保証します。

## 実装されている並行アクセス対策

### 1. データベースレベルの制約

#### ユニーク制約
```sql
CONSTRAINT unique_staff_date UNIQUE(staff_id, date)
```

- 同じスタッフが同じ日に複数の勤怠記録を作成できないようにする
- データベースレベルで強制されるため、アプリケーション層のバグがあっても保護される

#### トランザクション分離
- PostgreSQL（Supabase）のデフォルトトランザクション分離レベル（Read Committed）を使用
- 各操作は独立したトランザクションとして実行される

### 2. アプリケーションレベルの処理

#### 独立したリクエスト処理
```typescript
// 各APIエンドポイントは独立して処理される
POST /api/attendance/clock-in  // スタッフAの出勤
POST /api/attendance/clock-in  // スタッフBの出勤（並行実行可能）
```

#### エラーハンドリング
```typescript
try {
  // データベース操作
  const { data, error } = await supabase.from('attendance_records').insert(...);
  
  if (error) {
    // 制約違反の場合
    if (error.code === '23505') {
      throw new DuplicateError('本日は既に出勤済みです');
    }
    throw new DatabaseError('出勤記録の作成に失敗しました');
  }
} catch (error) {
  // エラーは自動的にロールバックされる
  return errorResponse;
}
```

### 3. Row Level Security (RLS)

```sql
-- スタッフは自分のデータのみアクセス可能
CREATE POLICY "スタッフは自分の勤怠記録を読み取れる" ON attendance_records
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE email = auth.jwt() ->> 'email'
    )
  );
```

- 各スタッフは自分のデータのみアクセス可能
- 他のスタッフのデータへの不正アクセスを防止

## 並行アクセスのシナリオ

### シナリオ1: 複数のスタッフが同時に出勤
✅ **正常に動作**
- スタッフAとスタッフBが同時に出勤ボタンをクリック
- 両方の記録が独立して作成される
- データの整合性が保たれる

### シナリオ2: 同じスタッフが短時間に2回出勤ボタンをクリック
✅ **正常に動作**
- 1回目: 記録が作成される
- 2回目: ユニーク制約違反でエラー
- ユーザーに「本日は既に出勤済みです」と表示

### シナリオ3: 出勤と退勤が同時に実行される
✅ **正常に動作**
- 出勤: 新しい記録を作成
- 退勤: 既存の記録を更新
- 異なる操作なので競合しない

### シナリオ4: データベース接続エラー
✅ **正常に動作**
- エラーが発生した場合、トランザクションは自動的にロールバック
- 不完全なデータは作成されない
- ユーザーにエラーメッセージを表示

## テスト方法

### 手動テスト
1. 複数のブラウザウィンドウで異なるスタッフとしてログイン
2. 同時に出勤ボタンをクリック
3. すべての記録が正しく作成されることを確認

### 自動テスト
```typescript
// 並行リクエストのテスト例
const promises = [
  fetch('/api/attendance/clock-in', { method: 'POST' }),
  fetch('/api/attendance/clock-in', { method: 'POST' }),
];

const results = await Promise.all(promises);
// 1つは成功、1つはエラーになることを確認
```

## パフォーマンス考慮事項

### 接続プール
- Supabaseは自動的に接続プールを管理
- 数十人規模のアクセスに最適化

### インデックス
```sql
CREATE INDEX idx_attendance_staff_date ON attendance_records(staff_id, date DESC);
```
- 頻繁に使用されるクエリを高速化
- 並行アクセス時のロック競合を最小化

## まとめ

- データベースレベルの制約により、データの整合性が保証される
- アプリケーションレベルのエラーハンドリングにより、適切なユーザーフィードバックが提供される
- RLSにより、セキュリティが確保される
- 数十人規模の並行アクセスに対応可能
