import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Redirect,
  Render,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import type { Response } from 'express'
import { CreatePrintingCompanyDto } from './dto/create-printing-company.dto'
import { UpdatePrintingCompanyDto } from './dto/update-printing-company.dto'
import { PrintingCompaniesService } from './printing-companies.service'

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

  @Get(':id/edit')
  @Render('printing-companies/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const printingCompany = await this.printingCompaniesService.findOne(id)

    return {
      title: '印刷所編集',
      printingCompany: {
        id: printingCompany.id,
        name: printingCompany.name,
        websiteUrl: printingCompany.websiteUrl,
        notes: printingCompany.notes,
      },
      breadcrumbs: [
        { name: '印刷所一覧', url: '/printing-companies' },
        { name: printingCompany.name, url: `/printing-companies/${id}` },
        { name: '編集', url: null },
      ],
    }
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

  @Post(':id')
  // @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Res() res: Response,
  ) {
    console.log('🚀 updateViaPost called')
    console.log('body:', body)
    console.log('body._method:', body._method)

    if (body._method === 'PUT') {
      console.log('🔄 Calling update method')

      // 手動でバリデーション実行してみる
      const validationPipe = new ValidationPipe({ whitelist: true })
      try {
        const validatedDto = await validationPipe.transform(body, {
          type: 'body',
          metatype: UpdatePrintingCompanyDto,
        })
        console.log('✅ Validation passed:', validatedDto)
        const result = await this.update(id, validatedDto)
        return res.redirect(result.url)
      } catch (error) {
        console.log('❌ Validation failed:', error)
        throw error
      }
    }
    if (body._method === 'DELETE') {
      return this.remove(id, res)
    }
    console.log('❌ Not Found case')
    res.status(404).send('Not Found')
  }

  @Put(':id')
  @Redirect()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePrintingCompanyDto: UpdatePrintingCompanyDto,
  ) {
    await this.printingCompaniesService.update(id, updatePrintingCompanyDto)
    return { url: `/printing-companies/${id}` }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      // ID形式の妥当性チェック
      if (id <= 0 || isNaN(id)) {
        return res.status(400).send('無効なIDです')
      }

      await this.printingCompaniesService.remove(id)
      res.redirect('/printing-companies')
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        return res.status(404).send('印刷所が見つかりませんでした')
      }
      throw error
    }
  }
}
