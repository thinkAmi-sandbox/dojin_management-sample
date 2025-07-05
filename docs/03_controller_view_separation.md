# Controller/View分離設計

## 概要

NestJSの規約に従い、ControllerとViewを適切に分離したアーキテクチャ設計です。MVCパターンの関心の分離を実現し、保守性・テスタビリティ・再利用性を向上させます。

## 設計原則

### 責任分離
- **Controller**: HTTPリクエスト/レスポンス処理のみ
- **Service**: ビジネスロジック、データ操作
- **View**: データの表示形式変換、UI固有のロジック
- **Template**: HTML構造の定義

### 依存関係
```
Controller → Service (ビジネスロジック)
Controller → View (表示ロジック)
View → ViewService (共通ビューロジック)
Template ← View (データ渡し)
```

## ディレクトリ構造

```
src/
├── books/
│   ├── books.controller.ts          # HTTPリクエスト処理のみ
│   ├── books.service.ts             # ビジネスロジック
│   ├── books.module.ts              # モジュール定義
│   ├── dto/
│   │   ├── create-book.dto.ts       # 入力バリデーション
│   │   └── update-book.dto.ts
│   ├── interfaces/
│   │   └── view-models.ts           # ViewModelの型定義
│   └── views/
│       ├── books-list.view.ts       # 書籍一覧ビューロジック
│       ├── book-detail.view.ts      # 書籍詳細ビューロジック
│       └── book-form.view.ts        # 書籍フォームビューロジック
├── common/
│   ├── decorators/
│   │   └── render.decorator.ts      # カスタムレンダリングデコレータ
│   ├── interfaces/
│   │   └── common-view-models.ts    # 共通ViewModelインターフェース
│   └── services/
│       └── view.service.ts          # ビュー共通サービス
└── views/                           # EJSテンプレートファイル
    ├── layouts/
    │   └── main.ejs                 # 共通レイアウト
    ├── books/
    │   ├── index.ejs                # 書籍一覧テンプレート
    │   ├── show.ejs                 # 書籍詳細テンプレート
    │   ├── new.ejs                  # 書籍作成フォーム
    │   ├── edit.ejs                 # 書籍編集フォーム
    │   └── _book-card.ejs           # 書籍カードパーシャル
    └── shared/
        ├── header.ejs               # 共通ヘッダー
        ├── footer.ejs               # 共通フッター
        └── breadcrumbs.ejs          # パンくずリスト
```

## 実装例

### Controller Layer

```typescript
// books/books.controller.ts
import { Controller, Get, Param, Render } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksListView } from './views/books-list.view';
import { BookDetailView } from './views/book-detail.view';

@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly booksListView: BooksListView,
    private readonly bookDetailView: BookDetailView
  ) {}

  @Get()
  @Render('books/index')
  async index(): Promise<object> {
    const books = await this.booksService.findAll();
    return this.booksListView.render(books);
  }

  @Get(':id')
  @Render('books/show')
  async show(@Param('id') id: string): Promise<object> {
    const book = await this.booksService.findOne(+id);
    const relatedBooks = await this.booksService.findRelated(+id);
    return this.bookDetailView.render(book, relatedBooks);
  }

  @Get('new')
  @Render('books/new')
  async new(): Promise<object> {
    return this.bookFormView.renderNew();
  }

  @Get(':id/edit')
  @Render('books/edit')
  async edit(@Param('id') id: string): Promise<object> {
    const book = await this.booksService.findOne(+id);
    return this.bookFormView.renderEdit(book);
  }
}
```

### View Layer

```typescript
// books/views/books-list.view.ts
import { Injectable } from '@nestjs/common';
import { ViewService } from '../../common/services/view.service';
import { Book } from '../../db/schema';
import { BooksListViewModel, FormattedBook } from '../interfaces/view-models';

@Injectable()
export class BooksListView {
  constructor(private readonly viewService: ViewService) {}

  render(books: Book[]): BooksListViewModel {
    return {
      title: '書籍一覧',
      books: books.map(book => this.formatBook(book)),
      hasBooks: books.length > 0,
      totalCount: books.length,
      breadcrumbs: this.viewService.createBreadcrumbs([
        { name: 'ホーム', url: '/' },
        { name: '書籍一覧', url: '/books' }
      ])
    };
  }

  private formatBook(book: Book): FormattedBook {
    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle || '',
      description: this.viewService.truncateText(book.description || '', 100),
      pageCount: book.pageCount,
      formattedCreatedAt: this.viewService.formatDate(book.createdAt),
      detailUrl: `/books/${book.id}`,
      editUrl: `/books/${book.id}/edit`
    };
  }
}
```

