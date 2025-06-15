import { INestApplication } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'

export function setupTestApp(app: INestApplication): void {
  const expressApp = app as NestExpressApplication

  // EJSの設定
  expressApp.useStaticAssets(join(__dirname, '..', '..', 'public'))
  expressApp.setBaseViewsDir(join(__dirname, '..', '..', 'src', 'views'))
  expressApp.setViewEngine('ejs')

  // express-ejs-layoutsの設定
  const expressLayouts = require('express-ejs-layouts')
  expressApp.use(expressLayouts)
  expressApp.set('layout', 'layouts/main')
}
