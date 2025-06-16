import { join } from 'path'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import * as dotenv from 'dotenv'
import * as expressLayouts from 'express-ejs-layouts'
import * as methodOverride from 'method-override'
import { AppModule } from './app.module'

// 環境変数を読み込み
dotenv.config()

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // グローバルバリデーション設定
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

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

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
