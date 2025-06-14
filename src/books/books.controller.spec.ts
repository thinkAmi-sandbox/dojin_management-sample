import { Test, TestingModule } from '@nestjs/testing'
import { describe, beforeEach, it, expect, vi } from 'vitest'
import { BooksController } from './books.controller'
import { BooksService } from './books.service'

describe('BooksController', () => {
  let controller: BooksController
  let _service: BooksService

  const mockBooksService = {
    findAll: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        {
          provide: BooksService,
          useValue: mockBooksService,
        },
      ],
    }).compile()

    controller = module.get<BooksController>(BooksController)
    _service = module.get<BooksService>(BooksService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
