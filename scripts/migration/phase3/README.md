# Phase 3-2: データマイグレーション手順

## 概要

このディレクトリには、Phase 3-2のデータマイグレーションスクリプトが含まれています。
既存の書籍データを版ベース管理に移行するためのSQLスクリプトです。

## ファイル構成

- `01_create_initial_editions.sql` - 初版Editionレコードの生成
- `02_migrate_exhibit_books.sql` - ExhibitBookの版対応マイグレーション
- `03_verify_data_integrity.sql` - データ整合性確認クエリ
- `run_migration.sh` - 本番環境用実行スクリプト
- `run_migration_test.sh` - テスト環境用実行スクリプト

## 実行手順

### 1. テスト環境での検証

#### 方法1: シェルスクリプトを使用（psqlコマンドが必要）

```bash
cd scripts/migration/phase3
./run_migration_test.sh
```

#### 方法2: Drizzle Studioを使用（推奨）

```bash
# Drizzle Studioを起動
pnpm drizzle:studio

# ブラウザで http://localhost:4983 を開く
# SQLコンソールで各SQLファイルの内容を順番に実行
```

### 2. 統合テストの実行

マイグレーション後、アプリケーションのテストを実行して動作確認：

```bash
pnpm test:integration
```

### 3. 本番環境での実行

テスト環境で問題がないことを確認後：

```bash
cd scripts/migration/phase3
./run_migration.sh
```

## マイグレーション内容

### 1. 初版Editionレコードの生成

- 既存のBookレコードごとに「初版」のEditionレコードを作成
- バージョン番号は1で統一
- 価格は最新のSubmissionデータから取得

### 2. ExhibitBookの版対応

- ExhibitBookのeditionIdフィールドに初版のIDを設定
- bookIdは移行期間中は保持（後で削除予定）

### 3. データ整合性確認

以下の項目を確認：
- 初版が存在しないBookがないか
- editionIdが設定されていないExhibitBookがないか
- bookIdとeditionIdの整合性
- 数量計算の整合性

## ロールバック手順

問題が発生した場合、バックアップからリストアできます：

```bash
# バックアップファイルの場所を確認
ls -la ./backups/

# リストア実行
psql -h localhost -p 15432 -U dojin_user -d dojin_management < ./backups/backup_before_phase3_migration_[timestamp].sql
```

## 注意事項

1. **必ずバックアップを取得**してから実行してください
2. **テスト環境で検証**してから本番環境で実行してください
3. マイグレーション実行中はアプリケーションを停止することを推奨
4. 大量データの場合は実行時間がかかる可能性があります

## トラブルシューティング

### エラー: "Edition already exists"

すでに一部のBookにEditionが存在する場合に発生します。
`01_create_initial_editions.sql`はこのケースを考慮しているため、通常は問題ありません。

### エラー: "Foreign key violation"

ExhibitBookが参照しているBookが存在しない場合に発生します。
データの整合性を確認してください。

### 移行後の確認

```sql
-- 移行状況の確認
SELECT 
  COUNT(*) as total_books,
  COUNT(DISTINCT e."bookId") as books_with_edition
FROM "Book" b
LEFT JOIN "Edition" e ON b.id = e."bookId";

-- ExhibitBookの移行状況
SELECT 
  COUNT(*) as total,
  COUNT("editionId") as migrated,
  COUNT(CASE WHEN "editionId" IS NULL THEN 1 END) as not_migrated
FROM "ExhibitBook";
```