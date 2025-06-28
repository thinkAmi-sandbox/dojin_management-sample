# 販売管理システム - 技術仕様・開発ガイドライン

## 📋 概要

このドキュメントでは、販売管理システムの技術仕様、URLエンドポイント一覧、モジュール構成、および開発ガイドラインを定義します。Phase 1-5の実装において一貫した技術基準と品質を保つための指針を提供します。

## 🔗 URLエンドポイント一覧

### 版管理関連 ✅ 実装済み
```
GET    /books/:bookId/editions          # 書籍の版一覧
GET    /books/:bookId/editions/new      # 新版作成フォーム
POST   /books/:bookId/editions          # 新版作成
GET    /editions/:id                    # 版詳細
GET    /editions/:id/edit               # 版編集フォーム
PUT    /editions/:id                    # 版更新
DELETE /editions/:id                    # 版削除
POST   /editions/:id                    # HTTPメソッドオーバーライド（PUT/DELETE）
```

### 保管場所管理関連 ⏳ Phase 2-1実装予定
```
GET    /storage-locations               # 保管場所一覧
GET    /storage-locations/new           # 新規保管場所フォーム
POST   /storage-locations               # 保管場所作成
GET    /storage-locations/:id           # 保管場所詳細
GET    /storage-locations/:id/edit      # 保管場所編集フォーム
PUT    /storage-locations/:id           # 保管場所更新
DELETE /storage-locations/:id           # 保管場所削除
POST   /storage-locations/:id           # HTTPメソッドオーバーライド（PUT/DELETE）
```

### 在庫管理関連 ⏳ Phase 2-2〜2-3実装予定
```
GET    /stocks                          # 在庫一覧（版別・場所別）
GET    /stocks/check                    # 棚卸画面
POST   /stocks/check                    # 棚卸実行
GET    /stocks/movements                # 在庫移動履歴
POST   /stock-movements                 # 在庫移動記録
GET    /editions/:id/stocks             # 特定版の在庫状況
PUT    /stocks/:id                      # 在庫数量更新
GET    /editions/:id/stock-movements    # 特定版の在庫移動履歴
```

### 販売管理関連 ⏳ Phase 4実装予定
```
GET    /sales                           # 販売取引一覧
GET    /sales/new                       # 新規販売登録フォーム
POST   /sales                           # 販売登録
GET    /sales/:id                       # 販売詳細
GET    /sales/reports                   # 売上レポート
GET    /events/:eventId/sales           # イベント別売上
```

### 価格管理関連 ⏳ Phase 4実装予定
```
GET    /editions/:id/pricing-rules      # 版の価格ルール一覧
GET    /pricing-rules/new               # 価格ルール作成フォーム
POST   /pricing-rules                   # 価格ルール作成
GET    /pricing-rules/:id/edit          # 価格ルール編集フォーム
PUT    /pricing-rules/:id               # 価格ルール更新
DELETE /pricing-rules/:id               # 価格ルール削除
```

### 委託管理関連 ⏳ Phase 5実装予定
```
GET    /consignments                    # 委託契約一覧
GET    /consignments/new                # 新規委託契約フォーム
POST   /consignments                    # 委託契約作成
GET    /consignments/:id                # 委託契約詳細
GET    /consignments/:id/edit           # 委託契約編集フォーム
PUT    /consignments/:id                # 委託契約更新
DELETE /consignments/:id                # 委託契約削除
POST   /consignments/:id                # HTTPメソッドオーバーライド（PUT/DELETE）

GET    /consignments/:id/reports        # 委託販売報告一覧
GET    /consignments/:id/reports/new    # 販売報告登録フォーム
POST   /consignments/:id/reports        # 販売報告登録
GET    /consignments/:cId/reports/:id   # 販売報告詳細
POST   /consignments/:cId/reports/:id/confirm  # 販売報告確認
POST   /consignments/:cId/reports/:id/adjust   # 販売報告調整
POST   /consignments/:cId/reports/:id/settle   # 精算処理
```

## 🏗️ モジュール構成

### 新規実装モジュール

