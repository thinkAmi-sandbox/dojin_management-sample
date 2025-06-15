import { Injectable } from '@nestjs/common'
import { Breadcrumb, BreadcrumbItem } from '../interfaces/common-view-models'

@Injectable()
export class ViewService {
  formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }

  formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  truncateText(text: string, length: number): string {
    if (text.length <= length) {
      return text
    }
    return text.substring(0, length) + '...'
  }

  createBreadcrumbs(items: BreadcrumbItem[]): Breadcrumb[] {
    return items.map((item, index) => ({
      ...item,
      isLast: index === items.length - 1,
    }))
  }

  sanitizeHtml(html: string): string {
    // HTMLサニタイゼーション処理
    // 実際の実装では適切なライブラリを使用
    return html.replace(/<script.*?<\/script>/gi, '')
  }
}
