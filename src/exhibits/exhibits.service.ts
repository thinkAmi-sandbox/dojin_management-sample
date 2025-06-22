import { Injectable, NotFoundException } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import * as schema from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateExhibitDto } from './dto/create-exhibit.dto'
import { UpdateExhibitDto } from './dto/update-exhibit.dto'

@Injectable()
export class ExhibitsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll() {
    return await this.drizzleService.db
      .select({
        id: schema.exhibits.id,
        status: schema.exhibits.status,
        applicationDate: schema.exhibits.applicationDate,
        resultDate: schema.exhibits.resultDate,
        spaceNumber: schema.exhibits.spaceNumber,
        spaceType: schema.exhibits.spaceType,
        applicationNotes: schema.exhibits.applicationNotes,
        resultNotes: schema.exhibits.resultNotes,
        createdAt: schema.exhibits.createdAt,
        updatedAt: schema.exhibits.updatedAt,
        event: {
          id: schema.events.id,
          name: schema.events.name,
          eventDate: schema.events.eventDate,
          venue: schema.events.venue,
        },
        circle: {
          id: schema.circles.id,
          name: schema.circles.name,
          representativeName: schema.circles.representativeName,
          email: schema.circles.email,
        },
      })
      .from(schema.exhibits)
      .innerJoin(schema.events, eq(schema.exhibits.eventId, schema.events.id))
      .innerJoin(
        schema.circles,
        eq(schema.exhibits.circleId, schema.circles.id),
      )
      .orderBy(desc(schema.exhibits.applicationDate))
  }

  async findOne(id: number) {
    const result = await this.drizzleService.db
      .select({
        id: schema.exhibits.id,
        eventId: schema.exhibits.eventId,
        circleId: schema.exhibits.circleId,
        status: schema.exhibits.status,
        applicationDate: schema.exhibits.applicationDate,
        resultDate: schema.exhibits.resultDate,
        spaceNumber: schema.exhibits.spaceNumber,
        spaceType: schema.exhibits.spaceType,
        applicationNotes: schema.exhibits.applicationNotes,
        resultNotes: schema.exhibits.resultNotes,
        createdAt: schema.exhibits.createdAt,
        updatedAt: schema.exhibits.updatedAt,
        event: {
          id: schema.events.id,
          name: schema.events.name,
          eventDate: schema.events.eventDate,
          venue: schema.events.venue,
          applicationStartDate: schema.events.applicationStartDate,
          applicationEndDate: schema.events.applicationEndDate,
          description: schema.events.description,
        },
        circle: {
          id: schema.circles.id,
          name: schema.circles.name,
          representativeName: schema.circles.representativeName,
          email: schema.circles.email,
          description: schema.circles.description,
        },
      })
      .from(schema.exhibits)
      .innerJoin(schema.events, eq(schema.exhibits.eventId, schema.events.id))
      .innerJoin(
        schema.circles,
        eq(schema.exhibits.circleId, schema.circles.id),
      )
      .where(eq(schema.exhibits.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException(`出展申込ID ${id} が見つかりません`)
    }

    return result[0]
  }

  async create(createExhibitDto: CreateExhibitDto) {
    // イベントの存在確認
    const event = await this.drizzleService.db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, createExhibitDto.eventId))
      .limit(1)

    if (event.length === 0) {
      throw new NotFoundException(
        `イベントID ${createExhibitDto.eventId} が見つかりません`,
      )
    }

    // サークルの存在確認
    const circle = await this.drizzleService.db
      .select()
      .from(schema.circles)
      .where(eq(schema.circles.id, createExhibitDto.circleId))
      .limit(1)

    if (circle.length === 0) {
      throw new NotFoundException(
        `サークルID ${createExhibitDto.circleId} が見つかりません`,
      )
    }

    const result = await this.drizzleService.db
      .insert(schema.exhibits)
      .values({
        eventId: createExhibitDto.eventId,
        circleId: createExhibitDto.circleId,
        status:
          (createExhibitDto.status as
            | 'applied'
            | 'accepted'
            | 'rejected'
            | 'cancelled') || 'applied',
        spaceNumber: createExhibitDto.spaceNumber || null,
        spaceType: createExhibitDto.spaceType || null,
        applicationNotes: createExhibitDto.applicationNotes || null,
        resultNotes: createExhibitDto.resultNotes || null,
      })
      .returning()

    return result[0]
  }

  async update(id: number, updateExhibitDto: UpdateExhibitDto) {
    // 存在確認
    await this.findOne(id)

    // イベントIDが変更される場合は存在確認
    if (updateExhibitDto.eventId) {
      const event = await this.drizzleService.db
        .select()
        .from(schema.events)
        .where(eq(schema.events.id, updateExhibitDto.eventId))
        .limit(1)

      if (event.length === 0) {
        throw new NotFoundException(
          `イベントID ${updateExhibitDto.eventId} が見つかりません`,
        )
      }
    }

    // サークルIDが変更される場合は存在確認
    if (updateExhibitDto.circleId) {
      const circle = await this.drizzleService.db
        .select()
        .from(schema.circles)
        .where(eq(schema.circles.id, updateExhibitDto.circleId))
        .limit(1)

      if (circle.length === 0) {
        throw new NotFoundException(
          `サークルID ${updateExhibitDto.circleId} が見つかりません`,
        )
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (updateExhibitDto.eventId !== undefined) {
      updateData.eventId = updateExhibitDto.eventId
    }
    if (updateExhibitDto.circleId !== undefined) {
      updateData.circleId = updateExhibitDto.circleId
    }
    if (updateExhibitDto.status !== undefined) {
      updateData.status = updateExhibitDto.status
    }
    if (updateExhibitDto.spaceNumber !== undefined) {
      updateData.spaceNumber = updateExhibitDto.spaceNumber || null
    }
    if (updateExhibitDto.spaceType !== undefined) {
      updateData.spaceType = updateExhibitDto.spaceType || null
    }
    if (updateExhibitDto.applicationNotes !== undefined) {
      updateData.applicationNotes = updateExhibitDto.applicationNotes || null
    }
    if (updateExhibitDto.resultNotes !== undefined) {
      updateData.resultNotes = updateExhibitDto.resultNotes || null
    }

    const result = await this.drizzleService.db
      .update(schema.exhibits)
      .set(updateData)
      .where(eq(schema.exhibits.id, id))
      .returning()

    return result[0]
  }

  async remove(id: number): Promise<void> {
    // 存在確認
    await this.findOne(id)

    await this.drizzleService.db
      .delete(schema.exhibits)
      .where(eq(schema.exhibits.id, id))
  }
}
