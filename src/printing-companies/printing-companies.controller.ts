import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Render,
  Redirect,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import type { Response } from 'express'
import { PrintingCompaniesService } from './printing-companies.service'
import { CreatePrintingCompanyDto } from './dto/create-printing-company.dto'
import { UpdatePrintingCompanyDto } from './dto/update-printing-company.dto'

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
  async updateViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      return this.update(id, body, res)
    }
    // 他のメソッドオーバーライドの処理があればここに追加
    res.status(404).send('Not Found')
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePrintingCompanyDto: UpdatePrintingCompanyDto,
    @Res() res: Response,
  ) {
    // バリデーションエラーの処理
    if (
      !updatePrintingCompanyDto.name ||
      updatePrintingCompanyDto.name.trim() === ''
    ) {
      const printingCompany = await this.printingCompaniesService.findOne(id)
      return res.status(200).render('printing-companies/edit', {
        title: '印刷所編集',
        printingCompany: {
          id: printingCompany.id,
          name: updatePrintingCompanyDto.name || '',
          websiteUrl: updatePrintingCompanyDto.website || '',
          notes: updatePrintingCompanyDto.notes || '',
        },
        errors: { name: '印刷所名は必須です' },
        breadcrumbs: [
          { name: '印刷所一覧', url: '/printing-companies' },
          { name: printingCompany.name, url: `/printing-companies/${id}` },
          { name: '編集', url: null },
        ],
      })
    }

    // URLバリデーション
    if (
      updatePrintingCompanyDto.website &&
      updatePrintingCompanyDto.website.trim() !== ''
    ) {
      try {
        new URL(updatePrintingCompanyDto.website)
      } catch {
        const printingCompany = await this.printingCompaniesService.findOne(id)
        return res.status(200).render('printing-companies/edit', {
          title: '印刷所編集',
          printingCompany: {
            id: printingCompany.id,
            name: updatePrintingCompanyDto.name || '',
            websiteUrl: updatePrintingCompanyDto.website || '',
            notes: updatePrintingCompanyDto.notes || '',
          },
          errors: { website: '有効なURLを入力してください' },
          breadcrumbs: [
            { name: '印刷所一覧', url: '/printing-companies' },
            { name: printingCompany.name, url: `/printing-companies/${id}` },
            { name: '編集', url: null },
          ],
        })
      }
    }

    // 更新処理
    await this.printingCompaniesService.update(id, updatePrintingCompanyDto)
    res.redirect(`/printing-companies/${id}`)
  }
}
