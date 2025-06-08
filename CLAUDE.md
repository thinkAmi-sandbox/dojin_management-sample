# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) への指針を提供します。

## プロジェクト概要

これは同人誌（自費出版物）を管理するためのNestJSアプリケーションです。使用技術：
- **ランタイム**: Node.js 22.16.0 (miseで管理)
- **パッケージマネージャー**: pnpm
- **データベース**: PostgreSQL + Prisma ORM
- **テスト**: Vitest（ユニットテスト/E2Eテスト）、Supertest（HTTPテスト）
- **コード品質**: ESLint 9 + Biome（リンティング/フォーマット）

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
pnpm lint             # ESLintを自動修正付きで実行
pnpm format           # Prettierでコードをフォーマット
```

### データベース
```bash
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
- **データベース**: `DATABASE_URL`環境変数で接続
- **Prismaクライアント**: `../generated/prisma`に生成

### コードスタイル
- **インデント**: スペース2つ
- **クォート**: JS/TSではシングルクォート
- **行幅**: 80文字
- **末尾カンマ**: 必須
- ESLintとBiomeの両方が設定済み - 完全準拠のため両方を実行すること