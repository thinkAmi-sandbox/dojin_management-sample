import { Module } from '@nestjs/common'
import { AnalyticsModule } from './analytics/analytics.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthorsModule } from './authors/authors.module'
import { BookAuthorsModule } from './book-authors/book-authors.module'
import { BooksModule } from './books/books.module'
import { CirclesModule } from './circles/circles.module'
import { DeadlinesModule } from './deadlines/deadlines.module'
import { DrizzleModule } from './drizzle/drizzle.module'
import { EditionsModule } from './editions/editions.module'
import { EventsModule } from './events/events.module'
import { ExhibitBooksModule } from './exhibit-books/exhibit-books.module'
import { ExhibitsModule } from './exhibits/exhibits.module'
import { PrintingCompaniesModule } from './printing-companies/printing-companies.module'
import { StorageLocationsModule } from './storage-locations/storage-locations.module'
import { SubmissionsModule } from './submissions/submissions.module'

@Module({
  imports: [
    DrizzleModule,
    AnalyticsModule,
    BooksModule,
    DeadlinesModule,
    AuthorsModule,
    BookAuthorsModule,
    CirclesModule,
    EditionsModule,
    EventsModule,
    ExhibitBooksModule,
    ExhibitsModule,
    PrintingCompaniesModule,
    StorageLocationsModule,
    SubmissionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
