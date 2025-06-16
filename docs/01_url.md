# 同人誌管理アプリケーション URL設計

## 概要
本ドキュメントは、同人誌管理Webアプリケーションの全体的なURL設計を定義します。

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

### 印刷所（Printing Companies）
| メソッド | URL | 説明 |
|---------|-----|------|
| GET | `/printing-companies` | 印刷所一覧ページ |
| GET | `/printing-companies/new` | 新規印刷所登録フォーム |
| POST | `/printing-companies` | 印刷所作成処理 |
| GET | `/printing-companies/:id` | 印刷所詳細ページ（入稿履歴含む） |
| GET | `/printing-companies/:id/edit` | 印刷所編集フォーム |
| PUT | `/printing-companies/:id` | 印刷所更新処理（_method=PUT） |
| DELETE | `/printing-companies/:id` | 印刷所削除処理（_method=DELETE） |

### 入稿（Submissions）- 基本機能
| メソッド | URL | 説明 |
|---------|-----|------|
| GET | `/submissions` | 全入稿一覧ページ |
| GET | `/submissions/in-progress` | 進行中の入稿一覧 |
| GET | `/submissions/costs` | コスト一覧・簡易集計 |
| GET | `/books/:bookId/submissions` | 書籍の入稿履歴一覧 |
| GET | `/books/:bookId/submissions/new` | 新規入稿作成フォーム |
| POST | `/books/:bookId/submissions` | 入稿作成処理 |
| GET | `/submissions/:id` | 入稿詳細ページ |
| GET | `/submissions/:id/edit` | 入稿編集フォーム |
| PUT | `/submissions/:id` | 入稿更新処理（_method=PUT） |
| DELETE | `/submissions/:id` | 入稿削除処理（_method=DELETE） |

### 入稿（Submissions）- 段階的更新
| メソッド | URL | 説明 |
|---------|-----|------|
| GET | `/submissions/:id/status/edit` | ステータス更新フォーム |
| PUT | `/submissions/:id/status` | ステータス更新処理（_method=PUT） |
| GET | `/submissions/:id/costs/edit` | コスト情報更新フォーム |
| PUT | `/submissions/:id/costs` | コスト情報更新処理（_method=PUT） |

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