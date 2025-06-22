# 技術書典出展管理機能設計書

## 概要

技術書典やコミケなどの同人誌即売会において、サークルがイベントに出展申込を行うための管理機能。

## システム構成

- アーキテクチャ: MPA (Multi Page Application)
- 認証: なし（将来的な拡張を考慮）

## データモデル

### Event（イベント）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INTEGER | 主キー |
| name | VARCHAR(255) | イベント名（例：技術書典17） |
| event_date | DATE | 開催日 |
| venue | VARCHAR(255) | 会場名 |
| application_start_date | DATE | 申込開始日 |
| application_end_date | DATE | 申込締切日 |
| description | TEXT | イベント説明 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

### Circle（サークル）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INTEGER | 主キー |
| name | VARCHAR(255) | サークル名 |
| representative_name | VARCHAR(255) | 代表者名 |
| email | VARCHAR(255) | 連絡先メールアドレス |
| description | TEXT | サークル説明 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

### Exhibit（出展申込）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INTEGER | 主キー |
| event_id | INTEGER | イベントID（外部キー） |
| circle_id | INTEGER | サークルID（外部キー） |
| status | VARCHAR(50) | 状態（applying/accepted/rejected/cancelled） |
| space_number | VARCHAR(50) | スペース番号（当選時） |
| space_location | VARCHAR(255) | 配置詳細（東1ホール等） |
| application_date | DATE | 申込日 |
| notes | TEXT | 備考 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

## URL設計

### イベント管理

| HTTPメソッド | URL | 画面/処理 | 説明 |
|-------------|-----|-----------|------|
| GET | /events | イベント一覧画面 | 全イベントを表示 |
| GET | /events/new | イベント新規登録画面 | イベント登録フォーム |
| POST | /events | イベント登録処理 | フォームデータを受信して登録 |
| GET | /events/{eventId} | イベント詳細画面 | 特定イベントの詳細表示 |
| GET | /events/{eventId}/edit | イベント編集画面 | イベント編集フォーム |
| POST | /events/{eventId} | イベント更新処理 | フォームデータを受信して更新 |
| POST | /events/{eventId}/delete | イベント削除処理 | イベントを削除 |

### サークル管理

| HTTPメソッド | URL | 画面/処理 | 説明 |
|-------------|-----|-----------|------|
| GET | /circles | サークル一覧画面 | 全サークルを表示 |
| GET | /circles/new | サークル新規登録画面 | サークル登録フォーム |
| POST | /circles | サークル登録処理 | フォームデータを受信して登録 |
| GET | /circles/{circleId} | サークル詳細画面 | 特定サークルの詳細表示 |
| GET | /circles/{circleId}/edit | サークル編集画面 | サークル編集フォーム |
| POST | /circles/{circleId} | サークル更新処理 | フォームデータを受信して更新 |
| POST | /circles/{circleId}/delete | サークル削除処理 | サークルを削除 |

### 出展申込管理

| HTTPメソッド | URL | 画面/処理 | 説明 |
|-------------|-----|-----------|------|
| GET | /exhibits | 出展申込一覧画面 | 全出展申込を表示 |
| GET | /exhibits/new | 新規出展申込画面 | 出展申込フォーム |
| POST | /exhibits | 出展申込登録処理 | フォームデータを受信して登録 |
| GET | /exhibits/{exhibitId} | 出展申込詳細画面 | 特定出展申込の詳細表示 |
| GET | /exhibits/{exhibitId}/edit | 出展申込編集画面 | 出展申込編集フォーム |
| POST | /exhibits/{exhibitId} | 出展申込更新処理 | フォームデータを受信して更新 |
| POST | /exhibits/{exhibitId}/cancel | 出展申込キャンセル処理 | 申込をキャンセル |
| GET | /events/{eventId}/exhibits | イベント別出展一覧画面 | 特定イベントの出展申込一覧 |
| GET | /circles/{circleId}/exhibits | サークル別出展一覧画面 | 特定サークルの出展申込一覧 |
| GET | /exhibits/{exhibitId}/space | スペース情報画面 | スペース情報表示 |
| GET | /exhibits/{exhibitId}/space/edit | スペース情報編集画面 | スペース情報編集フォーム |
| POST | /exhibits/{exhibitId}/space | スペース情報更新処理 | スペース情報を更新 |



## 今後の拡張予定

- 認証機能の追加
- 頒布物管理機能
- 在庫管理機能
- 売上記録機能
- 収支分析機能