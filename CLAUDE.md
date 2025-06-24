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
pnpm drizzle:generate     # マイグレーションファイルの生成
pnpm drizzle:migrate      # プロダクション用データベースのマイグレーション実行
pnpm drizzle:migrate:test # テスト用データベースのマイグレーション実行
pnpm drizzle:push         # プロダクション用にスキーマを直接反映
pnpm drizzle:push:test    # テスト用にスキーマを直接反映
pnpm drizzle:studio       # Drizzle Studio GUIを開く
```

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
- **テスト**: 詳細は`docs/02_test.md`を参照。ユニット/統合/E2Eの3層構造

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
- 詳細は`docs/db/`ディレクトリを参照
- 現在実装済みのテーブル：
  - `Book`: 書籍情報の管理（タイトル、サブタイトル、説明、ページ数、執筆ステータス）
  - `Deadline`: 締切情報の管理（タイトル、締切日、説明、書籍との関連）
  - `Author`: 執筆者情報の管理（名前、メールアドレス、プロフィール）
  - `BookAuthor`: 書籍と執筆者の多対多関連テーブル
  - `PrintingCompany`: 印刷所情報の管理（印刷所名、公式サイト、備考）
  - `Submission`: 入稿情報の管理（書籍・印刷所との関連、ステータス、部数、コスト、配送情報）

- 実装済みのテーブル（2025年6月22日追加）：
  - `Event`: イベント情報の管理（イベント名、開催日、会場、申込期間、説明）
  - `Circle`: サークル情報の管理（サークル名、代表者名、連絡先、説明）

- 実装済みのテーブル（2025年6月24日追加）：
  - `CircleAuthor`: サークルメンバー関連テーブル（サークルと執筆者の多対多関係、役割、参加期間）

- 実装予定のテーブル：
  - `Exhibit`: 出展申込情報の管理（イベント・サークルとの関連、ステータス、スペース情報）
  - `ExhibitBook`: 出展書籍関連テーブル（出展申込と書籍の多対多関係、頒布予定数、価格）

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

#### **YOU MUST**: 段階的テスト実装アプローチ

**Step 1: ミニマム実装テスト（1-2テスト）**
- [ ] 最小限の成功ケースのみ実装
- [ ] 基本的な表示・更新機能の確認
- [ ] この段階でテストが失敗することを確認

**Step 2: バリデーションテスト追加（2-3テスト）**
- [ ] 必須項目のバリデーションエラー
- [ ] 基本的なデータ型エラー
- [ ] Step 1のテストが通ることを確認してから追加

**Step 3: エッジケーステスト追加（残りテスト）**
- [ ] 存在しないリソースエラー
- [ ] 空値・特殊ケース処理
- [ ] Step 1-2のテストが全て通ることを確認してから追加

#### **避けるべきパターン**
- ❌ 一度に9テスト全て作成する
- ❌ 複雑なケースから先に実装する
- ❌ テスト失敗原因の複合化

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


### 2-6. テンプレートシステム実装時の追加検証

EJSテンプレートシステムやビューファイルを扱う機能を実装する際は、以下の追加検証を必須とします：

#### ビルド設定の確認
- `nest-cli.json` の `assets` 設定でビューファイルが適切にコピーされるか確認
- ビルド後の `dist/` ディレクトリ構造とアプリケーションのパス設定が整合しているか確認

#### **YOU MUST**: 正しいnest-cli.json設定
```json
{
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": ["views/**/*"]
  }
}
```
- **注意**: `"src/views/**/*"` ではなく `"views/**/*"` を使用
- **注意**: 複雑なoutDir指定は避け、シンプルな形式を使用

#### **YOU MUST**: 環境対応のmain.ts設定
```typescript
// __dirnameがdist/srcを含むかどうかでビルド後か判定
const isBuilt = __dirname.includes('dist')
const viewsPath = isBuilt
  ? join(__dirname, '..', 'views')  // dist/views
  : join(__dirname, 'views')        // src/views
