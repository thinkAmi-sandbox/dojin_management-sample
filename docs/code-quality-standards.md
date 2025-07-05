# コード品質基準

このドキュメントは、同人誌管理アプリケーションのコード品質基準を定義します。

## 📋 必須基準（エラー0件必須）

### 1. Lintエラー

**必須**: `pnpm lint` 実行時のエラーは0件でなければなりません。

```bash
pnpm lint
# ✅ 期待される結果: エラー0件
# ❌ 許可されない: エラー1件以上
```

#### よくあるLintエラーと修正方法

| エラーメッセージ | 原因 | 修正方法 |
|--------------|------|---------|
| `'variable' is never reassigned. Use 'const' instead` | 再代入されない変数にletを使用 | `let`を`const`に変更 |
| `Unexpected any. Specify a different type` | any型の使用 | 具体的な型を指定 |
| `'variable' is assigned a value but never used` | 未使用変数 | 変数を削除または使用 |
| `All imports in the declaration are only used as types` | 型のみのインポート | `import type`に変更 |
| `Expected to return a value at the end of async function` | async関数の戻り値なし | 適切な戻り値を追加 |

### 2. TypeScript型チェック

**必須**: `pnpm type-check` 実行時のエラーは0件でなければなりません。

```bash
pnpm type-check
# ✅ 期待される結果: エラー0件
# ❌ 許可されない: 型エラー1件以上
```

#### 型安全性のルール

1. **any型の使用禁止**
   ```typescript
   // ❌ 悪い例
   let data: any = fetchData()
   
   // ✅ 良い例
   let data: UserData = fetchData()
   
   // やむを得ない場合はコメントで理由を記載
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   let externalLibData: any = externalLib.getData() // 外部ライブラリの型定義不足
   ```

2. **type-only import の使用**
   ```typescript
   // ❌ 悪い例
   import { Response } from 'express'
   
   // ✅ 良い例
   import type { Response } from 'express'
   ```

3. **strict modeの維持**
   - `tsconfig.json`の`strict: true`を維持
   - null/undefinedの明示的なハンドリング

### 3. async/await一貫性

**必須**: すべてのasync関数は適切にawaitを使用するか、明示的な理由をコメントで記載

```typescript
// ❌ 悪い例
async function processData() {
  fetchData() // awaitなし、理由なし
}

// ✅ 良い例
async function processData() {
  await fetchData()
}

// ✅ 良い例（意図的な非同期実行）
async function processData() {
  // 非同期で実行、完了を待たない
  fetchData().catch(console.error)
}
```

### 4. 未使用コードの削除

**必須**: 未使用のインポート、変数、関数は削除

```typescript
// ❌ 悪い例
import { unused } from './utils' // 未使用
const unusedVar = 'test' // 未使用

// ✅ 良い例
// 使用するもののみインポート・定義
```

## 📊 許容される警告

以下の警告は許容されますが、可能な限り削減を推奨：

1. **複雑度の警告** - ビジネスロジックで必要な場合
2. **行長の警告** - URLや長い文字列リテラルの場合
3. **コメントの警告** - TODO/FIXMEコメント（期限付きが望ましい）

## 🔍 実装時の確認フロー

新機能実装・修正時は以下の順序で確認：

```bash
# 1. テスト実行（すべて成功必須）
pnpm test
pnpm test:integration

# 2. 型チェック（エラー0件必須）
pnpm type-check

# 3. Lint実行（エラー0件必須）
pnpm lint

# 4. フォーマット適用
pnpm format

# 5. ビルド確認
pnpm build
```

## 📝 実装完了チェックリスト統合

CLAUDE.mdの実装完了チェックリストと連動：

- [ ] 機能実装完了
- [ ] 統合テスト全件成功
- [ ] `pnpm type-check` エラー0件
- [ ] **`pnpm lint` エラー0件** ← 必須要件
- [ ] `pnpm build` 成功
- [ ] ドキュメント更新

## 🚨 CI/CD連携（将来実装予定）

将来的には以下のCI/CDパイプラインで自動チェック：
- PRマージ前のLintチェック必須化
- 型チェックエラーでのビルド失敗
- コード品質ゲートの設定

## 📚 参考資料

- [Biome設定ファイル](../biome.json)
- [TypeScript設定](../tsconfig.json)
- [CLAUDE.md - 実装ルール](../CLAUDE.md)

---

**更新履歴**:
- 2025-07-05: 初版作成（Phase 4-4実装後の品質基準強化）