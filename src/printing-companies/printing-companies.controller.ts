import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Render,
  Redirect,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { PrintingCompaniesService } from './printing-companies.service'
import { CreatePrintingCompanyDto } from './dto/create-printing-company.dto'

@Controller('printing-companies')
export class PrintingCompaniesController {
  constructor(
    private readonly printingCompaniesService: PrintingCompaniesService,
  ) {}

  @Get()
  @Render('printing-companies/index')
  async findAll() {
    const printingCompanies = await this.printingCompaniesService.findAll()

    return {
      title: '印刷所一覧',
      printingCompanies: printingCompanies.map((company) => ({
        id: company.id,
        name: company.name,
        websiteUrl: company.websiteUrl,
        notes: company.notes
          ? company.notes.length > 50
            ? company.notes.substring(0, 50) + '...'
            : company.notes
          : '',
        fullNotes: company.notes || '',
      })),
    }
  }

  @Get('new')
  @Render('printing-companies/new')
  renderNewForm() {
    return {
      title: '新規印刷所登録',
      breadcrumbs: [
        { name: '印刷所一覧', url: '/printing-companies' },
        { name: '新規登録', url: null },
      ],
    }
  }

  @Post()
  @Redirect('/printing-companies')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() createPrintingCompanyDto: CreatePrintingCompanyDto) {
    await this.printingCompaniesService.create(createPrintingCompanyDto)
  }

  @Get(':id')
  @Render('printing-companies/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const printingCompany = await this.printingCompaniesService.findOne(id)

    return {
      title: '印刷所詳細',
      printingCompany: {
        id: printingCompany.id,
        name: printingCompany.name,
        websiteUrl: printingCompany.websiteUrl,
        notes: printingCompany.notes || '備考なし',
        formattedCreatedAt:
          printingCompany.createdAt.toLocaleDateString('ja-JP'),
        formattedUpdatedAt:
          printingCompany.updatedAt.toLocaleDateString('ja-JP'),
        editUrl: `/printing-companies/${printingCompany.id}/edit`,
      },
      breadcrumbs: [
        { name: '印刷所一覧', url: '/printing-companies' },
        { name: printingCompany.name, url: null },
      ],
    }
  }
}
