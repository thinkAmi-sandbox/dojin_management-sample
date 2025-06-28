# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) への指針を提供します。

## ユーザーとのやり取り

- YOU MUST: ユーザーへの返信は日本語の関西弁を利用すること


## プロジェクト概要

これは同人誌（自費出版物）を管理するためのNestJSアプリケーションです。使用技術：
- **ランタイム**: Node.js 22.16.0 (miseで管理)
- **パッケージマネージャー**: pnpm
- **データベース**: PostgreSQL + Drizzle ORM
- **テスト**: Vitest（ユニットテスト/E2Eテスト）、Supertest（HTTPテスト）
- **コード品質**: Biome（リンティング/フォーマット）
- **ビューテンプレート**: EJS（MPA構成）
- **HTTPメソッドオーバーライド**: @nest-middlewares/method-override

## 必須コマンド

### 開発
```bash
pnpm install          # 依存関係のインストール
pnpm start:dev        # ウォッチモードで起動（自動リロード）
pnpm start:debug      # デバッグモードで起動
pnpm build            # プロジェクトのビルド
pnpm start:prod       # プロダクションビルドの実行
```

### テスト
```bash
pnpm test             # ユニットテストの実行（Vitest）
pnpm test:watch       # ウォッチモードでテスト実行
pnpm test:cov         # カバレッジ付きでテスト実行
pnpm test:integration # 統合テストの実行（HTTPテスト）
pnpm test:e2e         # E2Eテストの実行（将来実装予定）
```

### コード品質
```bash
pnpm lint             # Biomeでコードをチェック・修正
pnpm format           # Biomeでコードをフォーマット
```

### データベース
```bash
docker compose up -d      # PostgreSQLコンテナの起動
docker compose down       # PostgreSQLコンテナの停止
pnpm drizzle:generate     # マイグレーションファイルの生成（対話式プロンプト注意）
pnpm drizzle:migrate      # プロダクション用データベースのマイグレーション実行
pnpm drizzle:migrate:test # テスト用データベースのマイグレーション実行
pnpm drizzle:push         # プロダクション用にスキーマを直接反映
pnpm drizzle:push:test    # テスト用にスキーマを直接反映
pnpm drizzle:studio       # Drizzle Studio GUIを開く
```

#### **YOU MUST**: マイグレーション対話式プロンプト対応

**Claude Code実行時の制限**:
- `pnpm drizzle:generate`で対話式プロンプトが出た場合、Claude Codeでは対応不可
- スキーマ変更（カラム追加/削除/変更）時に発生する可能性が高い

**対処法**:
1. Claude Codeがマイグレーション生成コマンドを実行できない場合は、ユーザーが手動実行
2. 対話式プロンプトでの推奨回答：
   - 新規カラム追加: 「+ columnName create column」を選択
   - カラム削除: 「- columnName drop column」を選択  
   - カラム名変更: 名前変更でない場合は「create column」を選択
3. マイグレーション生成後、Claude Codeに制御を戻して残りの作業継続

**Claude Codeの対応パターン**:
- スキーマ変更作業時は「実行すべきコマンドの提示」に留める
- ユーザー実行完了後、型チェック・テスト実行等の後続作業を継続
- 「コマンド提示→ユーザー実行→結果確認→次ステップ」の流れを確立

## アーキテクチャ

### モジュール構造
- NestJSはデコレータを使用したモジュラーアーキテクチャを採用
- 各機能は以下を含む独立したモジュールとして実装：
  - `*.module.ts` - モジュール定義
  - `*.controller.ts` - HTTPエンドポイント
  - `*.service.ts` - ビジネスロジック
  - `*.dto.ts` - データ転送オブジェクト
  - `*.entity.ts` - データベースエンティティ

### 主要パターン
- **依存性注入**: サービスはコンストラクタ経由で注入
- **デコレータ**: ルーティング、バリデーション、DIに広く使用
- **DTO**: リクエストバリデーションにclass-validatorを使用
- **Drizzle**: データベーススキーマは`src/db/schema.ts`で定義
- **テスト**: 詳細は`docs/test/overview.md`を参照。ユニット/統合/E2Eの3層構造

### 設定
- **TypeScript**: ES2023ターゲットでStrictモード有効
- **ポート**: `process.env.PORT`で設定可能（デフォルト: 3000）
- **データベース**: `DATABASE_URL`環境変数で接続（PostgreSQL on Docker、ポート: 15432）
- **Drizzle設定**: `drizzle.config.ts`でデータベース接続設定
- **環境変数**: `.env.example`をコピーして`.env`を作成

### コードスタイル

- **インデント**: スペース2つ
- **クォート**: JS/TSではシングルクォート
- **行幅**: 80文字
- **末尾カンマ**: 必須
- Biomeで統一されたコード品質管理
- ESモジュール (import/export)構文を使用する
- 可能な場合はimportを分解する
  - 例
    - import { foo } from 'bar'

### コントローラーメソッド命名規則

