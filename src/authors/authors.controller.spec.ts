import { Test, TestingModule } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthorsController } from './authors.controller'
import { AuthorsService } from './authors.service'
import { AuthorDetailView } from './views/author-detail.view'
import { AuthorEditView } from './views/author-edit.view'
import { AuthorsListView } from './views/authors-list.view'

describe('AuthorsController', () => {
  let controller: AuthorsController

  beforeEach(async () => {
    const mockAuthorsService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthorsController],
      providers: [
        {
          provide: AuthorsService,
          useValue: mockAuthorsService,
        },
        AuthorsListView,
        AuthorDetailView,
        AuthorEditView,
      ],
    }).compile()

    controller = module.get<AuthorsController>(AuthorsController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
