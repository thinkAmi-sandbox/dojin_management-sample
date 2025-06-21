# ナビゲーション改善プロジェクト 実装TODO

## プロジェクト概要

直接URL入力に依存している機能を洗い出し、適切なナビゲーションを実装することでユーザビリティを大幅に改善する。
TDD（テスト駆動開発）方式で段階的に実装を進める。

## 問題の詳細分析

### 現在の問題状況

#### 1. グローバルナビゲーション不足
**現状**: `shared/header.ejs` には「ホーム」と「書籍一覧」のみ
**問題**: 以下の主要機能にアクセスできない
- `/authors` - 執筆者一覧
- `/printing-companies` - 印刷所一覧  
- `/submissions` - 入稿一覧
- `/submissions/in-progress` - 進行中入稿一覧
- `/submissions/costs` - 入稿コスト集計

#### 2. 書籍詳細画面からの入稿機能アクセス不足
**現状**: 書籍詳細画面に入稿関連のボタンがない
**問題**: 以下の機能に効率的にアクセスできない
- `/books/:bookId/submissions` - 書籍の入稿履歴
- `/books/:bookId/submissions/new` - 書籍から新規入稿作成

#### 3. 入稿一覧からの高度機能アクセス不足
**現状**: 入稿一覧画面からは基本機能のみ
**問題**: 以下の高度機能にアクセスできない
- `/submissions/in-progress` - 進行中入稿一覧
- `/submissions/costs` - コスト集計画面

## 実装計画

### Phase 1: グローバルナビゲーション拡充

#### ✅ Phase 1-1: 統合テスト作成
- [ ] `test/integration/navigation/global-navigation.integration.spec.ts` 作成
- [ ] 全主要ページでヘッダーナビゲーションをテスト：
  - [ ] 書籍一覧 (`/books`) リンク存在確認
  - [ ] 執筆者一覧 (`/authors`) リンク存在確認
  - [ ] 印刷所一覧 (`/printing-companies`) リンク存在確認
  - [ ] 入稿一覧 (`/submissions`) リンク存在確認
- [ ] **テスト実行して失敗を確認**

#### ✅ Phase 1-2: プロダクションコード実装
- [ ] `shared/header.ejs` のナビゲーション拡張
  - [ ] 主要機能への4つのリンク追加
  - [ ] レスポンシブ対応（768px以下でハンバーガーメニュー）
  - [ ] ホバーエフェクトとアクティブ状態の視覚的フィードバック
  - [ ] アクセシビリティ対応（aria-labelなど）

#### ✅ Phase 1-3: テスト成功確認
- [ ] 統合テスト全通過確認
- [ ] 型チェック（`pnpm type-check`）
- [ ] Linter実行（`pnpm format`）
- [ ] ブラウザでの手動動作確認

### Phase 2: 書籍詳細画面の機能拡充

#### ✅ Phase 2-1: 統合テスト作成
- [ ] `test/integration/books/show-navigation.integration.spec.ts` 作成
- [ ] 書籍詳細画面の入稿関連ボタンテスト：
  - [ ] "入稿履歴" ボタン (`/books/:id/submissions`) 存在確認
  - [ ] "新規入稿" ボタン (`/books/:id/submissions/new`) 存在確認
  - [ ] ボタンクリック時の正しいリダイレクト確認
- [ ] **テスト実行して失敗を確認**

#### ✅ Phase 2-2: プロダクションコード実装
- [ ] `books/show.ejs` に入稿関連ボタン追加
  - [ ] "入稿履歴を見る" ボタン（アイコン付き）
  - [ ] "新規入稿を作成" ボタン（アイコン付き）
  - [ ] 既存のアクションボタンとの統一デザイン
  - [ ] 適切な配置（執筆者管理の後、編集の前）

#### ✅ Phase 2-3: テスト成功確認
- [ ] 統合テスト全通過確認
- [ ] 実際の画面遷移確認
- [ ] UI/UXの一貫性確認

### Phase 3: 入稿一覧画面の高度機能アクセス

#### ✅ Phase 3-1: 統合テスト作成
- [ ] `test/integration/submissions/index-navigation.integration.spec.ts` 作成
- [ ] 入稿一覧画面のサブナビゲーションテスト：
  - [ ] "全て" タブ（現在の一覧）存在確認
  - [ ] "進行中のみ" タブ (`/submissions/in-progress`) 存在確認
  - [ ] "コスト集計" タブ (`/submissions/costs`) 存在確認
  - [ ] タブ切り替え時の正しい遷移確認
- [ ] **テスト実行して失敗を確認**

