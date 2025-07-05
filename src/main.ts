import { join } from 'path'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import * as dotenv from 'dotenv'
import * as expressLayouts from 'express-ejs-layouts'
import * as methodOverride from 'method-override'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter'

// 環境変数を読み込み
dotenv.config()

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  })

  // Pinoロガーの設定
  app.useLogger(app.get(Logger))

  // グローバルバリデーション設定
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  // グローバル例外フィルター設定
  app.useGlobalFilters(new ValidationExceptionFilter())

  // EJSの設定
  app.useStaticAssets(join(__dirname, '..', 'public'))
  // __dirnameがdist/srcを含むかどうかでビルド後か判定
  const isBuilt = __dirname.includes('dist')
  const viewsPath = isBuilt
    ? join(__dirname, '..', 'views') // dist/views
    : join(__dirname, 'views') // src/views
  app.setBaseViewsDir(viewsPath)
  app.setViewEngine('ejs')

  // HTTPメソッドオーバーライドの設定
  app.use(methodOverride('_method'))

  // express-ejs-layoutsの設定
  app.use(expressLayouts)
  app.set('layout', 'layouts/main')

  const port = process.env.PORT ?? 3000
  await app.listen(port)

  // 起動ログ
  const logger = app.get(Logger)
  logger.log(`🚀 Application is running on: http://localhost:${port}`)
}
bootstrap()
