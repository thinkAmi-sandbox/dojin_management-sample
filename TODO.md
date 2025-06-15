# 執筆ステータス変更機能実装 TODO

## 📋 実装計画

### フェーズ1: データベーススキーマ更新
- [x] TODO.mdファイル作成
- [x] `src/db/schema.ts`にstatusカラム追加
- [x] マイグレーションファイル生成（`pnpm drizzle:generate`）
- [x] マイグレーション実行（`pnpm drizzle:migrate`）
- [x] 🔒 スキーマ変更コミット

### フェーズ2: テストファースト開発
- [x] 統合テストコード作成（`test/integration/books/status-update.integration.spec.ts`）
- [x] テスト失敗確認（404エラー：ルーティング未実装）
- [x] ステータス更新DTO作成
- [x] BooksController拡張
  - [x] `renderStatusEditForm()` - GET `/books/:bookId/status/edit`
  - [x] `updateStatus()` - PUT `/books/:bookId/status`
- [x] BooksService拡張
- [x] EJSビューテンプレート作成
- [x] 型チェック（`pnpm type-check`）
- [x] Linter実行（`pnpm format`）
- [x] テスト実行（`pnpm test:integration`）
- [ ] 最終コミット

## 📝 実装メモ

### ステータス種類
- 企画中（planning）- 初期値
- 執筆中（writing）
- 校正中（editing）
- 完成（completed）

### URL設計（docs/01_url.md より）
- `GET /books/:bookId/status/edit` - ステータス変更フォーム
- `PUT /books/:bookId/status` - ステータス更新処理

### 実装注意点
- HTTPメソッドオーバーライドで`_method=PUT`を使用
- バリデーション：有効なステータス値のみ受付
- エラーハンドリング：存在しない書籍ID