#### ✅ Phase 3-2: プロダクションコード実装
- [ ] `submissions/index.ejs` にサブナビゲーション追加
  - [ ] タブ形式のナビゲーション実装
  - [ ] 現在のページのアクティブ状態表示
  - [ ] レスポンシブ対応（モバイルでスクロール可能）
  - [ ] 統一されたデザインシステム適用

#### ✅ Phase 3-3: テスト成功確認
- [ ] 統合テスト全通過確認
- [ ] タブ間のスムーズな遷移確認
- [ ] レイアウトの崩れ確認

### Phase 4: 全体統合テスト・最終調整

#### ✅ Phase 4-1: E2Eナビゲーションテスト作成
- [ ] `test/integration/navigation/full-navigation.integration.spec.ts` 作成
- [ ] 全機能への完全なナビゲーションパステスト：
  - [ ] ホーム → 各主要機能への遷移
  - [ ] 書籍詳細 → 入稿機能への遷移
  - [ ] 入稿一覧 → 高度機能への遷移
  - [ ] 全ての画面からの「戻る」ナビゲーション
- [ ] **テスト実行して全て通ることを確認**

#### ✅ Phase 4-2: 最終調整・リファクタリング
- [ ] コード重複の排除
- [ ] CSS/スタイルの統一
- [ ] パフォーマンス最適化
- [ ] アクセシビリティ最終チェック

## 実装の詳細仕様

### ナビゲーション要素の設計

#### グローバルヘッダーナビ
```html
<nav style="margin-top: 10px;">
  <a href="/" style="color: white; text-decoration: none; margin-right: 20px;">ホーム</a>
  <a href="/books" style="color: white; text-decoration: none; margin-right: 20px;">書籍一覧</a>
  <a href="/authors" style="color: white; text-decoration: none; margin-right: 20px;">執筆者一覧</a>
  <a href="/printing-companies" style="color: white; text-decoration: none; margin-right: 20px;">印刷所一覧</a>
  <a href="/submissions" style="color: white; text-decoration: none;">入稿一覧</a>
</nav>
```

#### 書籍詳細の入稿ボタン
```html
<a 
  href="/books/<%= book.id %>/submissions"
  style="display: inline-block; padding: 10px 20px; background-color: #17a2b8; color: white; text-decoration: none; border-radius: 4px;"
>
  📋 入稿履歴
</a>
<a 
  href="/books/<%= book.id %>/submissions/new"
  style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;"
>
  ➕ 新規入稿
</a>
```

#### 入稿一覧のサブナビ
```html
<div class="sub-navigation" style="margin-bottom: 20px; border-bottom: 1px solid #ddd;">
  <a href="/submissions" class="tab active">全て</a>
  <a href="/submissions/in-progress" class="tab">進行中のみ</a>
  <a href="/submissions/costs" class="tab">コスト集計</a>
</div>
```

## テスト観点

### 機能テスト
- [ ] 全ナビゲーションリンクの正常動作
- [ ] 画面遷移の正確性
- [ ] エラーハンドリング（存在しないページなど）

### UI/UXテスト
- [ ] レスポンシブデザインの動作確認
- [ ] アクセシビリティ（キーボードナビゲーション）
- [ ] 視覚的一貫性（色、フォント、間隔）

### パフォーマンステスト
- [ ] ページ読み込み速度
- [ ] ナビゲーション応答速度

## 期待される成果

### UX改善
- **直接URL入力不要**: 全機能にGUIからアクセス可能
- **作業効率向上**: 関連機能への迅速な移動
- **使いやすさ向上**: 直感的なナビゲーション

### 保守性向上
- **テスト保護**: 全ナビゲーション機能がテストでカバー
- **設計一貫性**: 統一されたナビゲーションパターン
- **拡張性**: 新機能追加時のナビゲーション拡張が容易

### 技術的品質向上
- **TDD実践**: テストファーストによる品質保証
- **リファクタリング**: 既存コードの改善機会
- **ドキュメント**: 実装パターンの明文化

## 進捗管理

- **開始日**: 2025年6月21日
- **計画完了日**: 2025年6月21日〜22日
- **工数見積**: 6-8時間（TDD含む）
- **ステータス**: 🔄 計画策定完了、実装準備中

## 実装状況

### ✅ 完了済み
- [x] 問題の洗い出しと分析
- [x] 実装計画の策定
- [x] 詳細仕様の設計

### 🔄 進行中
- [ ] Phase 1: グローバルナビゲーション拡充
- [ ] Phase 2: 書籍詳細画面の機能拡充
- [ ] Phase 3: 入稿一覧画面の高度機能アクセス
- [ ] Phase 4: 全体統合テスト・最終調整

### ⏳ 未開始
- [ ] 全体リファクタリング
- [ ] パフォーマンス最適化
- [ ] ドキュメント更新