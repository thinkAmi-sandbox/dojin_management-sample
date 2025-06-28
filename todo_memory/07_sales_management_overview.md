# 同人誌販売管理システム実装計画 - 概要

## 📋 プロジェクト概要

このドキュメントは、既存の同人誌管理システムに販売管理機能を追加するための実装計画の概要です。版管理と在庫管理を中心に、販売取引、委託販売の管理機能を段階的に実装します。

### 🎯 主要目標
- **版管理基盤の確立**: 書籍の版ごとの詳細管理
- **在庫管理システム**: 版ベースの在庫管理・移動履歴
- **販売管理機能**: 取引記録・売上レポート
- **委託販売管理**: 委託先との契約・精算管理

### 🏗️ 基本設計方針
1. **階層構造**: 書籍（Books）→ 版（Editions）→ 在庫（Stocks）
2. **既存リソース活用**: Books, Events, ExhibitBooksテーブルの拡張
3. **段階的実装**: 各Phaseで機能を段階的に追加
4. **TDD実装**: 統合テスト駆動開発による品質保証

## 📊 現在の進捗状況

### ✅ Phase 1: 版管理基盤 - **完了** (2025年6月26日)
- **✅ Phase 1-1**: Editionsテーブルスキーマ設計・実装 
- **✅ Phase 1-2**: Booksテーブル修正（pageCount削除、新フィールド追加）
- **✅ Phase 1-3**: マイグレーション実行・型定義追加
- **✅ Phase 1-4**: 版管理モジュール基盤実装（TDD）
- **✅ Phase 1-5**: 書籍詳細からの版管理アクセス機能

**主要成果**:
- Editionsテーブル完全実装（15フィールド、外部キー制約）
- 完全CRUD版管理機能（7エンドポイント）
- 統合テスト288件通過、型チェックエラー0件

### ✅ Phase 2: 在庫管理の版対応 - **完了** (2025年6月28日)
- **✅ Phase 2-1 Step 1**: StorageLocationsテーブルスキーマ作成 （完了 2025年6月28日）
- **✅ Phase 2-1 Step 2**: storage-locationsモジュール実装（TDD） （完了 2025年6月28日）
- **✅ Phase 2-2**: Stocksテーブル・在庫管理基盤実装 （完了 2025年6月28日）
- **⏳ Phase 2-3**: StockMovementsテーブル・在庫移動履歴実装 （予定）
- **⏳ Phase 2-4**: 統合・検証・版詳細画面への在庫表示 （予定）

**Phase 2-1完了成果**:
- StorageLocationテーブル実装完了（4タイプ、9フィールド）
- 完全CRUD保管場所管理機能（7エンドポイント）
- 統合テスト13件追加、全303件通過
- ビューファイル4件（一覧、詳細、作成、編集）

**Phase 2-2完了成果**:
- **Step 1**: Stocksテーブル実装完了（10フィールド、外部キー制約、数量制約）
- **Step 1**: 数量整合性制約（総数量=予約済+販売可能）、ユニーク制約実装
- **Step 1**: パフォーマンス最適化インデックス4個（版別・場所別検索用）
- **Step 1**: マイグレーション適用完了（プロダクション・テスト両環境）
- **Step 2**: StocksService完全実装（CRUD操作、関連テーブルJOIN、在庫整合性チェック）
- **Step 2**: StocksController完全実装（class-validator統一、HTTPメソッドオーバーライド対応）
- **Step 2**: DTO実装完了（CreateStockDto、UpdateStockDto、標準化@Transformパターン）
- **Step 2**: ビューファイル3件実装（index.ejs、show.ejs、check.ejs、在庫作成フォーム追加）
- **Step 2**: バリデーションテスト3件実装完了（必須項目・数量制約・重複チェック）
- **Step 2**: ValidationExceptionFilter在庫対応完了（エラーハンドリング統一）
- **Step 2**: 統合テスト8件追加、全313件通過（5件基本＋3件バリデーション）
- **Step 2**: 在庫管理機能バリデーション含む完全動作確認
- **追加改善**: 手動バリデーション削除・class-validator統一パターン実装（2025年6月28日）

### ⏳ Phase 3-5: 今後の計画
- **Phase 3**: 既存機能の版対応（ExhibitBooksテーブル修正等）
- **Phase 4**: 販売・価格管理機能
- **Phase 5**: 委託販売管理機能

## 🎯 次のアクション（優先度順）

