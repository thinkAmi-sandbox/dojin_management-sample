import { Injectable } from '@nestjs/common'
import type { Author } from '../../db/schema'

@Injectable()
export class AuthorEditView {
  render(author: Author) {
    return {
      title: '執筆者編集',
      author: {
        id: author.id,
        name: author.name,
        email: author.email || '',
        bio: author.bio || '',
      },
      errors: {},
      breadcrumbs: [
        { name: '執筆者一覧', url: '/authors' },
        { name: author.name, url: `/authors/${author.id}` },
        { name: '編集', url: null },
      ],
    }
  }
}
