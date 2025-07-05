# 書籍（Books）テーブル設計

## テーブル定義

```prisma
model Book {
  id          Int      @id @default(autoincrement())
  title       String   // 書籍タイトル
  subtitle    String?  // サブタイトル（任意）
  description String?  // 書籍の説明・概要
  
  // ページ情報
  pageCount   Int?     // 総ページ数
  
  // タイムスタンプ
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // TODO: 将来実装予定の列
  // status      String   @default("企画中") // 執筆状態（企画中、執筆中、校正中、完成、頒布中、絶版）
  // isbn        String?  @unique // ISBN（市販本用）
  // isdn        String?  @unique // ISDN（同人誌用）
  // price       Int?     // 頒布価格（円）
  // size        String?  // 判型（B5, A5など）
  // isColor     Boolean  @default(false) // カラー/モノクロ
  // version     String?  // 版数（初版、第2版など）
  // publishedAt DateTime? // 頒布開始日
  
  // TODO: 将来実装予定のリレーション
  // authors     BookAuthor[] // 執筆者との多対多リレーション
  // deadlines   Deadline[]   // 締切管理
}
```

## 設計方針

### 現在の実装
- **最小限の構成**: 執筆管理に必要な基本情報のみ
- **自動採番ID**: PostgreSQLのautoincrement機能を使用
- **シンプルな項目**: タイトル、サブタイトル、説明、ページ数
- **タイムスタンプ**: 作成日時と更新日時の自動管理

### 将来の拡張予定
1. **ステータス管理**: 執筆の進行状況を管理
2. **識別番号**: ISBN（市販本）、ISDN（同人誌）の管理
3. **販売情報**: 価格設定機能
4. **印刷仕様**: サイズ、カラー/モノクロなどの仕様管理
5. **バージョン管理**: 改訂版の管理
6. **リレーション**: 執筆者、締切との関連付け

## 使用例

### 書籍の作成
```typescript
const book = await prisma.book.create({
  data: {
    title: "はじめてのNestJS",
    subtitle: "TypeScriptで作るWebアプリケーション",
    description: "NestJSの基礎から実践的な使い方まで解説",
    pageCount: 120
  }
});
```

### 書籍の更新
```typescript
const updatedBook = await prisma.book.update({
  where: { id: 1 },
  data: {
    pageCount: 150
  }
});
```