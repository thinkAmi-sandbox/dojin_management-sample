import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import * as dotenv from 'dotenv'
import * as expressLayouts from 'express-ejs-layouts'
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
  app.setBaseViewsDir(join(__dirname, 'views'))
  app.setViewEngine('ejs')

  // express-ejs-layoutsの設定
  app.use(expressLayouts)
  app.set('layout', 'layouts/main')

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
