import { Module } from '@nestjs/common'
import { AuthorsController } from './authors.controller'
import { AuthorsService } from './authors.service'
import { AuthorDetailView } from './views/author-detail.view'
import { AuthorEditView } from './views/author-edit.view'
import { AuthorsListView } from './views/authors-list.view'

@Module({
  controllers: [AuthorsController],
  providers: [
    AuthorsService,
    AuthorsListView,
    AuthorDetailView,
    AuthorEditView,
  ],
  exports: [AuthorsService],
})
export class AuthorsModule {}