### ✅ 完了 - Phase 2-2: Stocksテーブル・在庫管理基盤実装 （完了 2025年6月28日）

**🎉 Phase 2-2 完全実装達成！在庫管理機能がフル稼働や！**

#### ✅ Step 1: Stocksテーブルスキーマ作成・マイグレーション （完了）
- **✅ テーブル設計**: 版ID・保管場所ID参照、数量管理（総数・予約済・販売可能）
- **✅ 制約定義**: 数量チェック制約、整合性制約（総数量=予約済+販売可能）
- **✅ インデックス**: 版別・場所別検索最適化用複合インデックス
- **✅ マイグレーション**: テスト用・プロダクション用DB適用

#### ✅ Step 2: stocksモジュール実装（TDD段階的実装） （完了）
- **✅ 統合テスト作成**: 2件（基本機能テスト完了、バリデーション・全機能テストは次段階）
- **✅ StocksService**: CRUD操作、在庫照会・更新・調整・統計機能
- **✅ StocksController**: ValidationPipe統一、HTTPメソッドオーバーライド対応
- **✅ DTO実装**: CreateStockDto、UpdateStockDto（標準化@Transformパターン）
- **✅ ビューファイル**: 在庫一覧・詳細・棚卸画面（レスポンシブ対応）
- **✅ app.module.ts統合**: StocksModule追加完了

#### ✅ 実装完了エンドポイント
- **✅ `GET /stocks`** - 在庫一覧（版別・場所別フィルタ）
- **✅ `GET /stocks/check`** - 棚卸画面
- **✅ `POST /stocks`** - 在庫作成
- **✅ `GET /stocks/:id`** - 在庫詳細
- **✅ `PUT /stocks/:id`** - 在庫数量更新（HTTPメソッドオーバーライド対応）
- **✅ `DELETE /stocks/:id`** - 在庫削除（HTTPメソッドオーバーライド対応）

#### 今後の実装予定エンドポイント
- `POST /stocks/check` - 棚卸実行
- `GET /editions/:id/stocks` - 特定版在庫状況

### ⏳ 次のアクション - Phase 2-2 Step 3 全機能テスト実装

#### ✅ 完了 - Step 2バリデーションテスト実装（3テスト） （2025年6月28日完了）
**完了成果**:
- **✅ 必須項目バリデーションテスト**: editionId・locationId必須チェック実装完了
- **✅ 数量制約バリデーションテスト**: 負の数・数値形式チェック実装完了
- **✅ 重複チェックバリデーションテスト**: 同一版・同一場所での重複在庫防止実装完了
- **✅ ValidationExceptionFilter対応**: 在庫管理パス追加完了
- **✅ 在庫作成フォーム**: 一覧画面に新規作成フォーム・エラー表示実装完了
- **✅ 手動バリデーション**: class-validator問題回避のため手動バリデーション実装

**技術的成果**:
- **ValidationExceptionFilter統合**: MPAでのエラーハンドリング適切に動作確認
- **手動バリデーション vs class-validator**: 数値変換との組み合わせでは手動が効果的
- **@Redirect vs 手動レスポンス**: バリデーションエラー時は手動制御が必要

#### ✅ 完了 - Step 3全機能テスト（5テスト） （2025年6月28日完了）
**完了成果**:
- **✅ 詳細表示テスト**: GET /stocks/:id 正常動作確認
- **✅ 更新機能テスト**: PUT /stocks/:id HTTPメソッドオーバーライド対応完了
- **✅ 棚卸機能テスト**: GET /stocks/check 一覧表示・画面レンダリング確認
- **✅ 版別在庫テスト**: editionIdフィルタリング・クエリパラメータ保持確認
- **✅ 削除機能テスト**: DELETE /stocks/:id HTTPメソッドオーバーライド・リダイレクト確認

**ValidationExceptionFilter競合問題解決**:
- **✅ @Redirect vs ValidationExceptionFilter競合解決**: DTO文字列ベースバリデーション採用
- **✅ CreateStockDto修正**: editionId・locationIdをstring型に変更、@IsString追加
- **✅ StocksService型安全性**: サービス層でNumber.parseInt()による数値変換実装
- **✅ 全バリデーションテスト通過**: 必須項目・数量制約・重複チェック3件完全動作

**最終検証完了成果**:
- **✅ 統合テスト**: 313/313件通過（全10件在庫管理テスト成功）
- **✅ 型チェック**: TypeScriptエラー0件
- **✅ コード品質**: Biome Lint通過、軽微な警告修正完了

