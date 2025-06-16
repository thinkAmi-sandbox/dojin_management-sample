import { Injectable } from '@nestjs/common'
import type { Author } from '../../db/schema'

@Injectable()
export class AuthorDetailView {
  render(author: Author) {
    return {
      title: '執筆者詳細',
      author: {
        id: author.id,
        name: author.name,
        email: author.email || '未設定',
        bio: author.bio || '自己紹介未設定',
        formattedCreatedAt: author.createdAt.toLocaleDateString('ja-JP'),
        formattedUpdatedAt: author.updatedAt.toLocaleDateString('ja-JP'),
        editUrl: `/authors/${author.id}/edit`,
      },
      breadcrumbs: [
        { name: '執筆者一覧', url: '/authors' },
        { name: author.name, url: null },
      ],
    }
  }
}
