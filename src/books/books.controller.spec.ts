import { Test, TestingModule } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BooksController } from './books.controller'
import { BooksService } from './books.service'
import { BooksListView } from './views/books-list.view'

describe('BooksController', () => {
  let controller: BooksController
  let _service: BooksService
  let _listView: BooksListView

  const mockBooksService = {
    findAll: vi.fn(),
  }

  const mockBooksListView = {
    render: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        {
          provide: BooksService,
          useValue: mockBooksService,
        },
        {
          provide: BooksListView,
          useValue: mockBooksListView,
        },
      ],
    }).compile()

    controller = module.get<BooksController>(BooksController)
    _service = module.get<BooksService>(BooksService)
    _listView = module.get<BooksListView>(BooksListView)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
