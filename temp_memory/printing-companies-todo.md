# 印刷所機能 実装TODO

## 実装計画の概要

印刷所機能を画面ごとに段階的に実装する。
CLAUDE.mdの開発ルールに従い、各画面ごとに統合テスト→プロダクションコード→テスト実行の順で進める。

## Phase 1: 基本機能（必須）

### ✅ 1. 印刷所一覧画面（GET /printing-companies）**【完了】**

#### 設計フェーズ
- [x] 画面仕様の確認
- [x] 必要なデータとビューの設計

#### 実装フェーズ
- [x] 2-1. 統合テスト作成（test/integration/printing-companies/list-printing-companies.integration.spec.ts）
- [x] 2-2. プロダクションコード実装
  - [x] スキーマ追加（src/db/schema.ts にPrintingCompanyテーブル）
  - [x] マイグレーション生成・実行（本番・テスト両方）
  - [x] モジュール作成（src/printing-companies/printing-companies.module.ts）
  - [x] コントローラー作成（printing-companies.controller.ts）
  - [x] サービス作成（printing-companies.service.ts）
  - [x] ビューファイル作成（views/printing-companies/index.ejs）
  - [x] メインレイアウト作成（views/layouts/main.ejs）
  - [x] ルーティング設定（app.moduleに追加）
- [x] 2-3. 型チェック（pnpm type-check）
- [x] 2-4. Linter実行（pnpm format）
- [x] 2-5. テスト実行（pnpm test:integration）**【全テスト通過】**
- [x] 2-6. ビューファイル移動修正（/views → src/views）
- [x] 2-7. ユーザー確認（本番環境動作確認完了）

#### 追加で対応した課題
- [x] ビューファイルパス設定修正（src/main.ts → src/views）
- [x] テスト用ビューファイルパス設定修正（test/integration/setup-test-app.ts → src/views）
- [x] nest-cli.json のassets設定修正（src/views/**/* → dist）
- [x] ビューファイル移動（/views/printing-companies → src/views/printing-companies）
- [x] 古いビューディレクトリ削除（/views）
- [x] テストデータベースのクリーンアップ処理追加（test/helpers/db-utils.ts）
- [x] レイアウトファイル作成
- [x] 本番環境ビューファイルパス問題解決（環境判定ロジック追加）

#### 実装済みファイル
```
✅ src/db/schema.ts（PrintingCompanyテーブル追加）
✅ src/printing-companies/printing-companies.module.ts
✅ src/printing-companies/printing-companies.controller.ts（一覧・詳細・新規登録機能含む）
✅ src/printing-companies/printing-companies.service.ts（一覧・詳細・新規登録機能含む）
✅ src/printing-companies/dto/create-printing-company.dto.ts（新規登録用DTO）
✅ src/views/printing-companies/index.ejs（一覧画面）
✅ src/views/printing-companies/show.ejs（詳細画面）
✅ src/views/printing-companies/new.ejs（新規登録フォーム）
✅ src/views/layouts/main.ejs
✅ test/integration/printing-companies/list-printing-companies.integration.spec.ts（一覧テスト）
✅ test/integration/printing-companies/create-printing-company.integration.spec.ts（新規登録テスト）
✅ drizzle/0004_lively_plazm.sql（マイグレーションファイル）
```

### ✅ 2. 新規印刷所登録（GET /printing-companies/new + POST /printing-companies）**【完了】**

#### 設計フェーズ
- [x] フォーム仕様の確認
- [x] バリデーションルールの設計

#### 実装フェーズ
- [x] 2-1. 統合テスト作成（test/integration/printing-companies/create-printing-company.integration.spec.ts）
- [x] 2-2. プロダクションコード実装
  - [x] CreatePrintingCompanyDto作成
  - [x] コントローラーにrenderNewForm()とcreate()追加
  - [x] サービスにcreate()追加
  - [x] ビューファイル作成（src/views/printing-companies/new.ejs）
- [x] 2-3. 型チェック（pnpm type-check）
- [x] 2-4. Linter実行（pnpm format）
- [x] 2-5. テスト実行（pnpm test:integration）**【新規登録機能テスト6件全通過】**
- [x] 2-6. ユーザー確認（動作確認完了）

#### 実装済みファイル（新規作成）
```
✅ src/printing-companies/dto/create-printing-company.dto.ts（バリデーション付きDTO）
✅ src/views/printing-companies/new.ejs（新規登録フォーム）
✅ test/integration/printing-companies/create-printing-company.integration.spec.ts（統合テスト）
```

#### 実装済みファイル（機能追加）
```
✅ src/printing-companies/printing-companies.controller.ts（renderNewForm()・create()メソッド追加）
✅ src/printing-companies/printing-companies.service.ts（create()メソッド追加）
```

### ✅ 3. 印刷所詳細画面（GET /printing-companies/:id）**【完了】**

#### 設計フェーズ
- [x] 詳細画面の表示項目確認
- [x] 将来の入稿履歴表示の考慮

#### 実装フェーズ
- [x] 2-1. 統合テスト作成（test/integration/printing-companies/show-printing-company.integration.spec.ts）
- [x] 2-2. プロダクションコード実装（既に実装済み）
  - [x] コントローラーにfindOne()追加（実装済み）
  - [x] サービスにfindOne()追加（実装済み）
  - [x] ビューファイル作成（src/views/printing-companies/show.ejs - 実装済み）
