import { Breadcrumb } from '../../common/interfaces/common-view-models'

export interface BooksListViewModel {
  title: string
  books: FormattedBook[]
  hasBooks: boolean
  totalCount: number
  breadcrumbs: Breadcrumb[]
}

export interface BookDetailViewModel {
  title: string
  book: DetailedFormattedBook
  relatedBooks: FormattedBook[]
  breadcrumbs: Breadcrumb[]
}

export interface FormattedBook {
  id: number
  title: string
  subtitle: string
  description: string
  formattedCreatedAt: string
  detailUrl: string
  editUrl: string
}

export interface DetailedFormattedBook extends FormattedBook {
  formattedUpdatedAt: string
  deleteUrl: string
}

export interface BookFormViewModel {
  title: string
  book?: FormattedBook
  isEdit: boolean
  breadcrumbs: Breadcrumb[]
}
