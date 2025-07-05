# 統合テストにおけるデータベースクリーンアップ戦略

## 📝 概要

このドキュメントは、NestJS + Vitest + PostgreSQL環境での統合テストにおけるデータベースクリーンアップのベストプラクティスをまとめています。2025年6月21日のフレーキーテスト修正作業で得られた知見に基づいています。

## 🎯 基本原則

### 1. 業界標準に準拠
- **Ruby DatabaseCleaner**: beforeEchでのクリーンアップが標準
- **Jest**: 各テスト前のセットアップが推奨
- **pytest**: 各テスト前のフィクスチャセットアップが基本

### 2. 二重クリーンアップの回避
- `beforeEach` + `afterEach`は冗長でフレーキーテストの原因
- **推奨**: `beforeEach`のみでクリーンアップ
- **例外**: 削除系テストなど特別な理由がある場合のみ`afterEach`追加

## 🔧 実装パターン

### Pattern A: beforeEachのみ（推奨）

```typescript
describe('Feature Test', () => {
  let app: INestApplication
  let drizzleService: DrizzleService

  beforeAll(async () => {
    // アプリケーション初期化
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    drizzleService = moduleRef.get<DrizzleService>(DrizzleService)
    await app.init()
  })

  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  beforeEach(async () => {
    // 各テスト前に全データをクリーンアップ（他のテストファイルの影響を除去）
    await testDbUtils.cleanupDatabase()
    
    // テスト用データの作成
    // const testData = await drizzleService.db.insert(...)
  })

  // afterEach は基本的に不要（フレーキーテスト防止）

  describe('正常系テスト', () => {
    it('機能が正常に動作する', async () => {
      // テスト実装
    })
  })
})
```

**適用条件**:
- 新規テストファイル作成時は必ずこのパターンを使用
- 読み取り・作成・更新処理のテスト

**効果**:
- フレーキーテスト防止
- パフォーマンス向上（不要なクリーンアップ削減）
- デバッグ性向上（テスト失敗時にデータが残って状態確認可能）

### Pattern B: beforeEach + afterEach（例外的使用）

```typescript
describe('Delete Feature Test', () => {
  // 基本設定は同じ

  beforeEach(async () => {
    // 他のテストファイルの影響を除去
    await testDbUtils.cleanupDatabase()
    
    // テスト用データ作成
  })

  afterEach(async () => {
    // テスト後のクリーンアップ（削除系テストで重要）
    await testDbUtils.cleanupDatabase()
  })

  describe('削除処理テスト', () => {
    it('リソースが正常に削除される', async () => {
      // 削除テスト実装
    })
  })
})
```

**適用条件**:
- 削除処理を含むテストでデータ残留が他ファイルに影響する場合のみ
- テストファイル間での相互影響が確認された場合

**実装例**:
- `books/delete-book.integration.spec.ts`
- `book-authors/remove-author-from-book.integration.spec.ts`

## 🔍 問題パターンと対処法

### 1. フレーキーテスト（ランダム失敗）

**症状**: `expected 200 "OK", got 403 "Forbidden"`が断続的に発生

**原因**: `afterEach`での競合状態や不要なクリーンアップ

**対処法**:
1. 該当ファイルで`afterEach`を削除
2. `beforeEach`でのクリーンアップは保持
3. 5-10回連続実行でフレーキーテスト解消確認

**実装例**:
```typescript
// ❌ 問題のあるパターン
afterEach(async () => {
  await testDbUtils.cleanupDatabase() // これが競合状態を引き起こす
})

// ✅ 修正後のパターン
beforeEach(async () => {
  await testDbUtils.cleanupDatabase() // これのみで十分
})
```

### 2. データ蓄積エラー

**症状**: `expected 1 but got 16` - 期待より多くのデータが存在

**原因**: 他のテストファイルがデータを残している

**対処法**:
1. `beforeEach`でクリーンアップを追加
2. データベースを手動リセット: `pnpm drizzle:push:test`

**実装例**:
```typescript
// 問題が発生するファイルに追加
beforeEach(async () => {
  // 各テスト前に全データをクリーンアップ（他のテストファイルの影響を除去）
  await testDbUtils.cleanupDatabase()
})
```

