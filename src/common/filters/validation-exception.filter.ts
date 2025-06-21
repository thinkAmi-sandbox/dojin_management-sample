import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { BadRequestException, Catch } from '@nestjs/common'
import type { Response } from 'express'

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest()

    console.log('🔍 ValidationExceptionFilter catch called')
    console.log('Exception message:', exception.message)
    console.log('Request path:', request.path)

    // ValidationPipeからのエラーかどうかを判定
    const exceptionResponse = exception.getResponse()
    console.log('Exception response:', exceptionResponse)

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as any).message)
    ) {
      // ValidationPipeからのエラーの場合
      const validationErrors = (exceptionResponse as any).message as string[]
      console.log('🔍 Raw validation errors:', validationErrors)

      // エラーメッセージをフィールド名ベースのオブジェクトに変換
      const errors: Record<string, string> = {}

      for (const error of validationErrors) {
        console.log('🔍 Processing error:', error)
        // 日本語エラーメッセージから推測
        if (error.includes('印刷所名') || error.includes('name')) {
          errors.name = error
        } else if (
          error.includes('Webサイト') ||
          error.includes('website') ||
          error.includes('有効なURL')
        ) {
          errors.website = error
        } else if (error.includes('備考') || error.includes('notes')) {
          errors.notes = error
        } else if (error.includes('タイトル')) {
          errors.title = error
        } else if (error.includes('サブタイトル')) {
          errors.subtitle = error
        } else if (error.includes('説明')) {
          errors.description = error
        } else if (error.includes('ページ数')) {
          errors.pageCount = error
        } else if (error.includes('ステータス')) {
          errors.status = error
        } else {
          // 英語メッセージの場合は従来のロジック
          const fieldMatch = error.match(/^(\w+)/)
          if (fieldMatch) {
            const fieldName = fieldMatch[1]
            errors[fieldName] = error
          } else {
            // フィールド名が抽出できない場合は一般的なエラーとして扱う
            errors._general = error
          }
        }
      }
      console.log('🔍 Processed errors:', errors)

      // 元のリクエストデータを取得してフォームに再表示
      const formData = request.body || {}

      // URLからリダイレクト先を決定
      const path = request.path
      let templatePath = ''
      let title = ''

      if (path.includes('/printing-companies/')) {
        if (path.includes('/edit')) {
          templatePath = 'printing-companies/edit'
          title = '印刷所編集'
        } else if (path.endsWith('/printing-companies')) {
          templatePath = 'printing-companies/new'
          title = '印刷所新規作成'
        } else if (path.match(/\/printing-companies\/\d+$/)) {
          // POST /printing-companies/:id (PUT via _method)
          templatePath = 'printing-companies/edit'
          title = '印刷所編集'
        }
      } else if (path.includes('/books')) {
        if (path.includes('/status/edit')) {
          templatePath = 'books/status-edit'
          title = 'ステータス変更'
        } else if (path.includes('/status')) {
          // POST /books/:id/status (PUT via _method)
          templatePath = 'books/status-edit'
          title = 'ステータス変更'
        } else if (path.includes('/edit')) {
          templatePath = 'books/edit'
          title = '書籍編集'
        } else if (path.endsWith('/books')) {
          templatePath = 'books/new'
          title = '新規書籍作成'
        } else if (path.match(/\/books\/\d+$/)) {
          // POST /books/:id (PUT via _method)
          templatePath = 'books/edit'
          title = '書籍編集'
        }
      } else if (path.includes('/authors/')) {
        if (path.includes('/edit')) {
          templatePath = 'authors/edit'
          title = '執筆者編集'
        } else if (path.endsWith('/authors')) {
          templatePath = 'authors/new'
          title = '執筆者新規作成'
        }
      } else if (path.includes('/submissions/')) {
        if (path.includes('/edit')) {
          templatePath = 'submissions/edit'
          title = '入稿編集'
        } else {
          templatePath = 'submissions/new'
          title = '入稿新規作成'
        }
      }

      if (templatePath) {
        console.log('🎯 Rendering template:', templatePath)
        console.log('🎯 Template data:', {
          title,
          errors,
          ...this.prepareFormData(formData, path),
        })
        return response.status(200).render(templatePath, {
          title,
          errors,
          // フォームデータを戻す（テンプレートによって変数名が異なるため汎用的に）
          ...this.prepareFormData(formData, path),
        })
      }
    }

    // ValidationPipe以外のBadRequestExceptionの場合はデフォルト処理
    response.status(400).json({
      statusCode: 400,
      message: exception.message,
    })
  }

  private prepareFormData(formData: any, path: string): any {
    // パスに応じて適切な変数名でフォームデータを返す
    if (path.includes('/printing-companies/')) {
      // パスからIDを抽出 (例: /printing-companies/1 -> 1)
      const idMatch = path.match(/\/printing-companies\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1], 10) : null

      return {
        printingCompany: {
          id,
          name: formData.name || '',
          websiteUrl: formData.website || '',
          notes: formData.notes || '',
        },
        breadcrumbs: id
          ? [
              { name: '印刷所一覧', url: '/printing-companies' },
              { name: `印刷所 #${id}`, url: `/printing-companies/${id}` },
              { name: '編集', url: null },
            ]
          : [],
      }
    } else if (path.includes('/books')) {
      // パスからIDを抽出 (例: /books/1 -> 1)
      const idMatch = path.match(/\/books\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1], 10) : null

      // ステータス編集の場合
      if (path.includes('/status')) {
        const statusOptions = [
          { value: 'planning', label: '企画中' },
          { value: 'writing', label: '執筆中' },
          { value: 'editing', label: '校正中' },
          { value: 'completed', label: '完成' },
        ]

        return {
          book: {
            id,
            title: formData.title || '',
            status: formData.status || 'planning',
          },
          statusOptions,
          breadcrumbs: id
            ? [
                { name: '書籍一覧', url: '/books' },
                { name: `書籍 #${id}`, url: `/books/${id}` },
                { name: 'ステータス変更', url: null },
              ]
            : [],
        }
      }

      // 新規作成の場合
      if (path === '/books') {
        return {
          book: {
            title: formData.title || '',
            subtitle: formData.subtitle || '',
            description: formData.description || '',
            pageCount: formData.pageCount || '',
          },
        }
      }

      // 通常の編集の場合
      return {
        book: {
          id,
          title: formData.title || '',
          subtitle: formData.subtitle || '',
          description: formData.description || '',
          pageCount: formData.pageCount || '',
          status: formData.status || 'planning',
        },
        breadcrumbs: id
          ? [
              { name: '書籍一覧', url: '/books' },
              { name: `書籍 #${id}`, url: `/books/${id}` },
              { name: '編集', url: null },
            ]
          : [],
      }
    } else if (path.includes('/authors/')) {
      return {
        author: {
          name: formData.name || '',
          email: formData.email || '',
          profile: formData.profile || '',
        },
      }
    } else if (path.includes('/submissions/')) {
      return {
        submission: {
          title: formData.title || '',
          amount: formData.amount || '',
          submittedAt: formData.submittedAt || '',
          notes: formData.notes || '',
        },
      }
    }

    return formData
  }
}
