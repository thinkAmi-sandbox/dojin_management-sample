import { Injectable } from '@nestjs/common'
import { ViewService } from '../../common/services/view.service'
import { Book } from '../../db/schema'
import { BooksListViewModel, FormattedBook } from '../interfaces/view-models'

@Injectable()
export class BooksListView {
  constructor(private readonly viewService: ViewService) {}

  render(books: Book[]): BooksListViewModel {
    return {
      title: '書籍一覧',
      books: books.map((book) => this.formatBook(book)),
      hasBooks: books.length > 0,
      totalCount: books.length,
      breadcrumbs: this.viewService.createBreadcrumbs([
        { name: 'ホーム', url: '/' },
        { name: '書籍一覧', url: '/books' },
      ]),
    }
  }

  private formatBook(book: Book): FormattedBook {
    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle || '',
      description: this.viewService.truncateText(book.description || '', 100),
      formattedCreatedAt: this.viewService.formatDate(book.createdAt),
      detailUrl: `/books/${book.id}`,
      editUrl: `/books/${book.id}/edit`,
    }
  }
}