- **YOU MUST**: NestJSコントローラーのメソッド名は以下の規則に従うこと
- **YOU MUST NOT**: Railsスタイルの命名（index, show, create, updateなど）は使用しない

#### 必須のメソッド名規則：
- **`findAll()`** - リソースの一覧取得 (GET /resources)
- **`findOne()`** - 単一リソースの取得 (GET /resources/:id)
- **`create()`** - 新規リソースの作成 (POST /resources)
- **`update()`** - リソースの更新 (PUT /resources/:id)
- **`remove()`** - リソースの削除 (DELETE /resources/:id)

#### フォーム表示用メソッド（MPA構成時）：
- **`renderNewForm()`** - 新規作成フォームの表示 (GET /resources/new)
- **`renderEditForm()`** - 編集フォームの表示 (GET /resources/:id/edit)

#### 例：
```typescript
@Controller('books')
export class BooksController {
  @Get()
  async findAll() { /* 一覧表示 */ }
  
  @Get(':id')
  async findOne(@Param('id') id: string) { /* 詳細表示 */ }
  
  @Post()
  async create(@Body() createBookDto: CreateBookDto) { /* 作成処理 */ }
  
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) { /* 更新処理 */ }
  
  @Delete(':id')
  async remove(@Param('id') id: string) { /* 削除処理 */ }
}
``` 

## アプリケーション設計

### UI構成
- MPA（Multi Page Application）として実装
- サーバーサイドでEJSを使用してHTMLをレンダリング
- RESTfulなURL設計を採用

### URL設計
- 詳細は`docs/01_url.md`を参照
- HTTPメソッドオーバーライドでPUT/DELETEをサポート（_methodパラメータ使用）

### データベース設計
- **詳細**: `docs/db/`ディレクトリを参照
- **スキーマ定義**: `src/db/schema.ts`で管理
- **主要テーブル**: Book, Author, PrintingCompany, Submission, Event, Circle
- **関係テーブル**: BookAuthor, CircleAuthor

### テスト設計
- 詳細は`docs/test/overview.md`を参照
- 3層構造：ユニットテスト、統合テスト、E2Eテスト
- 統合テストはRSpecのrequest specに相当
- **データベースクリーンアップ**: 詳細は`docs/test/database-cleanup-strategy.md`を参照
- **フレーキーテスト対策**: 修正履歴は`docs/test/flaky-test-fix-history.md`を参照

## 開発環境のセットアップ

### 初回セットアップ
```bash
# 1. 環境変数の設定
cp .env.example .env

# 2. 依存関係のインストール
pnpm install

# 3. PostgreSQLの起動
docker compose up -d

# 4. データベースのマイグレーション
pnpm drizzle:migrate      # プロダクション用データベース
pnpm drizzle:migrate:test # テスト用データベース

# 5. 開発サーバーの起動
pnpm start:dev
```

### データベース接続情報
- ホスト: localhost
- ポート: 15432
- データベース名: dojin_management
- ユーザー名: dojin_user
- パスワード: dojin_password



## 開発ルール

ここでは、ユーザーとClaude Codeがどのように開発を進めていくかを決めた開発ルールを定義します。


### 1. 設計フェーズ

プログラムを書く前に、設計を行います。

#### **YOU MUST**: 実装前チェックリスト（強化版）

新機能を実装する前に、以下の項目を必ず確認してください：

**Phase 1: スキーマ・データ構造の確認**
- [ ] **スキーマ定義の詳細確認**
  - `src/db/schema.ts`でテーブル定義を確認
  - **重要**: フィールド名の正確な確認（例: `websiteUrl`であって`officialSite`ではない）
  - データ型の確認（例: `pageCount`は`integer`型、`createdAt`は`timestamp`型）
  - enumの値を確認（例: 書籍ステータスは`planning`, `writing`, `editing`, `completed`）
  - **手順**: 実装前に必ず `Read` ツールでスキーマ定義を読み返す

**Phase 2: 既存実装パターンの徹底分析**
- [ ] **類似機能の実装パターン確認（3つ以上）**
  - 同じパターンの実装が既にあるか確認
  - **参考実装の優先順位**:
    1. 印刷所機能（完全なCRUD実装の模範例）
    2. 書籍機能（ステータス更新、部分更新の例）
    3. 執筆者機能（多対多関係の例）
  - JOIN処理、エラーハンドリング、ビューファイル構造を参考にする

- [ ] **import文の統一確認**
  - Express型定義: `import type { Response } from 'express'`
  - NestJS共通: `@Controller`, `@Get`, `@Post`, `@Put`, `@Delete`
  - バリデーション: class-validatorの使用方法
  - **手順**: 既存コントローラーのimport文をコピーして修正

- [ ] **バリデーション方式の確認**
  - 手動バリデーション vs class-validator の使い分け
  - エラーハンドリングパターンの統一
  - **印刷所機能を参考**: 手動バリデーション + エラー表示パターン

