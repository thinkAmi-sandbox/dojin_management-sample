import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { BooksModule } from './books/books.module'
import { DrizzleModule } from './drizzle/drizzle.module'

@Module({
  imports: [DrizzleModule, BooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
