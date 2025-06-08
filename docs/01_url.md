# 執筆管理機能 URL設計

## 概要
本ドキュメントは、同人誌管理Webアプリケーションの執筆管理機能におけるURL設計を定義します。

### 基本方針
- MPA（Multi Page Application）として実装
- バックエンドでEJSを使用してHTMLを描画
- RESTfulな設計を採用
- HTTPメソッドはPOST/GET/PUT/DELETEを使用（PUT/DELETEは`@nest-middlewares/method-override`でサポート）

## URL一覧

### 書籍（Books）
| メソッド | URL | 説明 |
|---------|-----|------|
| GET | `/books` | 書籍一覧ページ |
| GET | `/books/new` | 新規書籍作成フォーム |
| POST | `/books` | 書籍作成処理 |
| GET | `/books/:id` | 書籍詳細ページ |
| GET | `/books/:id/edit` | 書籍編集フォーム |
| PUT | `/books/:id` | 書籍更新処理（_method=PUT） |
| DELETE | `/books/:id` | 書籍削除処理（_method=DELETE） |

### 執筆ステータス（Writing Status）
| メソッド | URL | 説明 |
|---------|-----|------|
| GET | `/books/:bookId/status/edit` | ステータス変更フォーム |
| PUT | `/books/:bookId/status` | ステータス更新処理（_method=PUT） |

### 締切（Deadlines）
| メソッド | URL | 説明 |
|---------|-----|------|
| GET | `/books/:bookId/deadlines` | 締切一覧ページ |
| GET | `/books/:bookId/deadlines/new` | 締切追加フォーム |
| POST | `/books/:bookId/deadlines` | 締切作成処理 |
| GET | `/deadlines/:id/edit` | 締切編集フォーム |
| PUT | `/deadlines/:id` | 締切更新処理（_method=PUT） |
| DELETE | `/deadlines/:id` | 締切削除処理（_method=DELETE） |

### 執筆者（Authors）
| メソッド | URL | 説明 |
|---------|-----|------|
| GET | `/authors` | 執筆者一覧ページ |
| GET | `/authors/new` | 執筆者登録フォーム |
| POST | `/authors` | 執筆者作成処理 |
| GET | `/authors/:id` | 執筆者詳細ページ |
| GET | `/authors/:id/edit` | 執筆者編集フォーム |
| PUT | `/authors/:id` | 執筆者更新処理（_method=PUT） |
| DELETE | `/authors/:id` | 執筆者削除処理（_method=DELETE） |

### 書籍執筆者関連（Book Authors）
| メソッド | URL | 説明 |
|---------|-----|------|
| GET | `/books/:bookId/authors` | 書籍の執筆者管理ページ |
| GET | `/books/:bookId/authors/add` | 執筆者追加フォーム |
| POST | `/books/:bookId/authors` | 執筆者追加処理 |
| DELETE | `/books/:bookId/authors/:authorId` | 執筆者削除処理（_method=DELETE） |

## 実装時の注意事項

### HTTPメソッドオーバーライド
- HTMLフォームはGETとPOSTのみサポートするため、PUT/DELETEメソッドは`_method`パラメータを使用
- フォームに`<input type="hidden" name="_method" value="PUT">`または`value="DELETE"`を含める

### ステータス管理
- 書籍作成時は自動的にステータス「企画中」で初期化
- ステータスの種類：企画中、執筆中、校正中、完成

### ページ遷移
- 作成・更新・削除処理後は適切なページへリダイレクト
- エラー時は元のフォームへ戻り、エラーメッセージを表示