**Phase 3: 依存関係・技術要件の確認**
- [ ] **必要な依存関係の確認**
  - `package.json`で必要なパッケージがインストール済みか確認
  - 型定義パッケージも含めて確認（例: `@types/method-override`）
  - **特に注意**: `@nestjs/mapped-types`, `class-validator`, `method-override`

- [ ] **HTTPメソッドオーバーライド対応確認**
  - PUT/DELETE機能を実装する場合は必須確認
  - `@Post(':id')` メソッドでHTTPメソッドオーバーライド処理を実装
  - `body._method === 'PUT'` および `body._method === 'DELETE'` の条件分岐
  - ValidationPipeの手動実行パターン確認
  - **参考実装**: 印刷所機能の `updateViaPost` メソッド
  - **確認項目**: フォームに `<input type="hidden" name="_method" value="PUT">` 存在

- [ ] **URLパスとコントローラーの対応確認**
  - URLパスから適切なコントローラーを判断
  - 例: `/books/:bookId/submissions/new` → BooksControllerに実装
  - 例: `/submissions/:id` → SubmissionsControllerに実装
  - **ルール**: パスの最初のセグメントでコントローラーを決定

- [ ] **テストファイルのインポートパス確認**
  - 他の統合テストファイルを参考にして正しいインポートパスを使用
  - 例: `setupTestApp`は`../setup-test-app`からインポート
  - **確認手順**: 既存テストファイルのimport文をコピーして修正

**Phase 4: データフロー設計の事前確認**
- [ ] **データ変換フローの設計**
  - フォーム入力 → バリデーション → DTO変換 → サービス処理 → DB保存
  - 空文字列、null、undefined の扱いを事前に決定
  - 数値変換（文字列→number）のタイミングを決定
  - **重要**: PostgreSQL型制約（integer, timestamp等）との整合性確認

**Phase 5: ValidationExceptionFilter統合確認**
- [ ] **Phase 2-2教訓の活用必須**
  - 詳細は `docs/development-lessons/phase-2-2-lessons.md` を参照
  - @Redirect + ValidationPipe競合問題の事前回避策
  - it.skip()使用ガバナンス強化策
  - DTO型選択基準（UI入力 → string型、サービス層で数値変換）

- [ ] **共通コンポーネント統合設計**
  - ValidationExceptionFilterとの統合ポイント事前特定
  - テンプレート変数依存関係マップ作成（authors, roles, formData等）
  - エラーハンドリングパス設計（404/400/500の期待動作）
  - 条件分岐の優先順位設計（具体的パターン → 一般的パターン）
  - **手順**: 既存ValidationExceptionFilter分岐を事前確認・修正計画

**Phase 6: 複合主キー・多対多関係の事前設計**
- [ ] **複合主キー対応の設計確認**
  - 複合主キー（例: circleId + authorId）のDrizzle ORM実装パターン確認
  - JOIN処理でのand()条件の使用方法確認
  - 既存関係データの重複チェック実装パターン確認
  - **手順**: BookAuthor機能の複合主キー実装を参考にする

- [ ] **多対多関係管理の設計確認**
  - notInArray()を使用した利用可能データフィルタリング設計
  - 関係テーブルの追加フィールド（role, joinedAt, leftAt等）設計
  - 参加期間管理（アクティブ/非アクティブ）の設計
  - **手順**: 既存の多対多関係実装（BookAuthor等）のパターン分析


### 2. 実装フェーズ

実際にプログラムを書きます。

なお、完成するまで、実装フェーズの作業を繰り返します。



### 2-1. 段階的統合テスト作成戦略

`./test/integration` ディレクトリに、統合テストのテストコードを段階的に書きます。

#### **YOU MUST**: 段階的テスト実装アプローチ（重要な定義）

**⚠️ 重要**: 「段階的」は「テスト追加の順序」であり「機能の省略」ではありません
- 実装計画書で「✅完了」記載時は必ず全機能実装済みであること
- 「ミニマム実装」= 「基本機能のテスト優先」であり「一部機能スキップ」ではない
- **全エンドポイントの実装とテストは必須**（段階的に追加するだけ）

**Step 1: 基本機能テスト優先（1-2テスト）**
- [ ] 最重要な成功ケースのみ先行実装
- [ ] 基本的な表示・作成機能の確認
- [ ] ⚠️ 注意: この段階で全エンドポイントの実装は必須（テストだけ後回し）
- [ ] この段階でテストが失敗することを確認

**Step 2: バリデーションテスト追加（2-3テスト）**
- [ ] 必須項目のバリデーションエラー
- [ ] 基本的なデータ型エラー
- [ ] Step 1のテストが通ることを確認してから追加

**Step 3: 全機能テスト追加（残りテスト）**
- [ ] 編集・削除・エッジケース処理
- [ ] 存在しないリソースエラー
- [ ] 全エンドポイントのテストカバレッジ達成必須
- [ ] Step 1-2のテストが全て通ることを確認してから追加

