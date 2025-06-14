import { Test, TestingModule } from '@nestjs/testing'
import { describe, beforeEach, it, expect, vi } from 'vitest'
import { DrizzleService } from '../drizzle/drizzle.service'
import { BooksService } from './books.service'

describe('BooksService', () => {
  let service: BooksService
  let _drizzleService: DrizzleService

  const mockDrizzleService = {
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
      ],
    }).compile()

    service = module.get<BooksService>(BooksService)
    _drizzleService = module.get<DrizzleService>(DrizzleService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
