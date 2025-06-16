import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthorsModule } from './authors/authors.module'
import { BookAuthorsModule } from './book-authors/book-authors.module'
import { BooksModule } from './books/books.module'
import { DeadlinesModule } from './deadlines/deadlines.module'
import { DrizzleModule } from './drizzle/drizzle.module'

@Module({
  imports: [
    DrizzleModule,
    BooksModule,
    DeadlinesModule,
    AuthorsModule,
    BookAuthorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
