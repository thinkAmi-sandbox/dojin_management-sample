# フレーキーテスト修正計画 - afterEach削除による二重クリーンアップ解消

## 🎯 段階的アプローチ
**1ファイルずつ修正→テスト→確認のサイクルで進行**

## 📋 作業手順

### Phase 1: 問題ファイルの修正・検証
**対象**: `test/integration/book-authors/add-author-to-book.integration.spec.ts`

1. **修正作業**
   - 74行目の `afterEach` ブロック削除
   - beforeEachのクリーンアップは維持

2. **単体テスト実行**
   ```bash
   pnpm test:integration test/integration/book-authors/add-author-to-book.integration.spec.ts
   ```

3. **フレーキーテスト検証**
   - 同じテストファイルを5-10回連続実行
   - 403エラーが発生しないことを確認

4. **結果評価**
   - ✅ 成功 → Phase 2へ進行
   - ❌ 失敗 → 他の原因調査が必要

### Phase 2: 他の統合テストファイルの確認・修正
**手順**: 1ファイルずつ段階的に処理

1. **パターン検索**
   - afterEach + cleanupDatabase のパターンを持つファイル特定

2. **ファイル別処理ループ**
   ```
   For each ファイル:
     a. afterEach削除
     b. 該当ファイルの統合テスト実行
     c. パス確認
     d. 次のファイルへ
   ```

3. **各ファイルでの実行コマンド例**
   ```bash
   # 例1
   pnpm test:integration test/integration/books/create-books.integration.spec.ts
   
   # 例2  
   pnpm test:integration test/integration/deadlines/create-deadlines.integration.spec.ts
   ```

### Phase 3: 全体統合確認
**最終確認のみ**

1. **全統合テスト実行**
   ```bash
   pnpm test:integration
   ```

2. **結果確認**
   - 全238テストがパスすることを確認
   - パフォーマンス向上の確認

## 🔄 各段階での判断基準

### 成功基準
- **各ファイル**: 該当テストが100%パス
- **フレーキーテスト**: 連続実行で403エラー0回
- **全体**: 238/238テスト成功

### 失敗時の対応
- **段階1失敗**: 他の方法（方法1-6）を検討
- **段階2失敗**: 該当ファイルのみ元に戻して次へ
- **段階3失敗**: 前段階まで戻って原因調査

## ⚡ 利点
- **リスク最小化**: 1ファイルずつなので問題を局所化
- **早期発見**: 各段階で問題を即座に特定可能
- **段階的検証**: 効果を段階的に確認できる
- **ロールバック容易**: 問題があれば該当ファイルのみ戻せる

## 📊 予想所要時間
- **Phase 1**: 10分（修正2分 + テスト8分）
- **Phase 2**: 20-30分（ファイル数による）
- **Phase 3**: 5分（最終確認）

**合計**: 35-45分

## 🔍 背景情報

### 問題の詳細
- `test/integration/book-authors/add-author-to-book.integration.spec.ts` で時々403エラーが発生
- エラー: `expected 200 "OK", got 403 "Forbidden"` at line 82
- vitestは `singleFork: true` で順次実行のため並行実行は原因ではない

### 修正方針の根拠
- **業界標準**: Ruby DatabaseCleaner、Jest、pytest等でbeforeEachのみが推奨
- **二重クリーンアップ**: 現在はbeforeEach + afterEachで冗長
- **タイミング問題**: afterEachでの不要な処理が競合状態を引き起こす可能性

### 期待される効果
- **フレーキーテスト解消**: 403エラーの根本解決
- **パフォーマンス向上**: 不要なクリーンアップ処理削除
- **デバッグ性向上**: テスト失敗時にデータが残り状態確認可能
- **業界標準準拠**: ベストプラクティスに従った実装

## 📝 実行ログ
- [ ] Phase 1: 問題ファイル修正・検証
- [ ] Phase 2: 他ファイル確認・修正
- [ ] Phase 3: 全体統合確認
- [ ] 完了確認・ドキュメント更新