# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) への指針を提供します。

## プロジェクト概要

これは同人誌（自費出版物）を管理するためのNestJSアプリケーションです。使用技術：
- **ランタイム**: Node.js 22.16.0 (miseで管理)
- **パッケージマネージャー**: pnpm
- **データベース**: PostgreSQL + Prisma ORM
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
pnpm test:e2e         # E2Eテストの実行
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
pnpm prisma generate  # Prismaクライアントの生成
pnpm prisma migrate dev # 開発環境でマイグレーション実行
pnpm prisma studio    # Prisma Studio GUIを開く
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
- **Prisma**: データベースモデルは`prisma/schema.prisma`で定義
- **テスト**: 各controller/serviceには`.spec.ts`ファイルを作成

### 設定
- **TypeScript**: ES2023ターゲットでStrictモード有効
- **ポート**: `process.env.PORT`で設定可能（デフォルト: 3000）
- **データベース**: `DATABASE_URL`環境変数で接続（PostgreSQL on Docker、ポート: 15432）
- **Prismaクライアント**: `../generated/prisma`に生成
- **環境変数**: `.env.example`をコピーして`.env`を作成

### コードスタイル
- **インデント**: スペース2つ
- **クォート**: JS/TSではシングルクォート
- **行幅**: 80文字
- **末尾カンマ**: 必須
- Biomeで統一されたコード品質管理

## アプリケーション設計

### UI構成
- MPA（Multi Page Application）として実装
- サーバーサイドでEJSを使用してHTMLをレンダリング
- RESTfulなURL設計を採用

### URL設計
- 詳細は`docs/01_url.md`を参照
- HTTPメソッドオーバーライドでPUT/DELETEをサポート（_methodパラメータ使用）