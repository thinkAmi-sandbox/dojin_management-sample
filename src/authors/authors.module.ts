import { Module } from '@nestjs/common'
import { AuthorsService } from './authors.service'
import { AuthorsController } from './authors.controller'
import { AuthorsListView } from './views/authors-list.view'
import { AuthorDetailView } from './views/author-detail.view'
import { AuthorEditView } from './views/author-edit.view'

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