#### 1. 版管理モジュール ✅ 実装済み（Phase 1）
```
src/editions/
├── editions.module.ts
├── editions.controller.ts          # /books/:bookId/editions
├── edition-detail.controller.ts    # /editions/:id
├── editions.service.ts
├── dto/
│   ├── create-edition.dto.ts
│   └── update-edition.dto.ts
└── views/
    ├── index.ejs                   # 版一覧
    ├── show.ejs                    # 版詳細
    ├── new.ejs                     # 版作成フォーム
    └── edit.ejs                    # 版編集フォーム
```

#### 2. 保管場所管理モジュール ⏳ Phase 2-1実装予定
```
src/storage-locations/
├── storage-locations.module.ts
├── storage-locations.controller.ts
├── storage-locations.service.ts
├── dto/
│   ├── create-storage-location.dto.ts
│   └── update-storage-location.dto.ts
└── views/
    ├── index.ejs
    ├── show.ejs
    ├── new.ejs
    └── edit.ejs
```

#### 3. 在庫管理モジュール ⏳ Phase 2-2〜2-3実装予定
```
src/stocks/
├── stocks.module.ts
├── stocks.controller.ts
├── stocks.service.ts
├── stock-movements.service.ts
├── dto/
│   ├── create-stock-movement.dto.ts
│   ├── update-stock.dto.ts
│   └── stock-check.dto.ts
└── views/
    ├── index.ejs                   # 在庫一覧
    ├── check.ejs                   # 棚卸画面
    └── movements.ejs               # 移動履歴
```

#### 4. 販売管理モジュール ⏳ Phase 4実装予定
```
src/sales/
├── sales.module.ts
├── sales.controller.ts
├── sales.service.ts
├── sales-report.service.ts
├── dto/
│   ├── create-sales-transaction.dto.ts
│   ├── add-sales-detail.dto.ts
│   └── sales-filters.dto.ts
└── views/
    ├── index.ejs                   # 取引一覧
    ├── show.ejs                    # 取引詳細
    ├── new.ejs                     # 新規取引フォーム
    └── reports.ejs                 # 売上レポート
```

#### 5. 価格管理モジュール ⏳ Phase 4実装予定
```
src/pricing/
├── pricing.module.ts
├── pricing.controller.ts
├── pricing.service.ts
├── dto/
│   ├── create-pricing-rule.dto.ts
│   └── update-pricing-rule.dto.ts
└── views/
    ├── index.ejs
    ├── new.ejs
    └── edit.ejs
```

#### 6. 委託管理モジュール ⏳ Phase 5実装予定
```
src/consignments/
├── consignments.module.ts
├── consignments.controller.ts
├── consignments.service.ts
├── consignment-sales.service.ts
├── dto/
│   ├── create-consignment.dto.ts
│   ├── update-consignment.dto.ts
│   ├── report-consignment-sales.dto.ts
│   └── settle-consignment.dto.ts
└── views/
    ├── index.ejs                   # 委託契約一覧
    ├── show.ejs                    # 委託契約詳細
    ├── new.ejs                     # 委託契約作成
    ├── edit.ejs                    # 委託契約編集
    └── reports/
        ├── index.ejs               # 販売報告一覧
        ├── show.ejs                # 販売報告詳細
        └── new.ejs                 # 販売報告作成
```

## 🎯 開発ガイドライン

### 1. 命名規則

#### データベース
- **テーブル名**: PascalCase（例: `Edition`, `StockMovement`, `ConsignmentSales`）
- **カラム名**: camelCase（例: `versionName`, `basePrice`, `commissionRate`）
- **Enum名**: snake_case + enum接尾辞（例: `storage_location_type`, `stock_movement_type`）

#### TypeScript/JavaScript
- **ファイル名**: kebab-case（例: `create-edition.dto.ts`, `stock-movements.service.ts`）
- **クラス名**: PascalCase（例: `EditionsService`, `CreateEditionDto`）
- **メソッド名**: camelCase（例: `findAllByBookId`, `updateViaPost`）
- **変数名**: camelCase（例: `editionId`, `storageLocation`）

