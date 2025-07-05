import { Test, TestingModule } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DrizzleService } from '../drizzle/drizzle.service'
import { AuthorsService } from './authors.service'

describe('AuthorsService', () => {
  let service: AuthorsService

  beforeEach(async () => {
    const mockDrizzleService = {
      db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorsService,
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
      ],
    }).compile()

    service = module.get<AuthorsService>(AuthorsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