```typescript
// books/views/book-detail.view.ts
import { Injectable } from '@nestjs/common';
import { ViewService } from '../../common/services/view.service';
import { Book } from '../../db/schema';
import { BookDetailViewModel } from '../interfaces/view-models';

@Injectable()
export class BookDetailView {
  constructor(private readonly viewService: ViewService) {}

  render(book: Book, relatedBooks: Book[]): BookDetailViewModel {
    return {
      title: `${book.title} - 書籍詳細`,
      book: {
        id: book.id,
        title: book.title,
        subtitle: book.subtitle || '',
        description: book.description || '',
        pageCount: book.pageCount,
        formattedCreatedAt: this.viewService.formatDate(book.createdAt),
        formattedUpdatedAt: this.viewService.formatDate(book.updatedAt),
        editUrl: `/books/${book.id}/edit`,
        deleteUrl: `/books/${book.id}`
      },
      relatedBooks: relatedBooks.map(book => this.formatRelatedBook(book)),
      breadcrumbs: this.viewService.createBreadcrumbs([
        { name: 'ホーム', url: '/' },
        { name: '書籍一覧', url: '/books' },
        { name: book.title, url: `/books/${book.id}` }
      ])
    };
  }

  private formatRelatedBook(book: Book): FormattedBook {
    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle || '',
      description: this.viewService.truncateText(book.description || '', 50),
      pageCount: book.pageCount,
      formattedCreatedAt: this.viewService.formatDate(book.createdAt),
      detailUrl: `/books/${book.id}`,
      editUrl: `/books/${book.id}/edit`
    };
  }
}
```

### Service Layer

```typescript
// books/books.service.ts
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { books, Book } from '../db/schema';
import { eq, ne } from 'drizzle-orm';

@Injectable()
export class BooksService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(): Promise<Book[]> {
    return await this.drizzleService.db
      .select()
      .from(books)
      .orderBy(books.createdAt);
  }

  async findOne(id: number): Promise<Book> {
    const result = await this.drizzleService.db
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);
    
    if (result.length === 0) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
    
    return result[0];
  }

  async findRelated(id: number, limit: number = 3): Promise<Book[]> {
    return await this.drizzleService.db
      .select()
      .from(books)
      .where(ne(books.id, id))
      .limit(limit)
      .orderBy(books.createdAt);
  }
}
```

### 共通インフラストラクチャ

```typescript
// common/services/view.service.ts
import { Injectable } from '@nestjs/common';
import { Breadcrumb, BreadcrumbItem } from '../interfaces/common-view-models';

@Injectable()
export class ViewService {
  formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
    // 日付フォーマット処理の実装
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  truncateText(text: string, length: number): string {
    if (text.length <= length) {
      return text;
    }
    return text.substring(0, length) + '...';
  }

  createBreadcrumbs(items: BreadcrumbItem[]): Breadcrumb[] {
    return items.map((item, index) => ({
      ...item,
      isLast: index === items.length - 1
    }));
  }

  sanitizeHtml(html: string): string {
    // HTMLサニタイゼーション処理
    // 実際の実装では適切なライブラリを使用
    return html.replace(/<script.*?<\/script>/gi, '');
  }
}
```

### ViewModel インターフェース

```typescript
// books/interfaces/view-models.ts
import { Breadcrumb } from '../../common/interfaces/common-view-models';

export interface BooksListViewModel {
  title: string;
  books: FormattedBook[];
  hasBooks: boolean;
  totalCount: number;
  breadcrumbs: Breadcrumb[];
}

export interface BookDetailViewModel {
  title: string;
  book: DetailedFormattedBook;
  relatedBooks: FormattedBook[];
  breadcrumbs: Breadcrumb[];
}

export interface FormattedBook {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  pageCount: number | null;
  formattedCreatedAt: string;
  detailUrl: string;
  editUrl: string;
}

export interface DetailedFormattedBook extends FormattedBook {
  formattedUpdatedAt: string;
  deleteUrl: string;
}

export interface BookFormViewModel {
  title: string;
  book?: FormattedBook;
  isEdit: boolean;
  breadcrumbs: Breadcrumb[];
}
```

```typescript
// common/interfaces/common-view-models.ts
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface Breadcrumb extends BreadcrumbItem {
  isLast: boolean;
}
```

### カスタムデコレータ

```typescript
// common/decorators/render.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const RENDER_TEMPLATE = 'render_template';

export const Render = (template: string) => SetMetadata(RENDER_TEMPLATE, template);
```

## EJSテンプレート構造

### レイアウトテンプレート

```ejs
<!-- views/layouts/main.ejs -->
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <%- include('../shared/header') %>
  
  <main class="main-content">
    <%- body %>
  </main>
  
  <%- include('../shared/footer') %>
  
  <script src="/js/app.js"></script>
</body>
</html>
```

### 書籍一覧テンプレート

```ejs
<!-- views/books/index.ejs -->
<% layout('layouts/main') %>

<div class="page-header">
  <h1><%= title %></h1>
  <%- include('../shared/breadcrumbs', { breadcrumbs }) %>
</div>

<div class="actions">
  <a href="/books/new" class="btn btn-primary">新しい書籍を追加</a>
</div>

<% if (hasBooks) { %>
  <div class="books-grid">
    <% books.forEach(book => { %>
      <%- include('_book-card', { book }) %>
    <% }) %>
  </div>
  
  <div class="summary">
    <p>合計 <%= totalCount %> 件の書籍が登録されています。</p>
  </div>
<% } else { %>
  <div class="empty-state">
    <p class="no-books">書籍が登録されていません</p>
    <a href="/books/new" class="btn btn-primary">最初の書籍を追加する</a>
  </div>
<% } %>
```