#### URL/ルート
- **URLパス**: kebab-case（例: `/storage-locations`, `/pricing-rules`）
- **パラメータ**: camelCase（例: `:bookId`, `:editionId`）

### 2. コントローラーメソッド命名規則

#### **YOU MUST**: NestJSコントローラーメソッド名統一
```typescript
// 必須のメソッド名（Railsスタイル禁止）
findAll()      // GET /resources          - 一覧取得
findOne()      // GET /resources/:id      - 単一取得
create()       // POST /resources         - 新規作成
update()       // PUT /resources/:id      - 更新
remove()       // DELETE /resources/:id   - 削除

// フォーム表示用（MPA構成）
renderNewForm()  // GET /resources/new       - 新規作成フォーム
renderEditForm() // GET /resources/:id/edit - 編集フォーム

// HTTPメソッドオーバーライド用
updateViaPost()  // POST /resources/:id     - PUT/DELETE処理
```

### 3. ValidationPipe統一パターン ✅ 確立済み

#### DTO実装パターン
```typescript
export class CreateResourceDto {
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
}
```

#### 統一されたエラーメッセージ
- **必須フィールド**: `{フィールド名}は必須です`
- **型チェック**: `{フィールド名}は{型}で入力してください`
- **フォーマット**: `{フィールド名}には有効な{フォーマット}を入力してください`
- **範囲チェック**: `{フィールド名}は{条件}で入力してください`

### 4. エラーハンドリング統一パターン ✅ 確立済み

#### 標準エラーハンドリング
```typescript
// 存在しないリソース
throw new NotFoundException('リソースが見つかりません')

// バリデーションエラー
throw new BadRequestException('入力データが正しくありません')

// 権限エラー
throw new ForbiddenException('このリソースにはアクセスできません')

// 業務ロジックエラー
throw new BadRequestException('在庫が不足しています')
```

#### ParseIntPipeの使用
```typescript
// ✅ 正しいパターン
@Get(':id')
async findOne(@Param('id', ParseIntPipe) id: number) {
  // サービス層でNotFoundException投げる
  return await this.service.findOne(id)
}
```

### 5. HTTPメソッドオーバーライド実装パターン ✅ 確立済み

#### 統一実装パターン
```typescript
@Post(':id')
async updateViaPost(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: { _method?: string; [key: string]: unknown },
  @Res() res: Response,
) {
  if (body._method === 'PUT') {
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
```

### 6. テスト方針 ✅ 確立済み

#### TDD統合テスト駆動開発
```typescript
// 段階的テスト実装アプローチ
describe('Resource Management Integration', () => {
  beforeEach(async () => {
    await testDbUtils.cleanupDatabase()
    // テストデータ準備
  })

  // Step 1: 基本機能テスト（1-2テスト）
  it('should create resource', async () => { /* ... */ })
  it('should display resource list', async () => { /* ... */ })

  // Step 2: バリデーションテスト（2-3テスト）
  it('should validate required fields', async () => { /* ... */ })
  it('should handle invalid data', async () => { /* ... */ })

  // Step 3: 全機能テスト（残りテスト）
  it('should update resource', async () => { /* ... */ })
  it('should delete resource', async () => { /* ... */ })
  it('should handle not found errors', async () => { /* ... */ })
})
```

#### テストファイル構造
```
test/integration/
├── editions/
│   └── editions.integration.spec.ts
├── storage-locations/
│   └── storage-locations.integration.spec.ts
├── stocks/
│   └── stocks.integration.spec.ts
├── sales/
│   └── sales.integration.spec.ts
└── consignments/
    └── consignments.integration.spec.ts
```

## 🔧 技術実装標準

### 1. データベース接続パターン

#### Drizzle ORM使用例
```typescript
@Injectable()
export class ResourceService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(): Promise<Resource[]> {
    return await this.drizzleService.db
      .select()
      .from(resources)
      .orderBy(desc(resources.createdAt))
  }

  async findOne(id: number): Promise<Resource> {
    const result = await this.drizzleService.db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException('リソースが見つかりません')
    }

    return result[0]
  }
}
```

