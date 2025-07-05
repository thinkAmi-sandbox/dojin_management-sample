# EJSビューファイル設定ガイド

このドキュメントでは、NestJS + EJSでのビューファイル設定のベストプラクティスとトラブルシューティング方法を説明します。

## 概要

このプロジェクトはMPA（Multi Page Application）として設計されており、サーバーサイドでEJSテンプレートを使用してHTMLを生成します。開発環境と本番環境で異なるディレクトリ構造を持つため、適切な設定が重要です。

## ディレクトリ構造

### 開発環境
```
src/
├── views/
│   ├── authors/
│   ├── books/
│   ├── printing-companies/
│   ├── layouts/
│   └── shared/
└── main.ts
```

### 本番ビルド後
```
dist/
├── src/
│   └── main.js
└── views/              # ← nest-cli.jsonでコピーされる
    ├── authors/
    ├── books/
    ├── printing-companies/
    ├── layouts/
    └── shared/
```

## 正しい設定方法

### 1. nest-cli.json の設定

**正しい設定**:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": ["views/**/*"]
  }
}
```

**注意点**:
- `"views/**/*"` を使用（`src/views/**/*` ではない）
- シンプルなパターンマッチングを使用
- `outDir` の複雑な指定は避ける

### 2. main.ts の設定

**正しい設定**:
```typescript
import { join } from 'path'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // 環境判定: __dirnameにdistが含まれるかで判定
  const isBuilt = __dirname.includes('dist')
  const viewsPath = isBuilt
    ? join(__dirname, '..', 'views')  // 本番: dist/views
    : join(__dirname, 'views')        // 開発: src/views
  
  app.setBaseViewsDir(viewsPath)
  app.setViewEngine('ejs')
  
  // その他の設定...
}
```

**重要な点**:
- `__dirname.includes('dist')` で環境を判定
- 開発時と本番時で異なるパスを動的に設定
- `process.env.NODE_ENV` に依存しない判定方法

### 3. テスト環境の設定

**test/integration/setup-test-app.ts**:
```typescript
export function setupTestApp(app: INestApplication): void {
  const expressApp = app as NestExpressApplication
  
  // テスト環境では明示的にsrc/viewsを指定
  expressApp.setBaseViewsDir(join(__dirname, '..', '..', 'src', 'views'))
  expressApp.setViewEngine('ejs')
  
  // その他の設定...
}
```

## よくあるエラーと対処法

### エラー1: "Failed to lookup view"

**エラーメッセージ**:
```
Error: Failed to lookup view "printing-companies/index" in views directory "/path/to/dist/src/views"
```

**原因**:
- `nest-cli.json` でビューファイルがコピーされていない
- アプリケーションが `dist/src/views` を探しているが、実際には存在しない

**対処法**:
1. `nest-cli.json` の `assets` 設定を確認
2. `"views/**/*"` の形式に修正
3. `pnpm build` でビルドし直す
4. `dist/views/` ディレクトリにファイルがコピーされていることを確認

### エラー2: 開発環境では動作するが本番でエラー

**原因**:
- `main.ts` で環境別のパス設定ができていない
- 開発時の `src/views` パスがハードコードされている

**対処法**:
1. `main.ts` に環境判定ロジックを追加
2. 上記の「正しい設定」を参考に修正
3. 開発・本番両環境で動作確認

### エラー3: テストでビューファイルが見つからない

**原因**:
- テスト設定でビューファイルパスが正しく設定されていない

**対処法**:
1. `test/integration/setup-test-app.ts` を確認
2. 明示的に `src/views` パスを指定
3. 統合テストを実行して確認

## ベストプラクティス

### 1. ビューファイルの配置
- すべてのEJSファイルは `src/views/` 以下に配置
- 機能ごとにディレクトリを分ける（`books/`, `authors/` など）
- 共通テンプレートは `layouts/` と `shared/` に配置

### 2. 新機能実装時のチェックリスト
- [ ] `src/views/機能名/` ディレクトリを作成
- [ ] 必要なEJSファイルを作成
- [ ] 統合テストを作成・実行
- [ ] 開発サーバーで動作確認
- [ ] `pnpm build` 後の本番環境で動作確認

### 3. トラブルシューティング手順
1. `pnpm build` でビルド実行
2. `find dist -name "*.ejs"` でファイルがコピーされているか確認
3. `dist/views/` ディレクトリ構造をチェック
4. `main.ts` の環境判定ロジックを確認
5. 本番環境での動作テスト

## 関連ファイル

- `CLAUDE.md` - 開発ルールと基本設定
- `nest-cli.json` - ビルド設定
- `src/main.ts` - アプリケーション設定
- `test/integration/setup-test-app.ts` - テスト環境設定

## 参考情報

- [NestJS Assets](https://docs.nestjs.com/techniques/mvc#assets)
- [Express EJS](https://expressjs.com/en/guide/using-template-engines.html)
- [NestJS CLI Configuration](https://docs.nestjs.com/cli/configuration)