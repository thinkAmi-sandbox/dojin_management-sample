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

### テスト設計
- 詳細は`docs/test/overview.md`を参照
- 3層構造：ユニットテスト、統合テスト、E2Eテスト
- 統合テストはRSpecのrequest specに相当

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

#### **YOU MUST**: 実装前チェックリスト

新機能を実装する前に、以下の項目を必ず確認してください：

- [ ] **スキーマ定義の詳細確認**
  - `src/db/schema.ts`でテーブル定義を確認
  - **重要**: フィールド名の正確な確認（例: `websiteUrl`であって`officialSite`ではない）
  - データ型の確認（例: `pageCount`は`integer`型、`createdAt`は`timestamp`型）
  - enumの値を確認（例: 書籍ステータスは`planning`, `writing`, `editing`, `completed`）
  - **手順**: 実装前に必ず `Read` ツールでスキーマ定義を読み返す

- [ ] **既存の類似実装の確認**
  - 同じパターンの実装が既にあるか確認
  - **参考実装の優先順位**:
    1. 印刷所機能（完全なCRUD実装の模範例）
    2. 書籍機能（ステータス更新、部分更新の例）
    3. 執筆者機能（多対多関係の例）
  - JOIN処理、エラーハンドリング、ビューファイル構造を参考にする

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


### 2. 実装フェーズ

実際にプログラムを書きます。

なお、完成するまで、実装フェーズの作業を繰り返します。



### 2-1. 統合テストコードを書く

`./test/integration` ディレクトリに、統合テストのテストコードを書きます。

テスト作成後、テストが失敗することを確認します。

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


### **YOU MUST**: Gitコミット時の必須ルール

以下のルールは**必ず遵守**してください：

#### コミットメッセージ形式
- **subject**: 機能の概要を日本語で記載
- **body**: 前回のコミット以降のすべてのプロンプトを日本語で記載
- **ファイルパス**: ユーザー環境情報を隠すため `/path/to` に変換
- **署名**: 必ず以下を含める：
  ```
  🤖 Generated with [Claude Code](https://claude.ai/code)
  
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

#### プロンプト記載の詳細ルール

**YOU MUST**: 以下のルールを厳密に遵守してプロンプトを記載すること

- **完全記載**: プロンプトは一字一句そのまま記載（省略・要約は絶対禁止）
- **長文対応**: 長いエラーメッセージや複雑なプロンプトも含めて完全に記載
- **時系列保持**: 実際のプロンプト順序を正確に保持
- **唯一の例外**: ファイルパスのみ `/path/to` に変換（他は一切変更しない）
- **技術対応**: 長いコミットメッセージはHEREDOCで適切に分割

#### コミット前の必須確認手順

1. **プロンプト収集**: 前回コミット以降のプロンプトを全て書き出し
2. **完全性確認**: 各プロンプトをそのまま記載（要約・省略なし）
3. **変更点確認**: ファイルパス以外の変更がないことを確認
4. **順序確認**: 実際の時系列順序で記載されていることを確認

#### 必須チェック項目
- [ ] プロンプト履歴が**完全に**記載されている（省略・要約なし）
- [ ] ファイルパスが適切に変換されている  
- [ ] 日本語で記載されている
- [ ] 署名が含まれている
- [ ] 実際のプロンプト順序が保持されている

## ベストプラクティス

### 統合テスト駆動開発（TDD）

- **YOU MUST**: 新機能実装時は必ず統合テストから書き始める
- テストケースが仕様書の役割を果たし、実装の方向性が明確になる
- テストが通ることで実装の正しさが保証される

### 既存パターンの活用

- **YOU MUST**: 類似機能が既にある場合は、そのパターンを踏襲する
- 特に以下の実装は良いパターンとして参考にする：
  - 印刷所機能（CRUD全体の実装）
  - 書籍のステータス更新（部分更新の実装）
  - 書籍と執筆者の関連（多対多関係の実装）

### エラーハンドリング

#### 標準エラーハンドリングパターン

- **存在しないリソース**: `NotFoundException`を使用
- **バリデーションエラー**: `BadRequestException`を使用
- **権限エラー**: `ForbiddenException`を使用
- **サービス層**: 適切な例外を投げる
- **コントローラー層**: 基本的にはcatchせず、NestJSのグローバルフィルターに任せる

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

## 3. Gitへコミットする

- コミットメッセージのsubjectには概要を、bodyには前回のコミット以降のすべてのプロンプトを、それぞれ記載します。
- コミットメッセージにファイルパスを記述する場合、ユーザーの環境情報が漏洩しないよう、ルートディレクトリまでのパスは `/path/to` へと変換してください。
- 記載内容は全て日本語としてください。
