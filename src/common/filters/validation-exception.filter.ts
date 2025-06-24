import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { BadRequestException, Catch } from '@nestjs/common'
import type { Response } from 'express'

interface ValidationExceptionResponse {
  message: string[]
  error: string
  statusCode: number
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest()

    // ValidationPipeからのエラーかどうかを判定
    const exceptionResponse = exception.getResponse()

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as ValidationExceptionResponse).message)
    ) {
      // ValidationPipeからのエラーの場合
      const validationErrors = (
        exceptionResponse as ValidationExceptionResponse
      ).message

      // エラーメッセージをフィールド名ベースのオブジェクトに変換
      const errors: Record<string, string> = {}

      for (const error of validationErrors) {
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
        } else if (error.includes('名前')) {
          errors.name = error
        } else if (
          error.includes('メールアドレス') ||
          error.includes('有効なメールアドレス')
        ) {
          errors.email = error
        } else if (error.includes('プロフィール') || error.includes('bio')) {
          errors.bio = error
        } else if (error.includes('締切日') || error.includes('dueDate')) {
          errors.dueDate = error
        } else if (error.includes('部数')) {
          errors.quantity = error
        } else if (error.includes('印刷所ID') || error.includes('印刷所')) {
          errors.printingCompanyId = error
        } else if (error.includes('入稿日')) {
          errors.submissionDate = error
        } else if (error.includes('納品予定日')) {
          errors.expectedDeliveryDate = error
        } else if (error.includes('印刷費')) {
          errors.printingCost = error
        } else if (error.includes('送料')) {
          errors.shippingCost = error
        } else if (error.includes('その他費用')) {
          errors.otherCost = error
        } else if (error.includes('ステータス')) {
          errors.status = error
        } else if (error.includes('執筆者') || error.includes('authorId')) {
          errors.authorId = error
        } else if (error.includes('イベント') || error.includes('eventId')) {
          errors.eventId = error
        } else if (error.includes('サークル') || error.includes('circleId')) {
          errors.circleId = error
        } else if (error.includes('スペース番号')) {
          errors.spaceNumber = error
        } else if (
          error.includes('スペース種別') ||
          error.includes('スペースタイプ')
        ) {
          errors.spaceType = error
        } else if (error.includes('申込備考')) {
          errors.applicationNotes = error
        } else if (error.includes('結果備考')) {
          errors.resultNotes = error
        } else if (error.includes('書籍') || error.includes('bookId')) {
          errors.bookId = error
        } else if (error.includes('頒布予定数')) {
          errors.plannedQuantity = error
        } else if (error.includes('価格')) {
          errors.price = error
        } else if (error.includes('表示順序')) {
          errors.displayOrder = error
        } else if (error.includes('役割')) {
          errors.role = error
        } else if (error.includes('退会日')) {
          errors.leftAt = error
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

      // 元のリクエストデータを取得してフォームに再表示
      const formData = request.body || {}

      // URLからリダイレクト先を決定
      const path = request.path
      let templatePath = ''
      let title = ''

      // より具体的なパターンを先に判定
      if (path.match(/\/books\/\d+\/deadlines/)) {
        // 書籍の締切関連パス
        if (path.match(/\/books\/\d+\/deadlines$/)) {
          // POST /books/:bookId/deadlines (新規作成)
          templatePath = 'deadlines/new'
          title = '締切追加'
        }
      } else if (path.match(/\/books\/\d+\/submissions/)) {
        // 書籍の入稿関連パス
        if (path.match(/\/books\/\d+\/submissions$/)) {
          // POST /books/:bookId/submissions (新規作成)
          templatePath = 'submissions/new'
          title = '入稿作成'
        }
      } else if (path.match(/\/books\/\d+\/authors/)) {
        // 書籍の執筆者関連パス
        if (path.match(/\/books\/\d+\/authors$/)) {
          // POST /books/:bookId/authors (執筆者追加)
          templatePath = 'book-authors/add'
          title = '執筆者追加'
        }
      } else if (path.includes('/printing-companies')) {
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
      } else if (path.includes('/deadlines')) {
        if (path.includes('/edit')) {
          templatePath = 'deadlines/edit'
          title = '締切編集'
        } else if (path.match(/\/deadlines\/\d+$/)) {
          // POST /deadlines/:id (PUT via _method)
          templatePath = 'deadlines/edit'
          title = '締切編集'
        } else {
          templatePath = 'deadlines/edit'
          title = '締切編集'
        }
      } else if (path.match(/\/exhibits\/\d+\/books/)) {
        // 出展書籍関連パス（優先度: 具体的なパターンから先に判定）
        if (path.match(/\/exhibits\/\d+\/books\/\d+\/edit/)) {
          // GET /exhibits/:exhibitId/books/:bookId/edit
          templatePath = 'exhibit-books/edit'
          title = '頒布情報編集'
        } else if (path.match(/\/exhibits\/\d+\/books\/\d+$/)) {
          // POST /exhibits/:exhibitId/books/:bookId (PUT via _method)
          templatePath = 'exhibit-books/edit'
          title = '頒布情報編集'
        } else if (path.match(/\/exhibits\/\d+\/books\/add/)) {
          // GET /exhibits/:exhibitId/books/add
          templatePath = 'exhibit-books/add'
          title = '頒布書籍追加'
        } else if (path.match(/\/exhibits\/\d+\/books$/)) {
          // POST /exhibits/:exhibitId/books (新規作成)
          templatePath = 'exhibit-books/add'
          title = '頒布書籍追加'
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
      } else if (path.includes('/authors')) {
        if (path.includes('/edit')) {
          templatePath = 'authors/edit'
          title = '執筆者編集'
        } else if (path.endsWith('/authors')) {
          templatePath = 'authors/new'
          title = '執筆者新規作成'
        } else if (path.match(/\/authors\/\d+$/)) {
          // POST /authors/:id (PUT via _method)
          templatePath = 'authors/edit'
          title = '執筆者編集'
        }
      } else if (path.includes('/submissions')) {
        if (path.includes('/edit')) {
          templatePath = 'submissions/edit'
          title = '入稿編集'
        } else if (path.match(/\/submissions\/\d+$/)) {
          // POST /submissions/:id (PUT via _method)
          templatePath = 'submissions/edit'
          title = '入稿編集'
        } else {
          templatePath = 'submissions/new'
          title = '入稿新規作成'
        }
      } else if (path.match(/\/events\/\d+\/exhibits/)) {
        // イベント別出展申込関連パス
        if (path.match(/\/events\/\d+\/exhibits$/)) {
          // POST /events/:eventId/exhibits (新規出展申込)
          templatePath = 'events/exhibits/new'
          title = 'イベントへの出展申込'
        }
      } else if (path.match(/\/circles\/\d+\/exhibits/)) {
        // サークル別出展申込関連パス
        if (path.match(/\/circles\/\d+\/exhibits$/)) {
          // POST /circles/:circleId/exhibits (新規出展申込)
          templatePath = 'circles/exhibits/new'
          title = 'サークルからの出展申込'
        }
      } else if (path.match(/\/circles\/\d+\/members/)) {
        // サークルメンバー管理関連パス
        if (path.match(/\/circles\/\d+\/members\/\d+\/edit/)) {
          // GET /circles/:circleId/members/:authorId/edit
          templatePath = 'circles/members/edit'
          title = 'メンバー情報編集'
        } else if (path.match(/\/circles\/\d+\/members\/\d+$/)) {
          // POST /circles/:circleId/members/:authorId (PUT via _method)
          templatePath = 'circles/members/edit'
          title = 'メンバー情報編集'
        } else if (path.match(/\/circles\/\d+\/members\/add/)) {
          // GET /circles/:circleId/members/add
          templatePath = 'circles/members/add'
          title = 'メンバー追加'
        } else if (path.match(/\/circles\/\d+\/members$/)) {
          // POST /circles/:circleId/members (新規メンバー追加)
          templatePath = 'circles/members/add'
          title = 'メンバー追加'
        }
      } else if (path.includes('/events')) {
        if (path.includes('/edit')) {
          templatePath = 'events/edit'
          title = 'イベント編集'
        } else if (path.endsWith('/events')) {
          templatePath = 'events/new'
          title = 'イベント新規作成'
        } else if (path.match(/\/events\/\d+$/)) {
          // POST /events/:id (PUT via _method)
          templatePath = 'events/edit'
          title = 'イベント編集'
        }
      } else if (path.match(/\/circles\/\d+\/members/)) {
        // サークルメンバー管理関連パス（より具体的なパターンを先に判定）
        if (path.match(/\/circles\/\d+\/members\/\d+\/edit/)) {
          // GET /circles/:circleId/members/:authorId/edit
          templatePath = 'circles/members/edit'
          title = 'メンバー情報編集'
        } else if (path.match(/\/circles\/\d+\/members\/\d+$/)) {
          // POST /circles/:circleId/members/:authorId (PUT via _method)
          templatePath = 'circles/members/edit'
          title = 'メンバー情報編集'
        } else if (path.match(/\/circles\/\d+\/members\/add/)) {
          // GET /circles/:circleId/members/add
          templatePath = 'circles/members/add'
          title = 'メンバー追加'
        } else if (path.match(/\/circles\/\d+\/members$/)) {
          // POST /circles/:circleId/members (新規メンバー追加)
          templatePath = 'circles/members/add'
          title = 'メンバー追加'
        }
      } else if (path.includes('/circles')) {
        console.log('🔍 通常のサークル分岐に入りました')
        if (path.includes('/edit')) {
          templatePath = 'circles/edit'
          title = 'サークル編集'
        } else if (path.endsWith('/circles')) {
          templatePath = 'circles/new'
          title = 'サークル新規作成'
        } else if (path.match(/\/circles\/\d+$/)) {
          // POST /circles/:id (PUT via _method)
          templatePath = 'circles/edit'
          title = 'サークル編集'
        }
      } else if (path.includes('/exhibits')) {
        if (path.includes('/edit')) {
          templatePath = 'exhibits/edit'
          title = '出展申込編集'
        } else if (path.endsWith('/exhibits')) {
          templatePath = 'exhibits/new'
          title = '出展申込新規作成'
        } else if (path.match(/\/exhibits\/\d+$/)) {
          // POST /exhibits/:id (PUT via _method)
          templatePath = 'exhibits/edit'
          title = '出展申込編集'
        }
      }

      if (templatePath) {
        const preparedData = this.prepareFormData(formData, path)

        const templateData = {
          title,
          errors,
          // フォームデータを戻す（テンプレートによって変数名が異なるため汎用的に）
          ...preparedData,
        }

        return response.status(200).render(templatePath, templateData)
      }
    }

    // ValidationPipe以外のBadRequestExceptionの場合はデフォルト処理
    response.status(400).json({
      statusCode: 400,
      message: exception.message,
    })
  }

  private prepareFormData(
    formData: Record<string, unknown>,
    path: string,
  ): Record<string, unknown> {
    // より具体的なパターンを先に判定
    if (path.match(/\/exhibits\/\d+\/books/)) {
      // 出展書籍関連パス
      const exhibitIdMatch = path.match(/\/exhibits\/(\d+)\/books/)
      if (exhibitIdMatch) {
        const exhibitId = parseInt(exhibitIdMatch[1], 10)

        if (
          path.includes('/edit') ||
          path.match(/\/exhibits\/\d+\/books\/\d+$/)
        ) {
          // 編集フォーム用データ
          const bookIdMatch = path.match(/\/exhibits\/\d+\/books\/(\d+)/)
          const bookId = bookIdMatch ? parseInt(bookIdMatch[1], 10) : 1

          return {
            exhibit: {
              id: exhibitId,
              status: 'applied',
              spaceNumber: '-',
              spaceType: '-',
            },
            book: {
              id: bookId,
              title: `書籍 #${bookId}`,
              subtitle: '',
              formattedPageCount: '-',
            },
            formData: {
              plannedQuantity: formData.plannedQuantity || '',
              price: formData.price || '',
              displayOrder: formData.displayOrder || '',
            },
            updateUrl: `/exhibits/${exhibitId}/books/${bookId}`,
            backUrl: `/exhibits/${exhibitId}/books`,
            breadcrumbs: [
              { name: '出展申込一覧', url: '/exhibits' },
              { name: '出展申込詳細', url: `/exhibits/${exhibitId}` },
              { name: '頒布書籍一覧', url: `/exhibits/${exhibitId}/books` },
              { name: '頒布情報編集', url: null },
            ],
          }
        } else {
          // 追加フォーム用データ
          return {
            exhibit: {
              id: exhibitId,
              status: 'applied',
              spaceNumber: '-',
              spaceType: '-',
            },
            books: [
              {
                id: 1,
                title: 'ダミー書籍',
                subtitle: '',
                formattedPageCount: '-',
              },
            ],
            formData: {
              bookId: formData.bookId || '',
              plannedQuantity: formData.plannedQuantity || '',
              price: formData.price || '',
              displayOrder: formData.displayOrder || '',
            },
            backUrl: `/exhibits/${exhibitId}/books`,
            breadcrumbs: [
              { name: '出展申込一覧', url: '/exhibits' },
              { name: '出展申込詳細', url: `/exhibits/${exhibitId}` },
              { name: '頒布書籍一覧', url: `/exhibits/${exhibitId}/books` },
              { name: '頒布書籍追加', url: null },
            ],
          }
        }
      }
    } else if (path.match(/\/books\/\d+\/deadlines/)) {
      // 書籍の締切関連パス
      const bookIdMatch = path.match(/\/books\/(\d+)\/deadlines/)
      if (bookIdMatch) {
        const bookId = parseInt(bookIdMatch[1], 10)
        return {
          deadline: {
            title: formData.title || '',
            dueDate: formData.dueDate || '',
            description: formData.description || '',
          },
          book: {
            id: bookId,
            title: `書籍 #${bookId}`, // 実際の書籍タイトルは取得困難
          },
          breadcrumbs: [
            { name: '書籍一覧', url: '/books' },
            { name: `書籍 #${bookId}`, url: `/books/${bookId}` },
            { name: '締切一覧', url: `/books/${bookId}/deadlines` },
            { name: '締切追加', url: null },
          ],
        }
      }
    } else if (path.match(/\/books\/\d+\/submissions/)) {
      // 書籍の入稿関連パス
      const bookIdMatch = path.match(/\/books\/(\d+)\/submissions/)
      if (bookIdMatch) {
        const bookId = parseInt(bookIdMatch[1], 10)
        return {
          submission: {
            printingCompanyId: formData.printingCompanyId || '',
            quantity: formData.quantity || '',
            submissionDate: formData.submissionDate || '',
            expectedDeliveryDate: formData.expectedDeliveryDate || '',
            specificationNotes: formData.specificationNotes || '',
            printingCost: formData.printingCost || '',
            shippingCost: formData.shippingCost || '',
            otherCost: formData.otherCost || '',
            discountType: formData.discountType || '',
            deliveryDestination: formData.deliveryDestination || '',
            deliveryNotes: formData.deliveryNotes || '',
            submissionFileNotes: formData.submissionFileNotes || '',
            generalNotes: formData.generalNotes || '',
          },
          book: {
            id: bookId,
            title: `書籍 #${bookId}`,
          },
          printingCompanies: [], // 印刷所リストは取得困難
          breadcrumbs: [
            { name: '書籍一覧', url: '/books' },
            { name: `書籍 #${bookId}`, url: `/books/${bookId}` },
            { name: '入稿一覧', url: `/books/${bookId}/submissions` },
            { name: '入稿作成', url: null },
          ],
        }
      }
    } else if (path.match(/\/books\/\d+\/authors/)) {
      // 書籍の執筆者関連パス
      const bookIdMatch = path.match(/\/books\/(\d+)\/authors/)
      if (bookIdMatch) {
        const bookId = parseInt(bookIdMatch[1], 10)
        return {
          book: {
            id: bookId,
            title: `書籍 #${bookId}`,
          },
          authors: [{ id: 1, name: 'ダミー執筆者', email: '' }], // エラー表示のためのダミーデータ
          breadcrumbs: [
            { name: '書籍一覧', url: '/books' },
            { name: `書籍 #${bookId}`, url: `/books/${bookId}` },
            { name: '執筆者一覧', url: `/books/${bookId}/authors` },
            { name: '執筆者追加', url: null },
          ],
        }
      }
    } else if (path.includes('/printing-companies')) {
      // パスからIDを抽出 (例: /printing-companies/1 -> 1)
      const idMatch = path.match(/\/printing-companies\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1], 10) : null

      // 新規作成の場合
      if (path === '/printing-companies') {
        return {
          printingCompany: {
            name: formData.name || '',
            websiteUrl: formData.website || '',
            notes: formData.notes || '',
          },
        }
      }

      // 編集の場合
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
    } else if (path.includes('/authors')) {
      // パスからIDを抽出 (例: /authors/1 -> 1)
      const idMatch = path.match(/\/authors\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1], 10) : null

      // 新規作成の場合
      if (path === '/authors') {
        return {
          author: {
            name: formData.name || '',
            email: formData.email || '',
            bio: formData.bio || '',
          },
        }
      }

      // 編集の場合
      return {
        author: {
          id,
          name: formData.name || '',
          email: formData.email || '',
          bio: formData.bio || '',
        },
        breadcrumbs: id
          ? [
              { name: '執筆者一覧', url: '/authors' },
              { name: `執筆者 #${id}`, url: `/authors/${id}` },
              { name: '編集', url: null },
            ]
          : [],
      }
    } else if (path.includes('/deadlines')) {
      // パスからIDを抽出 (例: /deadlines/1 -> 1)
      const idMatch = path.match(/\/deadlines\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1], 10) : null

      // 編集の場合
      return {
        deadline: {
          id,
          title: formData.title || '',
          dueDate: formData.dueDate || '',
          description: formData.description || '',
        },
        book: {
          id: 1, // bookIdが不明なため暫定値
          title: '書籍', // 暫定タイトル
        },
        breadcrumbs: [
          { name: '書籍一覧', url: '/books' },
          { name: '書籍', url: '#' }, // bookIdが不明なため
          { name: '締切一覧', url: '#' },
          { name: '編集', url: null },
        ],
      }
    } else if (path.includes('/submissions')) {
      // パスからIDを抽出 (例: /submissions/1 -> 1)
      const idMatch = path.match(/\/submissions\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1], 10) : null

      return {
        submission: {
          id,
          printingCompanyId: formData.printingCompanyId || '',
          status: formData.status || 'draft',
          quantity: formData.quantity || '',
          submissionDate: formData.submissionDate || '',
          expectedDeliveryDate: formData.expectedDeliveryDate || '',
          specificationNotes: formData.specificationNotes || '',
          printingCost: formData.printingCost || '',
          shippingCost: formData.shippingCost || '',
          otherCost: formData.otherCost || '',
          discountType: formData.discountType || '',
          deliveryDestination: formData.deliveryDestination || '',
          deliveryNotes: formData.deliveryNotes || '',
          submissionFileNotes: formData.submissionFileNotes || '',
          generalNotes: formData.generalNotes || '',
        },
        printingCompanies: [], // 印刷所リストは取得困難
        breadcrumbs: id
          ? [
              { name: '入稿一覧', url: '/submissions' },
              { name: '入稿詳細', url: `/submissions/${id}` },
              { name: '編集', url: null },
            ]
          : [],
      }
    } else if (path.match(/\/events\/\d+\/exhibits/)) {
      // イベント別出展申込関連パス
      const eventIdMatch = path.match(/\/events\/(\d+)\/exhibits/)
      if (eventIdMatch) {
        const eventId = parseInt(eventIdMatch[1], 10)
        return {
          event: {
            id: eventId,
            name: `イベント #${eventId}`, // 実際のイベント名は取得困難
            formattedEventDate: '2024/01/01', // ダミー値
            venue: '会場名', // ダミー値
            formattedApplicationEndDate: '2024/01/01', // ダミー値
          },
          circles: [
            { id: 1, name: 'ダミーサークル', representativeName: '代表者' },
          ], // エラー表示のためのダミーデータ
        }
      }
    } else if (path.match(/\/circles\/\d+\/members/)) {
      // サークルメンバー管理関連パス
      const circleIdMatch = path.match(/\/circles\/(\d+)\/members/)
      if (circleIdMatch) {
        const circleId = parseInt(circleIdMatch[1], 10)

        // メンバー編集の場合
        if (path.match(/\/circles\/\d+\/members\/\d+/)) {
          const authorIdMatch = path.match(/\/circles\/\d+\/members\/(\d+)/)
          const authorId = authorIdMatch ? parseInt(authorIdMatch[1], 10) : null

          return {
            circle: {
              id: circleId,
              name: `サークル #${circleId}`,
            },
            member: {
              id: authorId,
              name: `執筆者 #${authorId}`,
              email: 'example@example.com',
              bio: '',
              role: formData.role || 'member',
              joinedAt: formData.joinedAt || '2024-01-01',
              leftAt: formData.leftAt || '',
              notes: formData.notes || '',
            },
            roles: [
              { value: 'representative', label: '代表者' },
              { value: 'member', label: 'メンバー' },
              { value: 'guest', label: 'ゲスト' },
            ],
            formData: {
              role: formData.role || '',
              leftAt: formData.leftAt || '',
              notes: formData.notes || '',
            },
            breadcrumbs: [
              { name: 'サークル一覧', url: '/circles' },
              { name: `サークル #${circleId}`, url: `/circles/${circleId}` },
              { name: 'メンバー一覧', url: `/circles/${circleId}/members` },
              { name: 'メンバー編集', url: null },
            ],
          }
        } else {
          // メンバー追加の場合
          return {
            circle: {
              id: circleId,
              name: `サークル #${circleId}`,
            },
            authors: [
              {
                id: 1,
                name: 'ダミー執筆者',
                email: 'example@example.com',
                bio: '',
              },
            ], // エラー表示のためのダミーデータ
            roles: [
              { value: 'representative', label: '代表者' },
              { value: 'member', label: 'メンバー' },
              { value: 'guest', label: 'ゲスト' },
            ],
            formData: {
              authorId: formData.authorId || '',
              role: formData.role || '',
              notes: formData.notes || '',
            },
            breadcrumbs: [
              { name: 'サークル一覧', url: '/circles' },
              { name: `サークル #${circleId}`, url: `/circles/${circleId}` },
              { name: 'メンバー一覧', url: `/circles/${circleId}/members` },
              { name: 'メンバー追加', url: null },
            ],
          }
        }
      }
    } else if (path.match(/\/circles\/\d+\/exhibits/)) {
      // サークル別出展申込関連パス
      const circleIdMatch = path.match(/\/circles\/(\d+)\/exhibits/)
      if (circleIdMatch) {
        const circleId = parseInt(circleIdMatch[1], 10)
        return {
          circle: {
            id: circleId,
            name: `サークル #${circleId}`, // 実際のサークル名は取得困難
            representativeName: '代表者名', // ダミー値
            email: 'example@example.com', // ダミー値
          },
          events: [
            {
              id: 1,
              name: 'ダミーイベント',
              formattedEventDate: '2024/01/01',
              venue: '会場名',
              formattedApplicationEndDate: '2024/01/01',
            },
          ], // エラー表示のためのダミーデータ
        }
      }
    } else if (path.includes('/events')) {
      // パスからIDを抽出 (例: /events/1 -> 1)
      const idMatch = path.match(/\/events\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1], 10) : null

      // 新規作成の場合
      if (path === '/events') {
        return {
          event: {
            name: formData.name || '',
            eventDate: formData.eventDate || '',
            venue: formData.venue || '',
            applicationStartDate: formData.applicationStartDate || '',
            applicationEndDate: formData.applicationEndDate || '',
            description: formData.description || '',
          },
        }
      }

      // 編集の場合
      return {
        event: {
          id,
          name: formData.name || '',
          eventDate: formData.eventDate || '',
          venue: formData.venue || '',
          applicationStartDate: formData.applicationStartDate || '',
          applicationEndDate: formData.applicationEndDate || '',
          description: formData.description || '',
        },
        breadcrumbs: id
          ? [
              { name: 'イベント一覧', url: '/events' },
              { name: `イベント #${id}`, url: `/events/${id}` },
              { name: '編集', url: null },
            ]
          : [],
      }
    } else if (path.includes('/circles')) {
      // パスからIDを抽出 (例: /circles/1 -> 1)
      const idMatch = path.match(/\/circles\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1], 10) : null

      // 新規作成の場合
      if (path === '/circles') {
        return {
          circle: {
            name: formData.name || '',
            representativeName: formData.representativeName || '',
            email: formData.email || '',
            description: formData.description || '',
          },
        }
      }

      // 編集の場合
      return {
        circle: {
          id,
          name: formData.name || '',
          representativeName: formData.representativeName || '',
          email: formData.email || '',
          description: formData.description || '',
        },
        breadcrumbs: id
          ? [
              { name: 'サークル一覧', url: '/circles' },
              { name: `サークル #${id}`, url: `/circles/${id}` },
              { name: '編集', url: null },
            ]
          : [],
      }
    } else if (path.includes('/exhibits')) {
      // パスからIDを抽出 (例: /exhibits/1 -> 1)
      const idMatch = path.match(/\/exhibits\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1], 10) : null

      // 新規作成の場合
      if (path === '/exhibits') {
        return {
          exhibit: {
            eventId: formData.eventId || '',
            circleId: formData.circleId || '',
            status: formData.status || 'applied',
            spaceNumber: formData.spaceNumber || '',
            spaceType: formData.spaceType || '',
            applicationNotes: formData.applicationNotes || '',
            resultNotes: formData.resultNotes || '',
          },
          events: [], // イベントリストは取得困難
          circles: [], // サークルリストは取得困難
        }
      }

      // 編集の場合
      return {
        exhibit: {
          id,
          eventId: formData.eventId || '',
          circleId: formData.circleId || '',
          status: formData.status || 'applied',
          spaceNumber: formData.spaceNumber || '',
          spaceType: formData.spaceType || '',
          applicationNotes: formData.applicationNotes || '',
          resultNotes: formData.resultNotes || '',
        },
        events: [], // イベントリストは取得困難
        circles: [], // サークルリストは取得困難
        breadcrumbs: id
          ? [
              { name: '出展申込一覧', url: '/exhibits' },
              { name: `出展申込 #${id}`, url: `/exhibits/${id}` },
              { name: '編集', url: null },
            ]
          : [],
      }
    } else if (path.match(/\/circles\/\d+\/members/)) {
      // サークルメンバー管理関連パス
      console.log('🔍 サークルメンバー管理分岐に入りました')
      const circleIdMatch = path.match(/\/circles\/(\d+)\/members/)
      if (circleIdMatch) {
        const circleId = parseInt(circleIdMatch[1], 10)

        if (
          path.includes('/edit') ||
          path.match(/\/circles\/\d+\/members\/\d+$/)
        ) {
          // メンバー編集フォーム用データ
          const authorIdMatch = path.match(/\/circles\/\d+\/members\/(\d+)/)
          const authorId = authorIdMatch ? parseInt(authorIdMatch[1], 10) : 1

          return {
            formData,
            circle: {
              id: circleId,
              name: `サークル #${circleId}`,
            },
            member: {
              id: authorId,
              name: `執筆者 #${authorId}`,
              email: '',
              bio: '',
              role: formData.role || 'member',
              joinedAt: formData.joinedAt || '',
              leftAt: formData.leftAt || '',
              notes: formData.notes || '',
            },
            roles: [
              { value: 'representative', label: '代表者' },
              { value: 'member', label: 'メンバー' },
              { value: 'guest', label: 'ゲスト' },
            ],
            breadcrumbs: [
              { name: 'サークル一覧', url: '/circles' },
              { name: `サークル #${circleId}`, url: `/circles/${circleId}` },
              { name: 'メンバー一覧', url: `/circles/${circleId}/members` },
              { name: 'メンバー編集', url: null },
            ],
          }
        } else {
          // メンバー追加フォーム用データ
          return {
            circle: {
              id: circleId,
              name: `サークル #${circleId}`,
            },
            authors: [
              {
                id: 1,
                name: '佐藤花子',
                email: 'sato@example.com',
                bio: 'バックエンド開発者',
              },
              {
                id: 2,
                name: '鈴木次郎',
                email: 'suzuki@example.com',
                bio: 'インフラエンジニア',
              },
            ], // エラー表示のためのダミーデータ
            roles: [
              { value: 'representative', label: '代表者' },
              { value: 'member', label: 'メンバー' },
              { value: 'guest', label: 'ゲスト' },
            ],
            formData, // フォームデータを個別に返す
            breadcrumbs: [
              { name: 'サークル一覧', url: '/circles' },
              { name: `サークル #${circleId}`, url: `/circles/${circleId}` },
              { name: 'メンバー一覧', url: `/circles/${circleId}/members` },
              { name: 'メンバー追加', url: null },
            ],
          }
        }
      }
    }

    return formData
  }
}
