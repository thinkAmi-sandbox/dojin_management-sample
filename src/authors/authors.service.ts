import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import * as schema from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateAuthorDto } from './dto/create-author.dto'
import { UpdateAuthorDto } from './dto/update-author.dto'

@Injectable()
export class AuthorsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll() {
    return await this.drizzleService.db.select().from(schema.authors)
  }

  async findOne(id: number) {
    const authors = await this.drizzleService.db
      .select()
      .from(schema.authors)
      .where(eq(schema.authors.id, id))

    if (authors.length === 0) {
      throw new NotFoundException(`ID ${id} の執筆者が見つかりません`)
    }

    return authors[0]
  }

  async create(createAuthorDto: CreateAuthorDto) {
    const { name, email, bio } = createAuthorDto

    const insertData: schema.NewAuthor = {
      name,
      email: email && email.trim() !== '' ? email : null,
      bio: bio && bio.trim() !== '' ? bio : null,
    }

    try {
      const [author] = await this.drizzleService.db
        .insert(schema.authors)
        .values(insertData)
        .returning()

      return author
    } catch (error) {
      // PostgreSQLのユニーク制約違反エラーをそのまま投げる
      throw error
    }
  }

  async update(id: number, updateAuthorDto: UpdateAuthorDto) {
    const existingAuthor = await this.findOne(id)

    const { name, email, bio } = updateAuthorDto

    const updateData: Partial<schema.NewAuthor> = {
      name: name || existingAuthor.name,
      email: email && email.trim() !== '' ? email : null,
      bio: bio && bio.trim() !== '' ? bio : null,
    }

    try {
      const [updatedAuthor] = await this.drizzleService.db
        .update(schema.authors)
        .set(updateData)
        .where(eq(schema.authors.id, id))
        .returning()

      return updatedAuthor
    } catch (error) {
      // PostgreSQLのユニーク制約違反エラーをそのまま投げる
      throw error
    }
  }

  async remove(id: number) {
    await this.findOne(id)

    await this.drizzleService.db
      .delete(schema.authors)
      .where(eq(schema.authors.id, id))
  }
}
