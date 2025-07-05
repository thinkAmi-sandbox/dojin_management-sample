import { Controller, Get, Render } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor() {
    // このコンストラクタは将来の依存関係注入のために予約されています
  }

  @Get()
  @Render('home/index')
  getHello() {
    return {
      title: 'ホーム',
      breadcrumbs: [{ label: 'ホーム', href: '/', isActive: true }],
    }
  }
}
