# NestJS-Pino ロギング実装ガイド

## 概要

2025年6月29日にNestJS-Pinoによるロギング機能を実装しました。このドキュメントでは、実装内容と使用方法を説明します。

## 実装内容

### 1. インストールしたパッケージ
```json
{
  "dependencies": {
    "nestjs-pino": "^4.4.0",
    "pino-http": "^10.5.0"
  },
  "devDependencies": {
    "pino-pretty": "^13.0.0"
  }
}
```

### 2. 環境変数設定
`.env`ファイルに以下を追加：
```bash
# Logging
LOG_LEVEL=debug          # ログレベル (trace|debug|info|warn|error|fatal|silent)
LOG_PRETTY_PRINT=true    # 開発環境での見やすい表示
```

### 3. 主要な設定ファイル

#### app.module.ts
```typescript
LoggerModule.forRoot({
  pinoHttp: {
    name: 'dojin-management',
    level: process.env.LOG_LEVEL || 'info',
    transport: /* pino-pretty設定 */,
    serializers: /* リクエスト/レスポンスのシリアライザー */,
    customSuccessMessage: /* 成功メッセージのカスタマイズ */,
    customErrorMessage: /* エラーメッセージのカスタマイズ */
  }
})
```

#### main.ts
```typescript
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bufferLogs: true,
})
app.useLogger(app.get(Logger))
```

## 使用方法

### サービス/コントローラーでのログ出力

```typescript
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name)

  async someMethod() {
    // 情報ログ
    this.logger.log('処理を開始します', { userId: 123 })
    
    // デバッグログ
    this.logger.debug('詳細情報', { data: someData })
    
    // 警告ログ
    this.logger.warn('注意が必要な操作', { action: 'delete' })
    
    // エラーログ
    this.logger.error('エラーが発生しました', error.stack, { context: additionalInfo })
  }
}
```

### ログレベル

優先度の高い順：
1. `fatal` - アプリケーション停止レベルのエラー
2. `error` - エラー情報
3. `warn` - 警告情報
4. `info` - 一般的な情報（本番環境のデフォルト）
5. `debug` - デバッグ情報（開発環境のデフォルト）
6. `trace` - 詳細なトレース情報
7. `silent` - ログ出力なし（テスト環境で使用）

## 自動記録される情報

### HTTPリクエスト/レスポンス
- メソッド（GET, POST等）
- URL
- ステータスコード
- レスポンスタイム
- リクエストパラメータ
- クエリパラメータ

### 出力例

**開発環境（pino-pretty）**:
```
[2025-06-29 10:30:45.123] INFO (dojin-management): GET /books - 200
    method: "GET"
    url: "/books"
    statusCode: 200
    responseTime: 45

[2025-06-29 10:30:46.456] INFO (BooksService): 新規書籍を作成します
    title: "テスト書籍"
```

**本番環境（JSON）**:
```json
{"level":30,"time":1719625845123,"pid":12345,"hostname":"server","name":"dojin-management","msg":"GET /books - 200","method":"GET","url":"/books","statusCode":200,"responseTime":45}
```

## ログファイル

開発環境では以下にもログが保存されます：
- `./logs/app.log`

※ `.gitignore`に追加済みのため、Gitには含まれません。

## テスト環境での設定

統合テスト実行時は自動的にログが無効化されます：
```bash
LOG_LEVEL=silent pnpm test:integration
```

## トラブルシューティング

### ログが表示されない場合
1. `.env`ファイルの`LOG_LEVEL`を確認
2. `LOG_PRETTY_PRINT=true`が設定されているか確認
3. アプリケーションの再起動

### パフォーマンスへの影響
- 本番環境では`LOG_LEVEL=info`推奨
- `LOG_PRETTY_PRINT=false`でJSON出力（高速）

## 今後の拡張案

1. **ログローテーション**: ファイルサイズ/日付ベースのローテーション
2. **外部サービス連携**: CloudWatch, Datadog等へのログ送信
3. **メトリクス収集**: レスポンスタイムの統計情報
4. **アラート設定**: エラーレート監視

---

**実装日**: 2025年6月29日  
**関連ドキュメント**: [logging-nestjs-pino.md](./logging-nestjs-pino.md)