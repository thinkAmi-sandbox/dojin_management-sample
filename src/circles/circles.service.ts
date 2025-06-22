import { Injectable, NotFoundException } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { Circle, circles } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateCircleDto } from './dto/create-circle.dto'
import { UpdateCircleDto } from './dto/update-circle.dto'

@Injectable()
export class CirclesService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(): Promise<Circle[]> {
    return await this.drizzleService.db
      .select()
      .from(circles)
      .orderBy(desc(circles.createdAt))
  }

  async findOne(id: number): Promise<Circle> {
    const result = await this.drizzleService.db
      .select()
      .from(circles)
      .where(eq(circles.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException(`サークルID ${id} が見つかりません`)
    }

    return result[0]
  }

  async create(createCircleDto: CreateCircleDto): Promise<Circle> {
    const result = await this.drizzleService.db
      .insert(circles)
      .values({
        name: createCircleDto.name,
        representativeName: createCircleDto.representativeName,
        email: createCircleDto.email,
        description: createCircleDto.description || null,
      })
      .returning()

    return result[0]
  }

  async update(id: number, updateCircleDto: UpdateCircleDto): Promise<Circle> {
    // 存在確認
    await this.findOne(id)

    const result = await this.drizzleService.db
      .update(circles)
      .set({
        name: updateCircleDto.name,
        representativeName: updateCircleDto.representativeName,
        email: updateCircleDto.email,
        description:
          updateCircleDto.description === undefined
            ? null
            : updateCircleDto.description || null,
        updatedAt: new Date(),
      })
      .where(eq(circles.id, id))
      .returning()

    return result[0]
  }

  async remove(id: number): Promise<void> {
    // 存在確認
    await this.findOne(id)

    await this.drizzleService.db.delete(circles).where(eq(circles.id, id))
  }
}
