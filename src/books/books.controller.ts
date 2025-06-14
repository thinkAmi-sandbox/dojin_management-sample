import { Controller, Get, Header } from '@nestjs/common'
import { BooksService } from './books.service'

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  async findAll(): Promise<string> {
    const books = await this.booksService.findAll()

    if (books.length === 0) {
      return `<!DOCTYPE html>
<html>
<head>
  <title>書籍一覧</title>
</head>
<body>
  <h1>書籍一覧</h1>
  <p>書籍が登録されていません</p>
</body>
</html>`
    }

    const bookList = books
      .map(
        (book) => `
      <div>
        <h2>${book.title}</h2>
        ${book.subtitle ? `<h3>${book.subtitle}</h3>` : ''}
        ${book.description ? `<p>${book.description}</p>` : ''}
        ${book.pageCount ? `<p>ページ数: ${book.pageCount}</p>` : ''}
      </div>
    `,
      )
      .join('')

    return `<!DOCTYPE html>
<html>
<head>
  <title>書籍一覧</title>
</head>
<body>
  <h1>書籍一覧</h1>
  ${bookList}
</body>
</html>`
  }
}