### 2. トランザクション処理パターン

#### 複数テーブル更新の原子性保証
```typescript
async complexOperation(data: ComplexOperationDto): Promise<void> {
  await this.drizzleService.db.transaction(async (tx) => {
    // 1. 主テーブル更新
    const [mainRecord] = await tx.insert(mainTable).values(data.main).returning()

    // 2. 関連テーブル更新
    await tx.insert(relatedTable).values({
      mainId: mainRecord.id,
      ...data.related,
    })

    // 3. 在庫更新（例）
    await tx.update(stocks)
      .set({ quantity: sql`quantity - ${data.quantity}` })
      .where(eq(stocks.editionId, data.editionId))

    // エラー時は自動ロールバック
  })
}
```

### 3. ビューファイル構造化テンプレート

#### 共通構造
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
        
        /* レスポンシブ */
        @media (max-width: 768px) {
            .detail-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><%= title %></h1>
        </div>

        <div class="actions">
            <!-- アクションボタン -->
        </div>

        <div class="content">
            <!-- メインコンテンツ -->
        </div>
    </div>

    <!-- 必要に応じてJavaScript -->
</body>
</html>
```

### 4. ValidationExceptionFilter対応 ✅ 実装済み

#### 新規パス追加パターン
```typescript
// src/common/filters/validation-exception.filter.ts に追加
private prepareFormData(request: Request): Record<string, any> {
  const path = request.path

  // 新規モジュール対応
  if (path.includes('/storage-locations')) {
    return {
      formData: request.body,
      // 必要なテンプレート変数
    }
  }

  if (path.includes('/consignments')) {
    return {
      formData: request.body,
      // 委託契約用のテンプレート変数
    }
  }
}
```

## 📊 パフォーマンス要件

### 1. レスポンス時間目標
- **一覧表示**: 2秒以内
- **詳細表示**: 1秒以内
- **作成・更新**: 3秒以内
- **レポート生成**: 5秒以内（大量データ時）

### 2. インデックス設計
```sql
-- 在庫照会用
CREATE INDEX idx_stocks_edition_location ON "Stock" ("editionId", "locationId");

-- 販売データ集計用
CREATE INDEX idx_sales_details_edition ON "SalesDetail" ("editionId");
CREATE INDEX idx_sales_transaction_date ON "SalesTransaction" ("transactionDate");

-- 委託販売報告用
CREATE INDEX idx_consignment_sales_period ON "ConsignmentSales" ("reportPeriodStart", "reportPeriodEnd");
```

### 3. メモリ使用量
- **一覧表示**: 1ページあたり100件以内
- **レポート**: 必要に応じてページネーション実装
- **大量データ**: ストリーミング処理の検討

## 🔒 セキュリティ要件

### 1. データ保護
- **個人情報**: 顧客名・メールアドレスの適切な管理
- **機密情報**: 売上データ・委託条件の保護
- **監査ログ**: 重要な操作の記録

### 2. アクセス制御
- **認証**: 将来的なユーザー認証機能準備
- **認可**: 機能別・データ別アクセス制御
- **セッション**: 適切なセッション管理

### 3. データ整合性
- **トランザクション**: 重要な処理の原子性保証
- **制約**: データベース制約による整合性確保
- **バリデーション**: 入力データの厳格な検証

## 📈 監視・運用

### 1. ログ管理
- **アプリケーションログ**: エラー・警告の記録
- **アクセスログ**: 重要な操作の記録
- **データベースログ**: 重要なクエリの記録

### 2. メトリクス
- **レスポンス時間**: エンドポイント別性能監視
- **エラー率**: 機能別エラー発生率
- **データ量**: テーブル別データ増加量

### 3. バックアップ
- **定期バックアップ**: 日次・週次バックアップ
- **リストア手順**: 災害復旧手順の整備
- **データ移行**: マイグレーション時のバックアップ戦略

---

**最終更新**: 2025年6月28日  
**次回更新予定**: 各Phase実装時の技術仕様詳細化