#### **避けるべきパターン**
- ❌ 一度に9テスト全て作成する
- ❌ 複雑なケースから先に実装する
- ❌ テスト失敗原因の複合化
- ❌ **機能の一部を未実装のまま「✅完了」記載する**

#### **複合主キー・多対多関係実装時の追加考慮**
- [ ] **404エラーテストの適切な期待値設定**
  - NestJSは404エラーをJSON形式で返すのがデフォルト
  - HTML内容の期待ではなく、ステータスコードのみをテスト
  - **例**: `expect(404)`のみで、`expect(response.text).toContain('エラー')`は避ける

- [ ] **ValidationExceptionFilterテンプレート変数不足対策**
  - 新しいパス用のテンプレート変数準備をprepareFormDataメソッドに追加
  - エラー発生時の必要変数（authors, roles等）を事前リストアップ
  - **重要**: テンプレート変数不足による500エラーを避ける

### 2-2. プロダクションコードを書く

テストがパスするプロダクションコードを書きます。

### 2-3. 型チェックをする

型チェックにパスするか確認します。

```
pnpm type-check
```

型チェックをパスするまで修正を行います。



### 2-3. Linterを実行する

Linterを使って、テストコード・プロダクションコードを規約に従った形へと修正します。

```
pnpm format 
```


### 2-4. テストを実行する + ビューファイル作成時の必須手順

記述したテストコードを実行します。

```
# ユニットテストの実行
pnpm test

# integrationテストの実行
pnpm test:integration
```

テストが失敗する場合、テストが成功するまでプロダクションコードを修正します。

#### **YOU MUST**: ビューファイル作成時の必須ビルド手順

**新しいビューファイル（*.ejs）を作成した場合は、必ず以下の手順を実行**：

1. **統合テスト成功後、必ず `pnpm build` を実行**
2. **`dist/views/` にビューファイルがコピーされたことを確認**
3. **ユーザーに動作確認を依頼する前に上記を完了**

**理由**: 開発サーバー（pnpm start:dev）は `src/views/` を直接参照するため問題が隠れるが、ビルド後実行（pnpm start:prod）やIDE実行では `dist/views/` が必要。

**再発防止**: この手順を怠ると「Failed to lookup view」エラーが発生する。



### 2-5. ユーザーに対して完成したか確認する

ユーザーに対して、実装した機能が問題ないかを確認します。


### 2-6. 実装完了確認チェックリスト

**YOU MUST**: 機能に✅マークを付ける前に、以下の項目を必ず確認してください：

#### Phase A: 全機能実装確認
- [ ] **仕様書に記載された全エンドポイントの実装確認**
  - GET（一覧・詳細・フォーム）エンドポイント実装済み
  - POST（作成）エンドポイント実装済み
  - PUT（更新）エンドポイント実装済み
  - DELETE（削除）エンドポイント実装済み
  - **重要**: "ミニマム実装"での✅マークは禁止

#### Phase B: HTTPメソッドオーバーライド確認
- [ ] **PUT/DELETE処理の動作確認**
  - フォームからの編集ボタンが正常動作
  - フォームからの削除ボタンが正常動作
  - `@Post(':id')` メソッドでHTTPメソッドオーバーライド実装済み
  - ValidationPipeの手動実行が正しく動作

#### Phase C: 統合テスト網羅性確認
- [ ] **全機能のテストカバレッジ確認**
  - 各エンドポイントに対応する統合テストが存在
  - 正常系・異常系両方のテストケースが実装済み
  - テスト実行時に全件パス確認済み

#### Phase D: エラーハンドリング確認
- [ ] **例外処理とエラー表示の確認**
  - 存在しないリソースへのアクセス（404エラー）
  - バリデーションエラー（400エラー）
  - ValidationExceptionFilterの適用確認（MPA用エラー表示）

#### Phase E: 型チェック・コード品質確認
- [ ] **TypeScript型安全性確認**
  - `pnpm type-check` でエラー0件
  - import文の正確性確認（type-only vs 通常import）
  - `pnpm lint` でコード品質チェック通過

**✅マーク基準**: 上記Phase A〜E全てが完了した場合のみ✅マークを付与すること


### 2-7. ビューファイル作成時の必須手順

#### **YOU MUST**: ビューファイル作成時の必須ビルド手順

**新しいビューファイル（*.ejs）を作成した場合は、必ず以下の手順を実行**：

1. **統合テスト成功後、必ず `pnpm build` を実行**
2. **`dist/views/` にビューファイルがコピーされたことを確認**
3. **ユーザーに動作確認を依頼する前に上記を完了**

**理由**: 開発サーバー（pnpm start:dev）は `src/views/` を直接参照するため問題が隠れるが、ビルド後実行（pnpm start:prod）やIDE実行では `dist/views/` が必要。

**詳細設定**: `docs/02_view_configuration.md` を参照してください。

## 効率的エラー解決戦略

### **YOU MUST**: エラー発生時の段階的切り分け手順

エラーが発生した場合、以下の順序で原因を特定してください：

