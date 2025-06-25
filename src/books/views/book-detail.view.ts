import { Injectable } from '@nestjs/common'
import { Book } from '../../db/schema'

export interface BookDetailViewModel {
  title: string
  book: {
    id: number
    title: string
    subtitle: string | null
    description: string | null
    createdAt: string
    updatedAt: string
  }
  breadcrumbs: Array<{
    label: string
    url?: string
  }>
}

@Injectable()
export class BookDetailView {
  render(book: Book): BookDetailViewModel {
    return {
      title: '書籍詳細',
      book: {
        id: book.id,
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        createdAt: this.formatDate(book.createdAt),
        updatedAt: this.formatDate(book.updatedAt),
      },
      breadcrumbs: [
        { label: '書籍一覧', url: '/books' },
        { label: book.title },
      ],
    }
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }
}
