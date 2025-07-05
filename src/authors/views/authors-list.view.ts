import { Injectable } from '@nestjs/common'
import type { Author } from '../../db/schema'

@Injectable()
export class AuthorsListView {
  render(authors: Author[]) {
    return {
      title: '執筆者一覧',
      authors: authors.map((author) => ({
        id: author.id,
        name: author.name,
        email: author.email || '未設定',
        bio: author.bio || '自己紹介未設定',
        detailUrl: `/authors/${author.id}`,
        editUrl: `/authors/${author.id}/edit`,
      })),
      createUrl: '/authors/new',
    }
  }
}
