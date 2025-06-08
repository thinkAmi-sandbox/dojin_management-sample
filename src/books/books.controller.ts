import { Controller, Get, Header } from '@nestjs/common';

@Controller('books')
export class BooksController {
  @Get()
  @Header('Content-Type', 'text/html')
  findAll(): string {
    return '<p>Hello</p>';
  }
}
