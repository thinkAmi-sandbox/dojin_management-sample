import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'
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
import { StockMovementsModule } from './stock-movements/stock-movements.module'
import { StocksModule } from './stocks/stocks.module'
import { StorageLocationsModule } from './storage-locations/storage-locations.module'
import { SubmissionsModule } from './submissions/submissions.module'

@Module({
  imports: [
    // ロギング設定
    LoggerModule.forRoot({
      pinoHttp: {
        name: 'dojin-management',
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production' &&
          process.env.LOG_PRETTY_PRINT === 'true'
            ? {
                targets: [
                  {
                    target: 'pino-pretty',
                    level: 'debug',
                    options: {
                      colorize: true,
                      ignore: 'pid,hostname',
                      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                    },
                  },
                  {
                    target: 'pino/file',
                    level: 'debug',
                    options: {
                      destination: './logs/app.log',
                      mkdir: true,
                    },
                  },
                ],
              }
            : undefined,
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            params: req.params,
            query: req.query,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
        customSuccessMessage: (req, res) => {
          return `${req.method} ${req.url} - ${res.statusCode}`
        },
        customErrorMessage: (req, res, err) => {
          return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`
        },
      },
    }),
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
    StockMovementsModule,
    StocksModule,
    StorageLocationsModule,
    SubmissionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
