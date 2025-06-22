# フレーキーテスト完全解消計画 - 全ファイル beforeEach 統一プロジェクト

## 🎯 目標
全36の統合テストファイルを業界標準の `beforeEach` のみパターンに統一し、フレーキーテスト完全解消とパフォーマンス向上を実現する。

## 📊 現状分析結果

### パターン分類
1. **beforeEach + afterEach 両方** (6ファイル)
   - 削除系: `books/delete-book.integration.spec.ts`, `book-authors/remove-author-from-book.integration.spec.ts`
   - 非削除系: `book-authors/manage-book-authors.integration.spec.ts`, `deadlines/create-deadlines.integration.spec.ts`, `book-authors/add-author-to-book.integration.spec.ts`, `deadlines/deadlines-list.integration.spec.ts`

2. **afterEachのみ** (25ファイル)
   - `authors/delete-author.integration.spec.ts` 等25ファイル

3. **afterEachのimportのみ（未使用）** (9ファイル)
   - `submissions/update-submission.integration.spec.ts`
   - `deadlines/update-deadline.integration.spec.ts`
   - `deadlines/new-deadline-form.integration.spec.ts`
   - `printing-companies/show-printing-company.integration.spec.ts`
   - `printing-companies/update-printing-company.integration.spec.ts`
   - `book-authors/list-book-authors.integration.spec.ts`
   - 等（import文だけでコードなし）

4. **afterEach使用なし** (残りファイル)

### テスト状況
- **総ファイル数**: 36ファイル
- **現在のテスト結果**: 238/238全成功
- **フレーキーテスト**: 現在発生なし（潜在的リスクあり）

## 🚀 実装計画

### Phase 1: 不要import削除（リスク: 最低）
**対象**: afterEachのimportのみで実際の使用なしファイル（9ファイル）
- `afterEach` のimport文削除のみ
- **リスク**: なし（未使用コード削除）
- **所要時間**: 15分

### Phase 2: afterEachのみファイルをbeforeEachに移行（リスク: 低）
**対象**: `authors/delete-author.integration.spec.ts` 等25ファイル
- `afterEach(cleanupDatabase)` → `beforeEach(cleanupDatabase)` に変更
- **利点**: 各テスト開始時に確実にクリーンな状態
- **リスク**: 低（業界標準パターンへの移行）
- **所要時間**: 30分

### Phase 3: beforeEach+afterEach両方ファイルの統一（リスク: 中）
**対象**: 6ファイル
- `afterEach(cleanupDatabase)` を削除
- `beforeEach(cleanupDatabase)` は保持
- **特別考慮**: 削除系テストでも beforeEach のみで十分（他テストファイルの影響除去が主目的）
- **所要時間**: 20分

## ⚡ 段階的実行戦略

### Step 1: 低リスクファイルから開始
1. **9ファイルの不要import削除** → テスト実行 → 確認
2. **5ファイルずつafterEachのみファイル変更** → テスト実行 → 確認  
3. **残り25ファイル完了** → テスト実行 → 確認

### Step 2: 両方パターンファイル変更
1. **非削除系4ファイル変更** → テスト実行 → 確認
2. **削除系2ファイル変更** → テスト実行 → 確認

### Step 3: 最終検証
- **全238テスト実行** → 成功確認
- **5-10回連続実行** → フレーキーテスト解消確認
- **パフォーマンス測定** → 実行時間短縮確認

## 🔄 各段階での判断基準

### 成功基準
- **各ファイル**: 該当テストが100%パス
- **フレーキーテスト**: 連続実行で403エラー0回
- **全体**: 238/238テスト成功

### 失敗時の対応
- **段階1失敗**: 他の方法を検討
- **段階2失敗**: 該当ファイルのみ元に戻して次へ
- **段階3失敗**: 前段階まで戻って原因調査

## 🎉 期待される効果

### 即座の効果
- **フレーキーテスト完全解消**: 二重クリーンアップ競合状態解消
- **パフォーマンス向上**: 不要なafterEach処理削除
- **コード統一**: 全36ファイルで一貫したクリーンアップパターン

### 長期的効果  
- **デバッグ性向上**: テスト失敗時にデータ残留で状態確認可能
- **保守性向上**: 統一されたパターンで新規テスト作成が容易
- **業界標準準拠**: Ruby DatabaseCleaner、Jest、pytest等と同じパターン

## ⚡ 利点
- **リスク最小化**: 1ファイルずつなので問題を局所化
- **早期発見**: 各段階で問題を即座に特定可能
- **段階的検証**: 効果を段階的に確認できる
- **ロールバック容易**: 問題があれば該当ファイルのみ戻せる

## 📊 予想所要時間
- **Phase 1**: 15分（import削除のみ）
- **Phase 2**: 30分（25ファイル × 1分 + テスト確認）
- **Phase 3**: 20分（6ファイル + 最終検証）
- **合計**: 約65分

## 🔒 安全対策
- **1ファイルずつ変更**して段階的にテスト実行
- **各段階でロールバック可能**な設計
- **テスト成功確認**してから次段階進行
- **最終的に238/238テスト成功**確認

## 🔍 背景情報

### 修正方針の根拠
- **業界標準**: Ruby DatabaseCleaner、Jest、pytest等でbeforeEachのみが推奨
- **二重クリーンアップ**: 現在はbeforeEach + afterEachで冗長
- **タイミング問題**: afterEachでの不要な処理が競合状態を引き起こす可能性

### 技術的背景
- vitestは `singleFork: true` で順次実行のため並行実行は原因ではない
- 各テスト開始時のクリーンアップが最も確実で安全
- テスト後のクリーンアップは基本的に不要（次のテストが開始時にクリーンアップするため）

## 📝 実行ログ
- [ ] Phase 1: 不要import削除（9ファイル）
- [ ] Phase 2: afterEachのみファイル変更（25ファイル）
- [ ] Phase 3: 両方パターンファイル変更（6ファイル）
- [ ] 最終検証: 238/238テスト成功確認
- [ ] パフォーマンス測定・ドキュメント更新

この計画により、フレーキーテスト問題を根本解決し、業界標準に準拠した安定したテストスイートを実現できます。