#### 1. **PostgreSQLエラーの分析**
```
Priority: 最高 - データベースエラーは根本原因になりやすい
```
- [ ] **`invalid input syntax for type integer: ""`**
  - 原因: 空文字列がinteger型フィールドに送信されている
  - 解決: 空文字列→null変換処理の追加
  - 確認箇所: DTO変換、フォーム処理

- [ ] **`Failed query: insert/update ...`**
  - 原因: データ型不一致、制約違反
  - 解決: スキーマ定義との照合、データ変換確認
  - 確認箇所: サービス層のデータ処理

#### 2. **インポート・依存関係エラーの分析**
```
Priority: 高 - 早期に解決可能
```
- [ ] **`Cannot find package 'express'`**
  - 原因: 型のみインポートが必要
  - 解決: `import type { Response } from 'express'`
  - 確認箇所: 既存コントローラーのimport文を参考

- [ ] **`Module not found`**
  - 原因: インポートパスの間違い
  - 解決: 既存ファイルのパスをコピー&修正
  - 確認箇所: 他の統合テストファイル

#### 3. **バリデーション・ビジネスロジックエラーの分析**
```
Priority: 中 - ロジック調整が必要
```
- [ ] **期待したエラーメッセージが表示されない**
  - 原因: 手動バリデーション vs class-validator の混在
  - 解決: 印刷所機能のパターンを参考に手動バリデーション実装
  - 確認箇所: コントローラーのエラーハンドリング

#### 4. **HTMLレンダリング・テスト問題の分析**
```
Priority: 低 - 表示の問題、機能への影響は軽微
```
- [ ] **`Failed to lookup view`**
  - 原因: ビューファイルのビルド後コピー不足
  - 解決: `pnpm build`実行、`dist/views/`確認
  - 確認箇所: nest-cli.json設定

- [ ] **HTMLテストの文字列不一致**
  - 原因: 改行・インデントによる期待値ずれ
  - 解決: 部分文字列での検証に変更
  - 確認箇所: テストの期待値調整

### **YOU MUST**: よくあるエラーパターン辞書

| エラーメッセージ | 主な原因 | 解決方法 | 参考実装 |
|-----------------|---------|---------|---------|
| `value "6000060003000" is out of range for type integer` | 文字列連結による数値計算エラー | `Number()`による明示的型変換 | 入稿編集機能 |
| `invalid input syntax for type integer: ""` | 空文字列のinteger送信 | 空文字列→null変換処理 | 入稿編集機能 |
| `Cannot find package 'express'` | 通常importでの型参照 | `import type { Response }` | 印刷所機能 |
| `Failed to lookup view` | ビューファイル未コピー | `pnpm build`でdist/にコピー | ビューファイル作成時 |
| テストでHTML不一致 | 改行・インデント問題 | 部分文字列検証に変更 | 入稿編集テスト |
| ValidationPipeエラーがJSONで返される | ValidationExceptionFilter未適用 | パスをフィルターに追加 | 書籍機能 |
| 空文字列でバリデーションスキップ | PartialType + Transform相互作用 | 事前チェック追加 | 書籍更新機能 |
| `Cannot POST /resource/1` (404エラー) | HTTPメソッドオーバーライド未実装 | `@Post(':id')`でupdateViaPostメソッド追加 | 印刷所・版管理機能 |
| `UpdateDto cannot be used as a value` | type-onlyインポートエラー | `import { UpdateDto }`に修正 | 版管理機能 |
| ✅完了マークだが一部機能未実装 | ミニマム実装の認識齟齬 | 全機能実装後に✅マーク | 実装完了確認強化 |
| `@Transform + @IsNotEmpty`でバリデーションスキップ | 数値変換がバリデーション前に実行される | 手動バリデーション実装に変更 | 在庫管理機能 |
| `@Redirect`がバリデーションエラー時も実行される | デコレータ優先度問題 | `docs/development-lessons/phase-2-2-lessons.md`参照 | Phase 2-2教訓 |
| it.skip()による技術的問題の先送り | 根本原因分析不足・優先度判断ミス | 即座解決・期限設定義務化 | Phase 2-2教訓 |
| テストで200が返されるがエラー期待 | ValidationExceptionFilterが200でHTML返却 | テストの期待値を200に修正 | 在庫管理テスト |

### **YOU MUST**: デバッグ効率化のための事前準備

#### コード内デバッグ情報の埋め込み
```typescript
// 各段階でのデータ確認
console.log('📥 受信データ:', updateSubmissionDto)
console.log('🔄 変換後DTO:', validatedDto)
console.log('💾 DB保存前:', { id, data: validatedDto })
console.log('✅ 処理完了')
```

#### 段階的問題切り分け
```markdown
## エラー解決チェックリスト
1. [ ] PostgreSQLエラーログの確認
2. [ ] 既存パターンとの比較確認  
3. [ ] データフロー各段階での値確認
4. [ ] 型変換・null処理の確認
5. [ ] テスト期待値の調整確認
```


### **YOU MUST**: Gitコミット時の必須ルール