app.setBaseViewsDir(viewsPath)
```

#### よくある設定エラーと対処法
- **エラー**: "Failed to lookup view" in views directory "/path/to/dist/src/views"
  - **原因**: nest-cli.jsonでビューファイルがコピーされていない
  - **対処**: assets設定を `"views/**/*"` に修正
- **エラー**: 開発環境では動作するが本番ビルドでエラー
  - **原因**: main.tsで環境別パス設定ができていない
  - **対処**: 上記の環境判定ロジックを追加

#### 複数環境での動作確認
- **YOU MUST**: 開発サーバーでの動作確認はユーザーが行います
- **YOU MUST**: ビルド後の実行での動作確認はユーザーが行います  
- **YOU MUST**: IDE（WebStorm等）からの実行での動作確認はユーザーが行います
- Claude Codeは動作確認用のコマンド実行は行わず、ユーザーに確認を依頼します

#### パス設定の論理的検証
- `__dirname` とビルド後のディレクトリ構造の関係を理解
- `setBaseViewsDir()` で指定するパスが実際のファイル配置と一致するか確認
- 開発時: `src/views/` → 本番時: `dist/views/` となることを確認

これらの検証を怠ると、開発環境では動作するが本番ビルドやIDE実行で失敗する問題が発生する可能性があります。詳細は `docs/02_view_configuration.md` を参照してください。

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

**業界標準**: `beforeEach`でのクリーンアップが推奨（Ruby DatabaseCleaner、Jest、pytest等）

**基本原則（2025年6月21日統一完了）**:
- **`beforeEach`のみ**: 各テスト開始時にクリーンな状態を保証（推奨・統一済み）
- **afterEch削除完了**: 全36ファイルでafterEchクリーンアップを完全削除
- **フレーキーテスト解消**: 二重クリーンアップ削除による競合状態回避

#### **YOU MUST**: 統一されたクリーンアップパターン（2025年6月21日完了）

**統一パターン: beforeEachのみ（全36ファイル適用済み）**
```typescript
beforeEach(async () => {
  // 各テスト前に全データをクリーンアップ（他のテストファイルの影響を除去）
  await testDbUtils.cleanupDatabase()
  
  // テスト用データの作成
  // ...
})
```
- **適用完了**: 36ファイル全てで統一済み（削除系テストを含む）
- **効果確認済み**: フレーキーテスト解消、パフォーマンス向上、デバッグ性向上
- **業界標準準拠**: Ruby DatabaseCleaner、Jest、pytest等と同じパターン

**旧パターン（廃止済み）: beforeEach + afterEach**
- **削除完了**: 全ファイルでafterEch使用を完全削除
- **削除理由**: 冗長処理、競合状態、フレーキーテストの原因
- **例外なし**: 削除系テストも含めて全ファイルでbeforeEchのみに統一

#### **YOU MUST**: フレーキーテスト修正完了記録（2025年6月21日）

**完了したフレーキーテスト解消プロジェクト**:

**Phase 1: 不要import削除（完了）**
1. 9ファイルのafterEchのimport削除
2. 未使用コード削除によるコード品質向上

**Phase 2: afterEchのみファイル変更（完了）**
1. 25ファイルでafterEch→beforeEchに移行
2. 業界標準パターンへの統一

**Phase 3: 両方パターンファイル統一（完了）**
1. 6ファイルでafterEch削除、beforeEchのみに統一
2. 削除系テストも含めて全ファイル統一

**最終検証結果（完了）**:
1. 全統合テスト実行で252/252テスト成功確認（2025年6月22日更新）
2. フレーキーテスト完全解消とパフォーマンス向上を確認
3. 36ファイル全てでbeforeEchのみパターン統一
4. testDbUtils.cleanupDatabase()にEvent/Submission/Circle対応追加完了

#### **YOU MUST**: 解決済み問題パターンと対処法

| 問題 | 原因 | 解決方法 | 現在の状態 |
|------|------|----------|-----------|
| **403エラーがランダム発生** | afterEchでの競合状態 | afterEch削除、beforeEchのみ使用 | ✅ 解決済み（36ファイル全て） |
| **expected 1 but got 16** | 他ファイルからのデータ残留 | beforeEchでクリーンアップ強化 | ✅ 解決済み（全ファイル統一） |
| **テストファイル間の影響** | afterEch削除による副作用 | beforeEch統一で根本解決 | ✅ 解決済み（例外なし） |
| **削除処理の検証失敗** | 前回テストデータの蓄積 | beforeEchクリーンアップで解決 | ✅ 解決済み（削除系も統一） |

#### **YOU MUST**: 新規テストファイル作成時のテンプレート（統一パターン）

```typescript
describe('Feature Test', () => {
  let app: INestApplication
  let drizzleService: DrizzleService

  beforeAll(async () => {
    // アプリケーション初期化
  })

  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  beforeEach(async () => {
    // 各テスト前に全データをクリーンアップ（統一済みパターン）
    await testDbUtils.cleanupDatabase()
    
    // テスト用データ作成
    // ...
  })

  // afterEch は一切使用しない（完全廃止済み）
  // 理由: フレーキーテスト防止、業界標準準拠、パフォーマンス向上

  describe('テストケース', () => {
    // テスト実装
  })
})
```

#### デバッグ時の確認事項（解決済み問題の参考）

1. **データ蓄積確認**: `expect(data).toHaveLength(1) but got 16` → ✅ beforeEchクリーンアップ統一で解決済み
2. **フレーキーテスト**: 断続的な403/400エラー → ✅ afterEch完全削除で解決済み
3. **テストファイル依存**: 単体実行では成功、全体実行で失敗 → ✅ 全ファイル統一で解決済み
4. **データベースリセット**: `pnpm drizzle:push:test` で強制リセット可能（緊急時のみ）

**現在の状況**: 252/252テスト成功、フレーキーテスト完全解消、業界標準準拠完了（2025年6月22日更新）

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

## ValidationPipe統一リファクタリング完了記録

### 🎉 2025年6月21日完了 🎉

**ValidationPipe統一リファクタリングプロジェクトが完全完了しました！**

#### 主要成果
- **手動バリデーション完全削除**: 約300行のコード削減
- **統合テスト100%成功**: 195/195テスト成功維持
- **DTO標準化完了**: 12ファイル、31件のメッセージ統一
- **型安全性向上**: any型削除、厳密な型定義
- **ValidationExceptionFilter**: 全パス対応、MPA用エラーハンドリング

#### 確立されたパターン
1. **コントローラー**: ValidationPipe + @UsePipes統一
2. **DTO**: @Transform + class-validator統一
3. **エラーハンドリング**: ValidationExceptionFilter自動処理
4. **メッセージ**: 日本語エラーメッセージ統一

#### 開発効率向上
- 新機能実装時のバリデーション処理が大幅簡素化
- 一貫したエラーハンドリングによる予測可能な動作
- チーム開発における明確なコーディング規約確立

詳細は `temp_memory/validation-refactoring-plan.md` を参照。

## 入稿機能実装完了記録

### 🎉 2025年6月21日完了（Phase 3-2 コスト集計機能追加実装） 🎉

**入稿機能（Submissions）の基本機能から高度な集計機能まで完全実装が完了しました！**

#### 主要成果
- **Phase 1 基本機能**: 一覧・詳細・作成機能完全実装
- **Phase 2 編集・削除機能**: 編集・削除機能完全実装
- **Phase 3-1 進行中入稿一覧**: 納期管理・進捗確認機能実装
- **Phase 3-2 コスト集計機能**: 印刷所別・書籍別・期間別集計機能実装
- **統合テスト207件全通過**: 新機能含む全テスト成功維持
- **外部キー関連**: 書籍・印刷所との適切な関連実装
- **JavaScript UI**: 削除確認ダイアログ等のユーザビリティ機能

#### 実装されたエンドポイント
- `GET /submissions` - 入稿一覧
- `GET /submissions/in-progress` - 進行中入稿一覧（納期順表示）
- `GET /submissions/costs` - コスト集計・分析画面（フィルタリング対応）
- `GET /books/:bookId/submissions` - 書籍別入稿履歴
- `GET /books/:bookId/submissions/new` - 新規入稿作成フォーム
- `POST /books/:bookId/submissions` - 入稿作成処理
- `GET /submissions/:id` - 入稿詳細
- `GET /submissions/:id/edit` - 入稿編集フォーム
- `PUT /submissions/:id` - 入稿更新処理（HTTPメソッドオーバーライド対応）
- `DELETE /submissions/:id` - 入稿削除処理（HTTPメソッドオーバーライド対応）

#### 技術的な実装内容
- **Drizzle ORM**: JOIN処理による関連データ取得、WHERE/ORDER BY条件での絞り込み
- **高度な集計処理**: GROUP BY、SUM()、AVG()、COUNT()等の集計関数活用
- **ValidationPipe統一**: class-validator + @Transform統一パターン適用
- **コスト自動計算**: 印刷費+送料+その他費用=合計の自動計算機能
- **ステータス管理**: 5段階ステータス（準備中・入稿済み・印刷中・納品済み・キャンセル）
- **納期管理機能**: 進行中入稿の納期順表示、3日以内の緊急納期アラート
- **コスト集計機能**: 印刷所別・書籍別・期間別の多軸集計とフィルタリング
- **レスポンシブUI**: セクション構造化によるモバイル対応、統計情報表示
- **エラーハンドリング**: 404・400エラーの適切な処理

#### 確立された開発パターン
1. **実装前チェックリスト**: スキーマ定義確認、既存パターン分析の4段階手順
2. **段階的テスト実装**: ミニマム→バリデーション→エッジケースの3段階アプローチ
3. **削除機能パターン**: 存在確認→削除→リダイレクトの標準パターン確立
4. **型安全性**: TypeScript型定義の事前修正によるエラー回避

#### 開発効率向上への貢献
- 既存パターン（印刷所機能）踏襲による高速実装
- 統合テスト駆動開発による仕様明確化・エラー早期発見
- エラー解決パターン辞書による効率的デバッグ
- 段階的実装戦略による複雑性回避

#### Phase 3-1 進行中入稿一覧の特徴
- **業務効率化**: 進行中案件の一元管理による作業効率向上
- **納期管理**: 緊急度順表示と3日以内アラートによる納期遅延防止
- **統計情報**: 進行中件数・緊急件数の可視化
- **既存パターン活用**: findAll()メソッドパターンを拡張したWHERE/ORDER BY実装

#### Phase 3-2 コスト集計機能の特徴
- **多軸集計**: 印刷所別・書籍別・期間別の3軸同時集計
- **フィルタリング**: 期間指定・ステータス絞り込みによる柔軟な分析
- **統計情報**: 総コスト・平均・最大・最小の自動計算表示
- **レスポンシブUI**: モバイル対応の集計テーブルとフィルター機能
- **Drizzle ORM活用**: GROUP BY、集計関数による型安全な集計処理

詳細は `temp_memory/submissions-todo.md` を参照。

## ナビゲーション改善プロジェクト完了記録

### 🎉 2025年6月21日完了 🎉

**直接URL入力依存の解消とユーザビリティ向上プロジェクトが完全完了しました！**

#### 主要成果
- **Phase 1 グローバルナビゲーション拡充**: 4つの主要機能への統一されたアクセス
- **Phase 2 書籍詳細画面機能拡充**: 入稿関連機能への効率的アクセス  
- **Phase 3 入稿一覧サブナビゲーション**: タブ形式による高度機能アクセス
- **Phase 4 E2Eナビゲーション統合**: 完全なナビゲーションフローの検証
- **統合テスト238件全通過**: 新機能含む全テスト成功維持
- **TDD実践**: テストファーストによる品質保証実装

#### 実装されたナビゲーション機能
**グローバルヘッダーナビゲーション**:
- ホーム、書籍一覧、執筆者一覧、印刷所一覧、入稿一覧の統一アクセス
- レスポンシブ対応（モバイル・タブレット対応）
- ホバーエフェクトとアクセシビリティ対応

**書籍詳細画面からの入稿アクセス**:
- 「📋 入稿履歴」ボタン → `/books/:id/submissions`
- 「➕ 新規入稿」ボタン → `/books/:id/submissions/new`
- アイコン付きボタンとtooltip実装
- 適切な配置順序（執筆者管理→入稿関連→ステータス変更）

**入稿一覧サブナビゲーション**:
- 「全て」「進行中のみ」「コスト集計」タブ形式ナビゲーション
- アクティブ状態の視覚的フィードバック
- 3つの入稿ページ全てで統一されたデザイン

**E2Eナビゲーション**:
- 直接URL入力なしで全機能アクセス可能
- 完全なナビゲーションフローの検証
- 一貫性テスト（全ページで統一されたナビゲーション）

#### 技術的な実装内容
- **TDD実践**: RED→GREEN→REFACTORサイクルによる品質保証
- **統合テスト駆動**: 各フェーズでテストファーストによる実装
- **レスポンシブ対応**: モバイル・タブレット環境での最適表示
- **ホーム画面実装**: AppControllerのEJSテンプレート化
- **統一デザイン**: ホバーエフェクト、アクティブ状態、アイコン活用
- **アクセシビリティ**: tooltip、aria-label等の対応

#### 確立された開発パターン
1. **TDD段階的実装**: テスト作成→失敗確認→実装→成功確認の4段階
2. **フェーズ分割戦略**: 複雑なプロジェクトの段階的進行
3. **E2Eテスト設計**: 完全なユーザーフローによる品質保証
4. **統合テスト活用**: 各機能の協調動作確認

#### UX大幅改善効果
- **直接URL入力不要**: 全機能にGUIからアクセス可能
- **作業効率向上**: 関連機能への迅速な移動（書籍→入稿、入稿一覧→高度機能）
- **使いやすさ向上**: 直感的なナビゲーションによるユーザビリティ向上
- **一貫性確保**: 全ページで統一されたナビゲーション体験

#### 保守性・拡張性向上
- **テスト保護**: 全ナビゲーション機能がテストでカバー
- **設計一貫性**: 統一されたナビゲーションパターンの確立
- **拡張性**: 新機能追加時のナビゲーション拡張が容易
- **実装パターン**: 今後のナビゲーション機能追加の指針確立

詳細は `todo_memory/navigation-improvement-plan.md` を参照。

## ナビゲーション改善プロジェクト計画（アーカイブ）

### 🎯 2025年6月21日計画策定→完了

**直接URL入力依存の解消とユーザビリティ向上プロジェクト**

#### 問題の特定
現在のアプリケーションでは、以下の機能に直接URL入力でしかアクセスできない状況：

**📍 グローバルナビゲーション不足**：
- `/authors` - 執筆者一覧
- `/printing-companies` - 印刷所一覧  
- `/submissions` - 入稿一覧
- `/submissions/in-progress` - 進行中入稿一覧
- `/submissions/costs` - 入稿コスト集計

**📍 書籍詳細から入稿機能へのアクセス不足**：
- `/books/:bookId/submissions` - 書籍の入稿履歴
- `/books/:bookId/submissions/new` - 書籍から新規入稿作成

**📍 入稿一覧から高度機能へのアクセス不足**：
- `/submissions/in-progress` - 進行中入稿一覧
- `/submissions/costs` - コスト集計画面

#### 解決方針
**TDD（テスト駆動開発）方式**でのナビゲーション改善実装

#### 実装計画

##### Phase 1: グローバルナビゲーション拡充（TDD）
**1-1. 統合テスト作成**
- `test/integration/navigation/global-navigation.integration.spec.ts` 作成
- 全ページでヘッダーに以下のリンクが存在することをテスト：
  - 書籍一覧、執筆者一覧、印刷所一覧、入稿一覧
- **テスト実行して失敗を確認**

**1-2. プロダクションコード実装**
- `shared/header.ejs` にナビゲーションリンク追加
- レスポンシブ対応（モバイルではハンバーガーメニュー）

**1-3. テスト成功確認**
- 統合テストが全て通ることを確認
- ブラウザで動作確認

##### Phase 2: 書籍詳細画面の機能拡充（TDD）
**2-1. 統合テスト作成**
- `test/integration/books/show-navigation.integration.spec.ts` 作成
- 書籍詳細画面に以下のボタンが存在することをテスト：
  - "入稿履歴" → `/books/:id/submissions`
  - "新規入稿" → `/books/:id/submissions/new`
- **テスト実行して失敗を確認**

**2-2. プロダクションコード実装**
- `books/show.ejs` に入稿関連ボタン追加
- 適切なスタイリングとアイコン

**2-3. テスト成功確認**
- 統合テストが全て通ることを確認
- 実際の画面遷移を確認

##### Phase 3: 入稿一覧画面の高度機能アクセス（TDD）
**3-1. 統合テスト作成**
- `test/integration/submissions/index-navigation.integration.spec.ts` 作成
- 入稿一覧画面に以下のリンクが存在することをテスト：
  - "進行中のみ表示" → `/submissions/in-progress`
  - "コスト集計" → `/submissions/costs`
- **テスト実行して失敗を確認**

**3-2. プロダクションコード実装**
- `submissions/index.ejs` にサブナビゲーション追加
- タブ形式またはボタン形式で実装

**3-3. テスト成功確認**
- 統合テストが全て通ることを確認
- 画面遷移とレイアウトを確認

##### Phase 4: 全体統合テスト
**4-1. E2Eナビゲーションテスト作成**
- `test/integration/navigation/full-navigation.integration.spec.ts` 作成
- 直接URL入力なしで全機能にアクセス可能かテスト
- **テスト実行して全て通ることを確認**

**4-2. リファクタリング（必要に応じて）**
- コード重複の削除
- スタイルの統一

#### 期待される効果
- **UX大幅改善**: 直接URL入力不要でスムーズな画面遷移
- **作業効率向上**: 各機能への迅速なアクセス
- **保守性向上**: テスト保護されたナビゲーション機能

#### 開発手法
**各フェーズの進め方**：
1. 統合テスト作成（RED）
2. テスト失敗確認
3. プロダクションコード実装（GREEN）
4. テスト成功確認
5. リファクタリング（REFACTOR）

**優先度**: 高（UX改善によるシステム価値向上）
**工数見積**: 6-8時間（TDD含む）
**実装期間**: 2025年6月21日〜

詳細は `todo_memory/navigation-improvement-plan.md` を参照。

## イベント管理機能実装完了記録

### 🎉 2025年6月22日完了（Phase 1-B: イベント管理アプリケーション実装） 🎉

**イベント管理機能（Events）の基本CRUD機能が完全実装完了しました！**

#### 主要成果
- **TDD（統合テスト駆動開発）**でミニマム実装完了
- **ValidationPipe統一パターン**を適用したDTO設計
- **印刷所機能パターン踏襲**による高品質実装
- **全CRUD機能**実装完了（一覧・詳細・作成・編集・削除）

#### 実装されたエンドポイント
- `GET /events` - イベント一覧
- `GET /events/new` - 新規イベント登録フォーム
- `POST /events` - イベント作成処理
- `GET /events/:id` - イベント詳細
- `GET /events/:id/edit` - イベント編集フォーム
- `PUT /events/:id` - イベント更新処理（HTTPメソッドオーバーライド対応）
- `DELETE /events/:id` - イベント削除処理（HTTPメソッドオーバーライド対応）

#### 技術的実装内容
- **DTO設計**: CreateEventDto, UpdateEventDto（ValidationPipe統一パターン）
- **サービス層**: EventsService（印刷所パターン踏襲、型安全な実装）
- **コントローラー層**: EventsController（NestJS標準命名、ValidationPipe統合）
- **ビューファイル**: EJSテンプレート4ファイル（レスポンシブ対応）
- **モジュール統合**: EventsModule作成、app.module.ts統合完了

#### 確立された開発パターン
1. **実装前チェックリスト**: スキーマ確認→既存パターン分析→依存関係確認→データフロー設計
2. **TDD段階的実装**: ミニマムテスト→失敗確認→実装→成功確認
3. **ValidationPipe統一**: @Transform + class-validator統一パターン
4. **エラーハンドリング**: NotFoundException + ParseIntPipe統一

#### 動作確認済み機能
- **HTTP 200レスポンス**: `/events`エンドポイント正常動作
- **データ表示**: イベントデータの一覧表示確認
- **日付フォーマット**: 日本語ロケール（2024/12/7形式）
- **レイアウト統合**: グローバルナビゲーション適用
- **ビルド成功**: `dist/views/events/`にビューファイルコピー完了

#### データベーススキーマ実装済み
- **eventsテーブル**: `src/db/schema.ts`に実装済み
- **型定義**: Event, NewEvent型をexport済み
- **マイグレーション**: `drizzle/0006_huge_omega_sentinel.sql`適用済み

#### 次のステップ
- **Phase 1-C**: サークル管理機能（Circles）実装予定
- **Phase 1-D**: 出展申込機能（Exhibits）実装予定
- **Phase 2**: イベント・サークル・出展の関連機能実装予定

詳細は `todo_memory/06_event_exhibit_implementation_plan.md` を参照。

## サークル管理機能スキーマ実装完了記録

### 🎉 2025年6月22日完了（Phase 1-C-A: サークル管理用データベーススキーマ実装） 🎉

**サークル管理機能（Circles）のデータベーススキーマ実装が完全完了しました！**

#### 主要成果
- **circlesテーブルスキーマ実装**: 既存パターン踏襲のPascalCase命名
- **マイグレーション適用完了**: テスト用・プロダクション用両方成功
- **testDbUtils.cleanupDatabase()拡張**: Event/Submission/Circle対応追加
- **統合テスト252件全通過**: データベースクリーンアップ問題根本解決

#### 実装されたテーブル定義
```typescript
export const circles = pgTable('Circle', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  representativeName: varchar('representativeName', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Circle = typeof circles.$inferSelect;
export type NewCircle = typeof circles.$inferInsert;
```

#### 技術的実装内容
- **データベーススキーマ**: PascalCase テーブル名、camelCase フィールド名
- **マイグレーションファイル**: `drizzle/0007_exotic_felicia_hardy.sql`
- **型定義**: Circle, NewCircle型をexport
- **testDbUtils修正**: Event/Submission/Circleテーブル対応追加

#### 重要な修正内容
- **データベースクリーンアップ問題解決**: testDbUtils.cleanupDatabase()にEvent/Submission/Circle対応追加
- **統合テスト修正**: イベント機能のレイアウトシステム対応
- **フレーキーテスト根本解決**: データベースクリーンアップ統一で252件全通過

#### 検証結果
- **統合テスト**: 252/252テスト通過 ✅
- **型チェック**: エラー0件 ✅
- **マイグレーション**: テスト用・プロダクション用両方成功 ✅
- **コミット**: `2626d56` 正常完了 ✅

#### 次のステップ
- **Phase 1-C-B**: サークル管理アプリケーション実装（TDD統合テスト駆動）
- **Phase 1-D**: 出展申込機能スキーマ・アプリケーション実装
- **Phase 2**: イベント・サークル・出展の関連機能実装

詳細は `todo_memory/06_event_exhibit_implementation_plan.md` を参照。

## サークル管理機能実装完了記録

### 🎉 2025年6月23日完了（Phase 1-C-B: サークル管理アプリケーション実装） 🎉

**サークル管理機能（Circles）の基本CRUD機能が完全実装完了しました！**

#### 主要成果
- **TDD（統合テスト駆動開発）**でミニマム実装完了
- **ValidationPipe統一パターン**を適用したDTO設計
- **イベント機能パターン踏襲**による高品質実装
- **全CRUD機能**実装完了（一覧・詳細・作成・編集・削除）

#### 実装されたエンドポイント
- `GET /circles` - サークル一覧
- `GET /circles/new` - 新規サークル登録フォーム
- `POST /circles` - サークル作成処理
- `GET /circles/:id` - サークル詳細
- `GET /circles/:id/edit` - サークル編集フォーム
- `PUT /circles/:id` - サークル更新処理（HTTPメソッドオーバーライド対応）
- `DELETE /circles/:id` - サークル削除処理（HTTPメソッドオーバーライド対応）

#### 技術的実装内容
- **DTO設計**: CreateCircleDto, UpdateCircleDto（ValidationPipe統一パターン）
- **サービス層**: CirclesService（印刷所パターン踏襲、型安全な実装）
- **コントローラー層**: CirclesController（NestJS標準命名、ValidationPipe統合）
- **ビューファイル**: EJSテンプレート4ファイル（レスポンシブ対応）
- **モジュール統合**: CirclesModule作成、app.module.ts統合完了

#### 確立された開発パターン
1. **実装前チェックリスト**: スキーマ確認→既存パターン分析→依存関係確認→データフロー設計
2. **TDD段階的実装**: ミニマムテスト→失敗確認→実装→成功確認
3. **ValidationPipe統一**: @Transform + class-validator統一パターン
4. **エラーハンドリング**: NotFoundException + ParseIntPipe統一

#### 技術的検証結果
- **ビルド**: ✅ 成功（dist/views/circles/ にビューファイルコピー確認）
- **統合テスト**: ✅ 2/2テスト通過（サークル機能のみ）
- **Lint**: ✅ 成功（6ファイル自動修正、コード品質向上）
- **型チェック**: ✅ エラー0件
- **動作確認**: ✅ ユーザー確認済み

#### データベーススキーマ実装済み
- **circlesテーブル**: `src/db/schema.ts`に実装済み
- **型定義**: Circle, NewCircle型をexport済み
- **マイグレーション**: `drizzle/0007_exotic_felicia_hardy.sql`適用済み

#### 次のステップ
- **Phase 1-D**: 出展申込機能（Exhibits）実装予定
- **Phase 2**: イベント・サークル・出展の関連機能実装予定

詳細は `todo_memory/06_event_exhibit_implementation_plan.md` を参照。

## サークルメンバー管理機能実装完了記録

### 🎉 2025年6月24日完了（Phase 3-1-B: サークルメンバー管理アプリケーション実装） 🎉

**サークルメンバー管理機能（Circle Members）の完全実装が完了しました！**

#### 主要成果
- **TDD（統合テスト駆動開発）**による品質保証実装
- **複合主キー対応**（circleId + authorId）の多対多関係管理
- **ValidationPipe統一パターン**適用とValidationExceptionFilter統合
- **JOIN処理による関連データ取得**とフィルタリング機能実装

#### 実装されたエンドポイント
- `GET /circles/:circleId/members` - サークルメンバー一覧（役割・参加期間表示）
- `GET /circles/:circleId/members/add` - メンバー追加フォーム（利用可能執筆者フィルタリング）
- `POST /circles/:circleId/members` - メンバー追加処理（バリデーション統合）
- `GET /circles/:circleId/members/:authorId/edit` - メンバー編集フォーム
- `PUT /circles/:circleId/members/:authorId` - メンバー更新処理（HTTPメソッドオーバーライド対応）
- `DELETE /circles/:circleId/members/:authorId` - メンバー削除処理

#### 技術的実装内容
- **複合主キー管理**: circleId + authorId の関係管理
- **JOIN処理**: Drizzle ORMでのinner join、select構文活用
- **フィルタリング**: notInArray()による利用可能執筆者絞り込み
- **参加期間管理**: joinedAt, leftAtによるアクティブ/非アクティブ管理
- **役割管理**: representative/member/guest の3段階役割システム
- **ValidationExceptionFilter拡張**: サークルメンバー管理パス対応追加

#### 確立された開発パターン
1. **実装前チェックリスト強化**: 複合主キー・多対多関係の事前設計確認
2. **404エラーテスト修正**: NestJSデフォルト動作（JSON応答）への対応
3. **ValidationExceptionFilter統合**: テンプレート変数不足問題の根本解決
4. **段階的エラー解決**: 2Failed → 0Failed への体系的問題解決

#### 重要な問題解決事例
1. **404エラーテスト**: HTML期待からJSON応答への修正
2. **ValidationExceptionFilter**: prepareFormDataメソッドへのサークルメンバーパス追加
3. **テンプレート変数不足**: authors, roles変数の適切な提供
4. **console.logクリーンアップ**: デバッグログ削除による本番対応

#### 技術的検証結果
- **統合テスト**: 6/6通過（2Failed → 0Failed達成） ✅
- **全統合テスト**: 275/275通過（他機能への影響なし） ✅
- **型チェック**: エラー0件 ✅
- **Lint**: 自動整形完了 ✅
- **console.logクリーンアップ**: 7箇所削除完了 ✅

#### 開発効率向上への貢献
- 複合主キー実装パターンの確立
- ValidationExceptionFilter統合ベストプラクティス確立
- 多対多関係管理の標準テンプレート確立
- TDD段階的実装による品質保証プロセス確立

#### 次のステップ
- **Phase 3-2**: 出展書籍管理機能（ExhibitBooks）実装予定
- **Phase 4**: イベント・サークル・出展の統合機能実装予定

この実装により、サークル運営における執筆者管理の効率化と、システム全体の多対多関係管理能力が大幅に向上しました。

---

## 3. Gitへコミットする

`/commit-helper` カスタムスラッシュコマンドを使用してください。詳細は `.claude/commands/commit-helper.md` を参照。
