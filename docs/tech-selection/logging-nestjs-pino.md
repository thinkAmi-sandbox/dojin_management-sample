# ロギングライブラリ技術選定: NestJS-Pino

## 概要

- **選定日時**: 2025年6月29日
- **選定技術**: NestJS-Pino (nestjs-pino + pino-http)
- **決定者**: Claude Code + プロジェクトオーナー
- **選定結果**: NestJS-Pinoを採用

## 要件定義

### 必須要件
1. **リクエスト/レスポンスの自動記録**: 全HTTPリクエストの自動ログ記録
2. **JSON構造化ログ**: ログ管理ツールとの統合を考慮したJSON形式出力
3. **エラー情報の完全記録**: スタックトレースを含むエラー詳細
4. **パフォーマンス**: 高負荷時でもアプリケーションに影響を与えない
5. **NestJS統合**: NestJSのDIシステムとの親和性

### 希望要件
1. **開発時の見やすさ**: カラフルで読みやすいログ表示
2. **リクエストコンテキスト**: どのレイヤーからもリクエストIDを参照可能
3. **メンテナンス性**: 活発にメンテナンスされているライブラリ
4. **Claude Code親和性**: AIアシスタントが扱いやすい設定方法

## 比較検討した選択肢

### 1. NestJS-Pino
- GitHub: https://github.com/iamolegga/nestjs-pino
- npm: https://www.npmjs.com/package/nestjs-pino
- 週間ダウンロード数: 632,670（2024年時点）

### 2. Winston (nest-winston)
- GitHub: https://github.com/gremo/nest-winston
- npm: https://www.npmjs.com/package/nest-winston
- 週間ダウンロード数: 545,832（2024年時点）

### 3. Bunyan
- NestJS統合: カスタム実装が必要
- メンテナンス状況: 活発でない

### 4. Morgan
- HTTPリクエスト専用
- 汎用ロギングには不適

## 詳細比較表

| 評価項目 | NestJS-Pino | Winston | Bunyan | Morgan |
|---------|-------------|---------|---------|---------|
| **パフォーマンス** | ◎ 最速級 | ○ 良好 | ○ 良好 | ◎ 高速 |
| **JSON出力** | ◎ デフォルト | ○ 設定必要 | ◎ デフォルト | △ カスタム必要 |
| **NestJS統合** | ◎ 専用パッケージ | ◎ 専用パッケージ | △ 手動実装 | △ 手動実装 |
| **自動HTTPログ** | ◎ ミドルウェア不要 | △ 設定必要 | △ 設定必要 | ◎ 専用機能 |
| **リクエストコンテキスト** | ◎ AsyncLocalStorage | △ 追加実装必要 | △ 追加実装必要 | × なし |
| **開発時表示** | ◎ pino-pretty | ○ 設定可能 | ○ CLI付属 | △ 基本テキスト |
| **メンテナンス** | ◎ 活発 | ◎ 活発 | △ 停滞気味 | △ 停滞気味 |
| **エコシステム** | ○ 成長中 | ◎ 成熟 | ○ 安定 | △ 限定的 |
| **学習コスト** | ◎ 低い | △ 高い | ○ 中程度 | ◎ 低い |

## 選定理由

### 1. パフォーマンスの優位性
Pinoは非同期ログ処理と最適化されたシリアライゼーションにより、Node.jsログライブラリの中で最速級のパフォーマンスを実現。本番環境での負荷を最小限に抑える。

### 2. デフォルトでJSON構造化ログ
設定なしでJSON形式のログを出力。将来的なログ管理システム（ELKスタック等）との統合が容易。

### 3. リクエストコンテキストの自動管理
AsyncLocalStorageを使用し、HTTPリクエストのコンテキストを自動的に全レイヤーで利用可能。手動でのコンテキスト伝播が不要。

### 4. NestJSとの優れた統合
```typescript
// シンプルな設定
LoggerModule.forRoot({
  pinoHttp: {
    level: 'debug',
    transport: { target: 'pino-pretty' }
  }
})

// 使いやすいAPI
private readonly logger = new Logger(MyService.name);
this.logger.log('Operation completed', { userId, bookId });
```

### 5. 成長トレンド
週間ダウンロード数でnest-winstonを上回り、コミュニティでの採用が拡大中。

## 実装方針

### 環境別設定
```typescript
// 開発環境: 見やすいカラー表示
transport: {
  target: 'pino-pretty',
  options: { colorize: true }
}

// 本番環境: JSON形式でファイル出力
transport: {
  target: 'pino/file',
  options: { destination: './logs/app.log' }
}

// テスト環境: ログ無効化
level: 'silent'
```

### ログレベル設定
- **error**: エラーとスタックトレース
- **warn**: 警告（非推奨機能の使用等）
- **info**: 重要なビジネスイベント（本番デフォルト）
- **debug**: デバッグ情報（開発デフォルト）
- **trace**: 詳細なトレース情報

## 導入による期待効果

1. **デバッグ効率向上**: 構造化されたJSONログで問題の特定が容易
2. **パフォーマンス監視**: 全リクエストのレスポンスタイム自動記録
3. **エラー追跡**: コンテキスト付きエラーログで原因究明が迅速
4. **運用改善**: ログ分析ツールとの統合で傾向分析が可能

## リスクと対策

### リスク
1. **ログサイズ**: JSON形式はテキストログより大きい
2. **学習曲線**: 開発者がPino固有の機能を学ぶ必要

### 対策
1. **ログローテーション**: 適切なログローテーション設定
2. **ドキュメント整備**: 使用例とベストプラクティスの文書化

## 参考情報

### 公式ドキュメント
- [Pino公式](https://getpino.io/)
- [NestJS-Pino GitHub](https://github.com/iamolegga/nestjs-pino)
- [NestJSロギングガイド](https://docs.nestjs.com/techniques/logger)

### 関連記事
- [Pino vs. Winston: Choosing the Right Logger](https://dev.to/wallacefreitas/pino-vs-winston-choosing-the-right-logger-for-your-nodejs-application-369n)
- [Ultimate Guide: How To Use NestJS Logger](https://www.tomray.dev/nestjs-logging)
- [A Complete Guide to Pino Logging in Node.js](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)

---

**作成日**: 2025年6月29日  
**次回レビュー予定**: 実装後3ヶ月（2025年9月）