### 3. テストファイル間の相互影響

**症状**: 単体実行では成功、全体実行で失敗

**原因**: あるファイルが`afterEach`を削除したことで他ファイルに影響

**対処法**:
1. 影響を受けるファイルで`beforeEach`クリーンアップ追加
2. 削除系テストでは`afterEach`を保持

## 📊 フレーキーテスト修正の段階的アプローチ

### Phase 1: 問題ファイル特定・修正

1. **403エラー等のフレーキーテストが発生するファイルを特定**
   ```bash
   # 問題ファイルを5-10回連続実行
   for i in {1..7}; do 
     echo "=== テスト実行 $i/7 ==="; 
     pnpm test:integration test/integration/problematic-file.spec.ts; 
   done
   ```

2. **該当ファイルで`afterEach`を削除**
   ```typescript
   // 削除対象
   afterEach(async () => {
     await testDbUtils.cleanupDatabase()
   })
   ```

3. **連続実行でフレーキーテスト解消確認**

### Phase 2: 安全な範囲での拡大修正

1. **`beforeEach` + `afterEach`両方を持つファイルのみ特定**
   ```bash
   find test/integration -name "*.spec.ts" -exec bash -c '
     if grep -q "beforeEach" "$1" && grep -q "afterEach" "$1" && grep -q "cleanupDatabase" "$1"; then 
       echo "$1"; 
     fi' _ {} \;
   ```

2. **1ファイルずつ修正→テスト→確認のサイクル**
3. **削除系テストなど、データ蓄積が問題となるファイルは除外**

### Phase 3: 全体統合確認

1. **全統合テスト実行で238/238テスト成功確認**
   ```bash
   pnpm test:integration
   ```

2. **パフォーマンス向上とフレーキーテスト解消の確認**

## 🚀 新規テストファイル作成時のチェックリスト

- [ ] `beforeEach`でのクリーンアップを実装
- [ ] `afterEach`は基本的に避ける（削除系テスト等の例外を除く）
- [ ] テスト用データは`beforeEach`内で作成
- [ ] 外部キー制約を考慮したデータ作成順序
- [ ] ユニークなデータ作成（timestamp使用等）

## 🔧 デバッグ時の確認手順

1. **データ蓄積確認**
   ```typescript
   // テスト前にデータ件数を確認
   const beforeTest = await drizzleService.db.select().from(table)
   console.log('テスト前データ件数:', beforeTest.length)
   ```

2. **フレーキーテスト確認**
   ```bash
   # 同じテストを複数回実行
   for i in {1..10}; do pnpm test:integration problematic-file.spec.ts; done
   ```

3. **テストファイル依存確認**
   ```bash
   # 単体実行
   pnpm test:integration single-file.spec.ts
   
   # 全体実行（問題が発生するか確認）
   pnpm test:integration
   ```

4. **データベース強制リセット**
   ```bash
   pnpm drizzle:push:test
   ```

## 📈 期待される効果

### フレーキーテスト解消
- 403エラーの根本解決
- 断続的な失敗の排除
- 信頼性の高いテスト実行

### パフォーマンス向上
- 不要なクリーンアップ処理削減
- テスト実行時間の短縮
- CI/CDパイプラインの効率化

### デバッグ性向上
- テスト失敗時にデータが残って状態確認可能
- 問題の再現が容易
- エラー原因の特定が迅速

### 保守性向上
- 業界標準に準拠した実装
- 一貫したテスト設計
- 新規開発者の理解が容易

## 📚 参考資料

- [Database Cleaner (Ruby)](https://github.com/DatabaseCleaner/database_cleaner)
- [Jest Testing Framework](https://jestjs.io/docs/setup-teardown)
- [pytest Fixtures](https://docs.pytest.org/en/6.2.x/fixture.html)
- [Vitest Setup and Teardown](https://vitest.dev/guide/test-context.html)

---

**更新履歴**:
- 2025-06-21: 初版作成（フレーキーテスト修正作業の知見をまとめ）