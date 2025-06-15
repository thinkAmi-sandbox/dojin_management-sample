import { Injectable } from '@nestjs/common'
import { Book } from '../../db/schema'
import { ValidationError } from 'class-validator'

export interface BookEditViewModel {
  title: string
  book: {
    id: number
    title: string
    subtitle: string
    description: string
    pageCount: string
  }
  errors: Record<string, string>
  breadcrumbs: Array<{
    label: string
    url?: string
  }>
}

@Injectable()
export class BookEditView {
  render(book: Book, errors: ValidationError[] = []): BookEditViewModel {
    const errorMap: Record<string, string> = {}
    errors.forEach((error) => {
      if (error.constraints) {
        errorMap[error.property] = Object.values(error.constraints)[0]
      }
    })

    return {
      title: '書籍編集',
      book: {
        id: book.id,
        title: book.title,
        subtitle: book.subtitle || '',
        description: book.description || '',
        pageCount: book.pageCount?.toString() || '',
      },
      errors: errorMap,
      breadcrumbs: [
        { label: '書籍一覧', url: '/books' },
        { label: book.title, url: `/books/${book.id}` },
        { label: '編集' },
      ],
    }
  }

  renderWithErrors(
    book: Partial<Book> & { id: number },
    errors: ValidationError[],
  ): BookEditViewModel {
    const errorMap: Record<string, string> = {}
    errors.forEach((error) => {
      if (error.constraints) {
        errorMap[error.property] = Object.values(error.constraints)[0]
      }
    })

    return {
      title: '書籍編集',
      book: {
        id: book.id,
        title: book.title || '',
        subtitle: book.subtitle || '',
        description: book.description || '',
        pageCount: book.pageCount?.toString() || '',
      },
      errors: errorMap,
      breadcrumbs: [{ label: '書籍一覧', url: '/books' }, { label: '編集' }],
    }
  }
}