コミット作業は `/commit-helper` カスタムスラッシュコマンドを使用してください。

#### 使用方法
```bash
/commit-helper
```

#### 詳細ルール
コミットメッセージ形式、プロンプト記載ルール、チェック項目等の詳細は `.claude/commands/commit-helper.md` を参照してください。

#### 重要な注意事項
- プロンプトの省略・要約は絶対に行わない
- 前回コミット以降のすべてのやり取りを漏れなく記載する
- ファイルパス以外は一切変更しない
- 時系列順序を正確に保持する

## ベストプラクティス

### 統合テスト駆動開発（TDD）

- **YOU MUST**: 新機能実装時は必ず統合テストから書き始める
- テストケースが仕様書の役割を果たし、実装の方向性が明確になる
- テストが通ることで実装の正しさが保証される

### 統合テストでのデータベースクリーンアップ戦略

#### **YOU MUST**: 適切なクリーンアップパターンの選択

**基本原則**:
- **`beforeEach`のみ**: 各テスト開始時にクリーンな状態を保証（推奨・統一済み）
- **`afterEach`は避ける**: フレーキーテストの原因となるため基本的に不使用

**詳細**: `docs/test/database-cleanup-strategy.md` を参照

#### **YOU MUST**: 統一されたクリーンアップパターン

**統一パターン**:
```typescript
beforeEach(async () => {
  await testDbUtils.cleanupDatabase()
  // テスト用データの作成
})
```

#### **YOU MUST**: Vitestテスト関数の明示的import

**必須ルール**: 新規テストファイル作成時は必ず以下のimport文を記述すること
```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
```

**理由**: `tsconfig.test.json` の globals設定では型解決できないため


### 既存パターンの活用

- **YOU MUST**: 類似機能が既にある場合は、そのパターンを踏襲する
- 特に以下の実装は良いパターンとして参考にする：
  - 印刷所機能（CRUD全体の実装）
  - 入稿機能（複雑なCRUD、JOIN処理、コスト計算の実装）
  - 進行中入稿一覧（WHERE条件フィルタリング、ORDER BY、納期アラート機能）
  - 書籍のステータス更新（部分更新の実装）
  - 書籍と執筆者の関連（多対多関係の実装）
  - サークルメンバー管理（複合主キー、JOIN処理、フィルタリングの実装）

### エラーハンドリング

#### 標準エラーハンドリングパターン

- **存在しないリソース**: `NotFoundException`を使用
- **バリデーションエラー**: `BadRequestException`を使用
- **権限エラー**: `ForbiddenException`を使用
- **サービス層**: 適切な例外を投げる
- **コントローラー層**: 基本的にはcatchせず、NestJSのグローバルフィルターに任せる

#### ValidationPipe統一ガイドライン

##### **YOU MUST**: ValidationPipeの使用方針
- **全コントローラーでValidationPipe統一完了済み**（2025-06-21時点）
- **全DTOで@Transform設定統一完了済み**（2025-06-21時点）
- **全DTOで日本語エラーメッセージ統一完了済み**（2025-06-21時点）
- ValidationExceptionFilterがMPA用のエラーハンドリングを提供
- DTOでclass-validatorデコレータを使用してバリデーション定義
- **手動バリデーションは全廃済み**（約300行削除完了）
- **12ファイルのDTO標準化完了**（一貫したTransform・メッセージパターン確立）

##### バリデーション実装パターン
```typescript
// コントローラーでの実装
@Post()
@UsePipes(ValidationPipe)
@Redirect('/resources')
async create(@Body() createDto: CreateDto) {
  await this.service.create(createDto)
}

// HTTPメソッドオーバーライド対応（_method使用時）
@Post(':id')
async updateViaPost(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: any,
  @Res() res: Response,
) {
  if (body._method === 'PUT') {
    const validationPipe = new ValidationPipe()
    const validatedDto = await validationPipe.transform(body, {
      type: 'body',
      metatype: UpdateDto,
    })
    await this.service.update(id, validatedDto)
    res.redirect(`/resources/${id}`)
  }
}
```

##### **YOU MUST**: 標準化されたDTO実装パターン（2025-06-21統一完了）

**Phase 3で統一された@Transformパターン・メッセージパターンを必ず使用**：

```typescript
/**
 * リソース作成用DTO
 * 標準化された@Transform設定・エラーメッセージを使用
 */
export class CreateDto {
  // 文字列の空文字列→undefined変換（標準）
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: 'フィールド名は文字列で入力してください' })
  optionalField?: string

  // trim処理付き（必須フィールド用）
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '名前は必須です' })
  @IsString({ message: '名前は文字列で入力してください' })
  name: string

  // 数値変換（オプショナル）
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsOptional()
  @IsPositive({ message: 'ページ数は正の数で入力してください' })
  pageCount?: number

  // 数値変換（null許可）
  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @IsInt({ message: '印刷費は整数で入力してください' })
  @Min(0, { message: '印刷費は0以上で入力してください' })
  printingCost?: number | null

  // URL・メール・日付の例
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsUrl({}, { message: 'WebサイトURLには有効なURLを入力してください' })
  @MaxLength(500, { message: 'WebサイトURLは500文字以内で入力してください' })
  websiteUrl?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsEmail({}, { message: 'メールアドレスには有効なメールアドレスを入力してください' })
  email?: string

  @IsNotEmpty({ message: '締切日は必須です' })
  @IsDateString({}, { message: '締切日には有効な日付を入力してください' })
  dueDate: string
}
```