### 書籍カードパーシャル

```ejs
<!-- views/books/_book-card.ejs -->
<div class="book-card">
  <div class="book-card__header">
    <h3 class="book-card__title">
      <a href="<%= book.detailUrl %>"><%= book.title %></a>
    </h3>
    <% if (book.subtitle) { %>
      <p class="book-card__subtitle"><%= book.subtitle %></p>
    <% } %>
  </div>
  
  <div class="book-card__body">
    <% if (book.description) { %>
      <p class="book-card__description"><%= book.description %></p>
    <% } %>
    
    <div class="book-card__meta">
      <% if (book.pageCount) { %>
        <span class="page-count"><%= book.pageCount %> ページ</span>
      <% } %>
      <span class="created-date">作成日: <%= book.formattedCreatedAt %></span>
    </div>
  </div>
  
  <div class="book-card__actions">
    <a href="<%= book.detailUrl %>" class="btn btn-secondary">詳細</a>
    <a href="<%= book.editUrl %>" class="btn btn-outline">編集</a>
  </div>
</div>
```

## データフロー

```
HTTP Request
     ↓
Controller (HTTPハンドリング)
     ↓
Service (ビジネスロジック・データ取得)
     ↓
View (データ変換・フォーマット)
     ↓
EJS Template (HTML生成)
     ↓
HTTP Response
```

## モジュール設定

```typescript
// books/books.module.ts
import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { BooksListView } from './views/books-list.view';
import { BookDetailView } from './views/book-detail.view';
import { BookFormView } from './views/book-form.view';
import { ViewService } from '../common/services/view.service';

@Module({
  controllers: [BooksController],
  providers: [
    BooksService,
    BooksListView,
    BookDetailView,
    BookFormView,
    ViewService
  ],
})
export class BooksModule {}
```

## テスト戦略

### Controller Test

```typescript
// books/books.controller.spec.ts
describe('BooksController', () => {
  let controller: BooksController;
  let service: BooksService;
  let listView: BooksListView;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        { provide: BooksService, useValue: mockBooksService },
        { provide: BooksListView, useValue: mockBooksListView }
      ],
    }).compile();

    controller = module.get<BooksController>(BooksController);
  });

  it('should return view model for index', async () => {
    const books = [mockBook1, mockBook2];
    const viewModel = { title: '書籍一覧', books: [] };
    
    mockBooksService.findAll.mockResolvedValue(books);
    mockBooksListView.render.mockReturnValue(viewModel);

    const result = await controller.index();
    
    expect(result).toEqual(viewModel);
    expect(mockBooksService.findAll).toHaveBeenCalled();
    expect(mockBooksListView.render).toHaveBeenCalledWith(books);
  });
});
```

### View Test

```typescript
// books/views/books-list.view.spec.ts
describe('BooksListView', () => {
  let view: BooksListView;
  let viewService: ViewService;

  beforeEach(() => {
    const mockViewService = {
      truncateText: jest.fn(),
      formatDate: jest.fn(),
      createBreadcrumbs: jest.fn()
    };
    
    view = new BooksListView(mockViewService as any);
    viewService = mockViewService as any;
  });

  it('should format books correctly', () => {
    const books = [mockBook1, mockBook2];
    viewService.formatDate.mockReturnValue('2025-01-01');
    viewService.createBreadcrumbs.mockReturnValue([]);

    const result = view.render(books);

    expect(result.hasBooks).toBe(true);
    expect(result.totalCount).toBe(2);
    expect(result.books).toHaveLength(2);
  });
});
```

## メリット

### 1. 関心の分離
- 各層の責任が明確に定義されている
- コードの可読性と保守性が向上

### 2. テスタビリティ
- Viewロジックを独立してユニットテスト可能
- モック化しやすい設計

### 3. 再利用性
- ビューロジックを他のコントローラーでも利用可能
- 共通コンポーネントの活用

### 4. 拡張性
- 新しいビューやテンプレートの追加が容易
- APIとWebビューの共存が可能

### 5. NestJS規約準拠
- DIコンテナとデコレータを活用
- モジュールシステムに準拠

## 注意点

### 1. 複雑性の増加
- 小規模なアプリケーションには過度な設計の可能性
- 適切な粒度での分割が重要

### 2. パフォーマンス
- ビューロジックの処理時間を考慮
- 必要に応じてキャッシュ機能の検討

### 3. 一貫性
- ViewModelの型定義を厳密に管理
- 命名規則の統一

## まとめ

この設計により、NestJSアプリケーションでMVCパターンの適切な分離を実現できます。保守性、テスタビリティ、再利用性を向上させながら、フレームワークの規約に従った実装が可能になります。