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
        email: author.email,
        bio: author.bio,
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