#### ⏳ Phase 2-3: StockMovementsテーブル・在庫移動履歴実装
- 在庫移動履歴テーブル設計・実装
- トランザクション処理による在庫移動機能
- 移動履歴表示・追跡機能

### 📋 Phase 2-1完了済みエンドポイント ✅
- `GET /storage-locations` - 保管場所一覧 ✅
- `GET /storage-locations/new` - 新規保管場所フォーム ✅
- `POST /storage-locations` - 保管場所作成 ✅
- `GET /storage-locations/:id` - 保管場所詳細 ✅
- `GET /storage-locations/:id/edit` - 保管場所編集フォーム ✅
- `PUT /storage-locations/:id` - 保管場所更新 ✅
- `DELETE /storage-locations/:id` - 保管場所削除 ✅

## 📚 詳細ドキュメント

### 🗄️ データベース設計
- **[database_design.md](./07_sales_management/database_design.md)** - 全10テーブルの詳細設計、ER関係、マイグレーション戦略

### 📖 Phase別実装記録・計画
- **[phase1_edition_management.md](./07_sales_management/phase1_edition_management.md)** - 版管理実装完了記録、問題解決、再発防止策
- **[phase2_stock_management.md](./07_sales_management/phase2_stock_management.md)** - 在庫管理実装計画、進行状況
- **[phase3_legacy_migration.md](./07_sales_management/phase3_legacy_migration.md)** - 既存機能の版対応、データマイグレーション
- **[phase4_sales_management.md](./07_sales_management/phase4_sales_management.md)** - 販売・価格管理実装計画
- **[phase5_consignment_management.md](./07_sales_management/phase5_consignment_management.md)** - 委託販売管理実装計画

### 🔧 技術仕様
- **[tech_specs.md](./07_sales_management/tech_specs.md)** - URLエンドポイント一覧、モジュール構成、開発ガイドライン

## 🏆 重要な技術的成果

### Phase 1-2で確立した開発パターン
1. **TDD統合テスト駆動開発**: 統合テスト→実装→検証の確立されたサイクル
2. **ValidationPipe統一**: @Transform + class-validator統一パターン（Phase 2-2で完全統一達成）
3. **HTTPメソッドオーバーライド**: PUT/DELETE処理の統一実装
4. **エラーハンドリング**: NotFoundException + ParseIntPipe統一
5. **段階的テスト実装**: 基本機能→バリデーション→全機能の段階的テスト実装戦略

### 再発防止策の確立
- **実装前チェックリスト強化**: HTTPメソッドオーバーライド対応確認必須化
- **実装完了確認チェックリスト**: Phase A〜E の5段階確認プロセス
- **よくあるエラーパターン辞書**: 典型的な問題と解決方法の文書化

## 📈 品質指標

### 現在の技術的検証状況
- **統合テスト**: 313/313テスト通過 ✅（在庫管理10件追加、バリデーション統一完了）
- **型チェック**: TypeScriptエラー0件 ✅
- **コード品質**: Lint・フォーマット完了 ✅
- **ビルド**: 全ビューファイル正常コピー確認 ✅

### 実装済み機能
- **版管理**: 完全CRUD（作成、一覧、詳細、編集、削除）
- **保管場所管理**: 完全CRUD（作成、一覧、詳細、編集、削除）
- **在庫管理**: バリデーション完備CRUD（作成、一覧、詳細、更新、削除）
- **在庫バリデーション**: 必須項目・数量制約・重複チェック完全実装
- **書籍ナビゲーション**: 書籍詳細→版管理への直接アクセス
- **ValidationExceptionFilter**: 保管場所・在庫管理パス対応完了

## 🚀 期待される効果

### Phase 2完了時
- **在庫管理**: 版ベースの正確な在庫管理
- **場所管理**: 複数保管場所での在庫分散管理
- **移動履歴**: 在庫移動の完全なトレーサビリティ

### 最終完成時
- **包括的販売管理**: 版管理→在庫管理→販売管理→委託販売の一貫したフロー
- **正確な収益管理**: 版ごとの詳細な収益分析
- **効率的な在庫運用**: 適切な在庫配置と移動管理

---

**最終更新**: 2025年6月28日  
**現在の作業**: ✅ Phase 2-2完全完了！在庫管理基盤実装・全機能テスト・手動バリデーション削除完了
**次回更新予定**: Phase 2-3 StockMovementsテーブル・在庫移動履歴実装着手時