**重要**: これらのパターンは全12ファイルのDTOで統一済み。新しいDTOを作成する際は必ずこのパターンを使用すること。

##### **YOU MUST**: 統一されたエラーメッセージパターン（2025-06-21完了）

**必須フィールド**:
- `{フィールド名}は必須です`

**型チェック**:
- 文字列: `{フィールド名}は文字列で入力してください`
- 整数: `{フィールド名}は整数で入力してください`
- 正の数: `{フィールド名}は正の数で入力してください`

**フォーマット**:
- URL: `{フィールド名}には有効なURLを入力してください`
- メール: `{フィールド名}には有効なメールアドレスを入力してください`
- 日付: `{フィールド名}には有効な日付を入力してください`

**範囲チェック**:
- 最大文字数: `{フィールド名}は{数}文字以内で入力してください`
- 最小値: `{フィールド名}は{数}以上で入力してください`

これらのメッセージパターンは全31件のエラーメッセージで統一済み。新規DTO作成時は必ずこのパターンに従うこと。

##### UpdateDtoの特殊対応
- PartialTypeを使用する場合、空文字列の扱いに注意
- 必須フィールドが空文字列で送信される場合は特別な処理が必要
```typescript
// 空文字列タイトルの事前チェック例
if (body.title === '' || (body.title && body.title.trim() === '')) {
  throw new BadRequestException({
    statusCode: 400,
    message: ['タイトルは必須です'],
    error: 'Bad Request',
  })
}
```

#### **YOU MUST**: ParseIntPipeと例外の適切な組み合わせ

```typescript
// ✅ 正しいパターン: ParseIntPipeを使い、サービス層でNotFoundExceptionを投げる
@Get(':id')
@Render('resource/show')
async findOne(@Param('id', ParseIntPipe) id: number) {
  // サービス内でNotFoundException投げる → 404エラー
  const resource = await this.service.findOne(id)
  return { resource }
}

// ❌ 間違ったパターン: try-catchでBadRequestExceptionを投げる
@Get(':id')
@Render('resource/show')
async findOne(@Param('id', ParseIntPipe) id: number) {
  try {
    const resource = await this.service.findOne(id)
    return { resource }
  } catch (error) {
    // これだと存在しないリソースも400エラーになってしまう
    throw new BadRequestException('無効なIDです')
  }
}
```

#### サービス層での例外処理

```typescript
// ✅ 推奨パターン
async findOne(id: number) {
  const result = await this.db.select().where(eq(table.id, id)).limit(1)
  
  if (result.length === 0) {
    throw new NotFoundException('リソースが見つかりません')
  }
  
  return result[0]
}
```

### 依存関係の管理

- 新しいパッケージを使用する際は、必ず事前にインストール状況を確認
- 型定義パッケージも忘れずにインストール（`@types/`で始まるパッケージ）

### ValidationExceptionFilter実装済み

**実装済み機能**（2025-06-21完了）:
- `src/common/filters/validation-exception.filter.ts`でMPA用エラーハンドリング統一
- 全コントローラーのValidationPipeエラーを適切なHTMLエラーページに変換
- フォームデータ復元機能でユーザビリティ保持
- 全195件統合テスト成功確認済み

**対応済みパス**:
- 印刷所: `/printing-companies`, `/printing-companies/:id`
- 書籍: `/books`, `/books/:id`, `/books/:id/status`
- 執筆者: `/authors`, `/authors/:id`
- 締切: `/books/:bookId/deadlines`, `/deadlines/:id`
- 入稿: `/books/:bookId/submissions`, `/submissions/:id`, `/submissions/:id/edit`
- 書籍執筆者: `/books/:bookId/authors`
- イベント: `/events`, `/events/:id`（2025年6月22日追加）
- サークル: `/circles`, `/circles/:id`（2025年6月23日追加）
- サークルメンバー: `/circles/:circleId/members`, `/circles/:circleId/members/add`（2025年6月24日追加）
- 保管場所: `/storage-locations`, `/storage-locations/:id`（2025年6月28日追加）
- 在庫管理: `/stocks`, `/stocks/:id`（2025年6月28日追加）

## 効率的実装パターン集

### CRUD操作の標準テンプレート

#### サービス層のテンプレート