- [x] 2-3. 型チェック（pnpm type-check）**【通過】**
- [x] 2-4. Linter実行（pnpm format）**【完了】**
- [x] 2-5. テスト実行（pnpm test:integration）**【152件全テスト通過】**
- [ ] 2-6. ユーザー確認

#### 実装済みファイル（新規作成）
```
✅ test/integration/printing-companies/show-printing-company.integration.spec.ts（統合テスト5件）
```

## Phase 2: 編集機能

### □ 4. 印刷所編集（GET /printing-companies/:id/edit + PUT /printing-companies/:id）

#### 設計フェーズ
- [ ] 編集フォーム仕様の確認
- [ ] バリデーションルールの確認

#### 実装フェーズ
- [ ] 2-1. 統合テスト作成（test/integration/printing-companies/update.spec.ts）
- [ ] 2-2. プロダクションコード実装
  - [ ] UpdatePrintingCompanyDto作成
  - [ ] コントローラーにrenderEditForm()とupdate()追加
  - [ ] サービスにupdate()追加
  - [ ] ビューファイル作成（views/printing-companies/edit.ejs）
- [ ] 2-3. 型チェック（pnpm type-check）
- [ ] 2-4. Linter実行（pnpm format）
- [ ] 2-5. テスト実行（pnpm test:integration）
- [ ] 2-6. ユーザー確認

## Phase 3: 削除機能（後回し可）

### □ 5. 印刷所削除（DELETE /printing-companies/:id）

#### 設計フェーズ
- [ ] 削除確認の仕様確認
- [ ] 入稿データとの整合性確認

#### 実装フェーズ
- [ ] 2-1. 統合テスト作成（test/integration/printing-companies/delete.spec.ts）
- [ ] 2-2. プロダクションコード実装
  - [ ] コントローラーにremove()追加
  - [ ] サービスにremove()追加
  - [ ] 削除確認UI追加
- [ ] 2-3. 型チェック（pnpm type-check）
- [ ] 2-4. Linter実行（pnpm format）
- [ ] 2-5. テスト実行（pnpm test:integration）
- [ ] 2-6. ユーザー確認

## 必要なファイル構成（参考）

```
src/
├── printing-companies/
│   ├── printing-companies.module.ts
│   ├── printing-companies.controller.ts
│   ├── printing-companies.service.ts
│   ├── dto/
│   │   ├── create-printing-company.dto.ts
│   │   └── update-printing-company.dto.ts
│   └── entities/
│       └── printing-company.entity.ts
└── db/
    └── schema.ts（PrintingCompanyテーブル追加）

views/
└── printing-companies/
    ├── index.ejs（一覧）
    ├── new.ejs（新規登録）
    ├── show.ejs（詳細）
    └── edit.ejs（編集）

test/
└── integration/
    └── printing-companies/
        ├── list.spec.ts
        ├── create.spec.ts
        ├── show.spec.ts
        ├── update.spec.ts
        └── delete.spec.ts
```

## 実装時の注意事項

- コントローラーメソッド名はNestJS規則に従う（findAll、findOne、create、update、remove）
- フォーム表示用メソッドはrenderNewForm、renderEditFormを使用
- HTTPメソッドオーバーライドで_method=PUT/DELETEを使用
- EJSテンプレートでMPA構成
- 各段階でテストが通ることを確認してから次に進む

## 現在の状況

- [x] Phase 1-1: 印刷所一覧画面 **【完了 - 統合テスト全通過】**
- [x] Phase 1-2: 新規印刷所登録 **【完了 - 統合テスト6件全通過】**
- [x] Phase 1-3: 印刷所詳細画面 **【完了 - 統合テスト5件全通過】**
- [ ] Phase 2: 編集機能 ← **次はここ**
- [ ] Phase 3: 削除機能

## 完了報告

### Phase 1-1: 印刷所一覧画面 実装完了 ✅

**実装日時**: 2025/06/16 22:05完了  
**テスト結果**: 統合テスト141件全て通過  
**動作確認**: 開発・本番環境両方で正常動作確認済み

**主な成果物**:
- PrintingCompanyテーブル実装
- 印刷所一覧表示機能（/printing-companies）
- 印刷所詳細表示機能（/printing-companies/:id）
- レスポンシブ対応のEJSビューファイル
- 完全な統合テスト

**次のステップ**: ユーザーによる動作確認後、Phase 1-2（新規印刷所登録）へ進行

### Phase 1-2: 新規印刷所登録機能 実装完了 ✅

**実装日時**: 2025/06/16 22:32完了  
**テスト結果**: 新規登録機能の統合テスト6件全て通過  
**動作確認**: ユーザーによる動作確認完了

**主な成果物**:
- 新規登録フォーム機能（GET /printing-companies/new）
- 印刷所登録処理機能（POST /printing-companies）
- バリデーション機能（必須チェック・URL形式チェック）
- 統合テスト（フォーム表示・登録処理・エラーハンドリング）
- CreatePrintingCompanyDto（class-validator使用）

**コミット**: 462040d - 印刷所新規登録機能を実装

**次のステップ**: Phase 1-3（印刷所詳細画面）の実装