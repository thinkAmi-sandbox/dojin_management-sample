import { Controller, Get, Render } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('home/index')
  getHello() {
    return {
      title: 'ホーム',
      breadcrumbs: [{ label: 'ホーム', href: '/', isActive: true }],
    }
  }
}