```typescript
// 一覧取得（JOIN処理含む）
async findAll() {
  return await this.drizzleService.db
    .select({
      id: schema.mainTable.id,
      // 必要なフィールドを列挙
      relatedData: {
        id: schema.relatedTable.id,
        name: schema.relatedTable.name,
      },
    })
    .from(schema.mainTable)
    .innerJoin(schema.relatedTable, eq(schema.mainTable.relatedId, schema.relatedTable.id))
    .orderBy(desc(schema.mainTable.createdAt))
}

// 単一取得（JOIN処理含む）
async findOne(id: number) {
  const result = await this.drizzleService.db
    .select({
      // 全フィールドを含む詳細情報
    })
    .from(schema.mainTable)
    .innerJoin(schema.relatedTable, eq(schema.mainTable.relatedId, schema.relatedTable.id))
    .where(eq(schema.mainTable.id, id))
    .limit(1)

  if (result.length === 0) {
    throw new NotFoundException('リソースが見つかりません')
  }

  return result[0]
}

// 削除処理（存在確認付き）
async remove(id: number): Promise<void> {
  // 存在確認（NotFoundExceptionを投げる）
  await this.findOne(id)

  await this.drizzleService.db
    .delete(schema.mainTable)
    .where(eq(schema.mainTable.id, id))
}
```

#### コントローラー層のテンプレート

```typescript
// 詳細画面パターン
@Get(':id')
@Render('resource/show')
async findOne(@Param('id', ParseIntPipe) id: number) {
  const resource = await this.service.findOne(id)

  // ステータス日本語変換
  const statusMap = { /* ステータスマッピング */ }

  // フォーマット関数
  const formatCurrency = (amount: number | null) => 
    amount !== null ? amount.toLocaleString('ja-JP') + '円' : '-'
  
  const formatDate = (date: Date | null) => 
    date ? date.toLocaleDateString('ja-JP') : '-'

  return {
    title: 'リソース詳細',
    resource: {
      // フォーマット済みデータ
    },
    // URL生成
    editUrl: `/resources/${resource.id}/edit`,
    deleteUrl: `/resources/${resource.id}`,
    listUrl: '/resources',
  }
}

// HTTPメソッドオーバーライド処理パターン
@Post(':id')
async updateViaPost(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: { _method?: string; [key: string]: unknown },
  @Res() res: Response,
) {
  if (body._method === 'PUT') {
    // ValidationPipeの手動実行
    const validationPipe = new ValidationPipe({ transform: true })
    const validatedDto = await validationPipe.transform(body, {
      type: 'body',
      metatype: UpdateResourceDto,
    })
    await this.service.update(id, validatedDto)
    return res.redirect(`/resources/${id}`)
  }
  if (body._method === 'DELETE') {
    return this.remove(id, res)
  }
  res.status(404).send('Not Found')
}

// 削除処理パターン
@Delete(':id')
async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
  try {
    // ID形式の妥当性チェック
    if (id <= 0 || isNaN(id)) {
      return res.status(400).send('無効なIDです')
    }

    await this.service.remove(id)
    res.redirect('/resources')
  } catch (error) {
    if (error instanceof HttpException && error.getStatus() === 404) {
      return res.status(404).send('リソースが見つかりませんでした')
    }
    throw error
  }
}
```

### ビューファイルの構造化テンプレート

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <style>
        /* 共通スタイル */
        body { font-family: sans-serif; margin: 20px; line-height: 1.6; }
        .header { margin-bottom: 20px; }
        .actions { margin-bottom: 20px; }
        .btn { background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; margin-right: 8px; }
        
        /* セクション構造 */
        .detail-section { margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .section-title { font-size: 1.2em; font-weight: bold; margin-bottom: 15px; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .detail-item { display: flex; margin-bottom: 10px; }
        .detail-label { font-weight: bold; min-width: 150px; }
        .detail-value { flex: 1; }
        
        /* レスポンシブ */
        @media (max-width: 768px) {
            .detail-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <!-- ヘッダーとアクション -->
    <!-- セクション別詳細表示 -->
    <!-- JavaScript（削除確認等） -->
</body>
</html>
```

## 関連ドキュメント

### docs/ ディレクトリ構造

**設計・仕様書**:
- `docs/01_url.md` - URL設計とエンドポイント一覧
- `docs/02_view_configuration.md` - EJSビューファイル設定詳細
- `docs/db/` - データベース設計（テーブル別詳細）

**テスト関連**:
- `docs/test/overview.md` - テスト戦略とベストプラクティス
- `docs/test/database-cleanup-strategy.md` - データベースクリーンアップ詳細
- `docs/test/best_practices.md` - 統合テストベストプラクティス

**開発ノウハウ**:
- `docs/know-how/` - 効率的プロンプティングパターン
- `docs/development-lessons/` - 過去Phase実装教訓集 ★NEW
- `docs/operation/` - マイグレーション等の運用手順

**プロジェクト記録**:
- `docs/project-history.md` - 各機能の実装完了記録

---

## 3. Gitへコミットする

`/commit-helper` カスタムスラッシュコマンドを使用してください。詳細は `.claude/commands/commit-helper.md` を参照。
