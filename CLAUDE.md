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
docker compose up -d  # PostgreSQLコンテナの起動
docker compose down   # PostgreSQLコンテナの停止
pnpm drizzle:generate # マイグレーションファイルの生成
pnpm drizzle:migrate  # マイグレーションの実行
pnpm drizzle:push     # スキーマをデータベースに直接反映
pnpm drizzle:studio   # Drizzle Studio GUIを開く
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
  - `Book`: 書籍情報の管理（タイトル、サブタイトル、説明、ページ数）

### テスト設計
- 詳細は`docs/02_test.md`を参照
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
pnpm drizzle:migrate

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


### 2-4. テストを実行する

記述したテストコードを実行します。

```
# ユニットテストの実行
pnpm test

# integrationテストの実行
pnpm test:integration
```

テストが失敗する場合、テストが成功するまでプロダクションコードを修正します。



### 2-5. ユーザーに対して完成したか確認する

ユーザーに対して、実装した機能が問題ないかを確認します。


## 3. Gitへコミットする

コミットメッセージのsubjectには概要を、bodyには前回のコミット以降のすべてのプロンプトを、それぞれ記載します。

記載内容は全て日本語とします。
