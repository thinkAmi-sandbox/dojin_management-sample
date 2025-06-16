# 印刷所機能 実装TODO

## 実装計画の概要

印刷所機能を画面ごとに段階的に実装する。
CLAUDE.mdの開発ルールに従い、各画面ごとに統合テスト→プロダクションコード→テスト実行の順で進める。

## Phase 1: 基本機能（必須）

### □ 1. 印刷所一覧画面（GET /printing-companies）

#### 設計フェーズ
- [ ] 画面仕様の確認
- [ ] 必要なデータとビューの設計

#### 実装フェーズ
- [ ] 2-1. 統合テスト作成（test/integration/printing-companies/list.spec.ts）
- [ ] 2-2. プロダクションコード実装
  - [ ] スキーマ追加（src/db/schema.ts にPrintingCompanyテーブル）
  - [ ] マイグレーション生成・実行
  - [ ] モジュール作成（src/printing-companies/printing-companies.module.ts）
  - [ ] コントローラー作成（printing-companies.controller.ts）
  - [ ] サービス作成（printing-companies.service.ts）
  - [ ] ビューファイル作成（views/printing-companies/index.ejs）
  - [ ] ルーティング設定
- [ ] 2-3. 型チェック（pnpm type-check）
- [ ] 2-4. Linter実行（pnpm format）
- [ ] 2-5. テスト実行（pnpm test:integration）
- [ ] 2-6. ユーザー確認

### □ 2. 新規印刷所登録（GET /printing-companies/new + POST /printing-companies）

#### 設計フェーズ
- [ ] フォーム仕様の確認
- [ ] バリデーションルールの設計

#### 実装フェーズ
- [ ] 2-1. 統合テスト作成（test/integration/printing-companies/create.spec.ts）
- [ ] 2-2. プロダクションコード実装
  - [ ] CreatePrintingCompanyDto作成
  - [ ] コントローラーにrenderNewForm()とcreate()追加
  - [ ] サービスにcreate()追加
  - [ ] ビューファイル作成（views/printing-companies/new.ejs）
- [ ] 2-3. 型チェック（pnpm type-check）
- [ ] 2-4. Linter実行（pnpm format）
- [ ] 2-5. テスト実行（pnpm test:integration）
- [ ] 2-6. ユーザー確認

### □ 3. 印刷所詳細画面（GET /printing-companies/:id）

#### 設計フェーズ
- [ ] 詳細画面の表示項目確認
- [ ] 将来の入稿履歴表示の考慮

#### 実装フェーズ
- [ ] 2-1. 統合テスト作成（test/integration/printing-companies/show.spec.ts）
- [ ] 2-2. プロダクションコード実装
  - [ ] コントローラーにfindOne()追加
  - [ ] サービスにfindOne()追加
  - [ ] ビューファイル作成（views/printing-companies/show.ejs）
- [ ] 2-3. 型チェック（pnpm type-check）
- [ ] 2-4. Linter実行（pnpm format）
- [ ] 2-5. テスト実行（pnpm test:integration）
- [ ] 2-6. ユーザー確認

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

- [ ] Phase 1-1: 印刷所一覧画面 ← **現在ここから開始**
- [ ] Phase 1-2: 新規印刷所登録
- [ ] Phase 1-3: 印刷所詳細画面
- [ ] Phase 2: 編集機能
- [ ] Phase 3: 削除機能