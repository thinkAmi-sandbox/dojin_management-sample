import { INestApplication, ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'

export function setupTestApp(app: INestApplication): void {
  const expressApp = app as NestExpressApplication

  // グローバルバリデーション設定
  expressApp.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  // EJSの設定
  expressApp.useStaticAssets(join(__dirname, '..', '..', 'public'))
  expressApp.setBaseViewsDir(join(__dirname, '..', '..', 'src', 'views'))
  expressApp.setViewEngine('ejs')

  // HTTPメソッドオーバーライドの設定
  const methodOverride = require('method-override')
  expressApp.use(methodOverride('_method'))

  // express-ejs-layoutsの設定
  const expressLayouts = require('express-ejs-layouts')
  expressApp.use(expressLayouts)
  expressApp.set('layout', 'layouts/main')
}
