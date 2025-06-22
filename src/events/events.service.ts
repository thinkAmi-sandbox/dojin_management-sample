import { Injectable, NotFoundException } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { events, Event } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'

@Injectable()
export class EventsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(): Promise<Event[]> {
    return await this.drizzleService.db
      .select()
      .from(events)
      .orderBy(desc(events.eventDate))
  }

  async findOne(id: number): Promise<Event> {
    const result = await this.drizzleService.db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException(`イベントID ${id} が見つかりません`)
    }

    return result[0]
  }

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const result = await this.drizzleService.db
      .insert(events)
      .values({
        name: createEventDto.name,
        eventDate: createEventDto.eventDate,
        venue: createEventDto.venue,
        applicationStartDate: createEventDto.applicationStartDate,
        applicationEndDate: createEventDto.applicationEndDate,
        description: createEventDto.description || null,
      })
      .returning()

    return result[0]
  }

  async update(id: number, updateEventDto: UpdateEventDto): Promise<Event> {
    // 存在確認
    await this.findOne(id)

    const result = await this.drizzleService.db
      .update(events)
      .set({
        name: updateEventDto.name,
        eventDate: updateEventDto.eventDate,
        venue: updateEventDto.venue,
        applicationStartDate: updateEventDto.applicationStartDate,
        applicationEndDate: updateEventDto.applicationEndDate,
        description:
          updateEventDto.description === undefined
            ? null
            : updateEventDto.description || null,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning()

    return result[0]
  }

  async remove(id: number): Promise<void> {
    // 存在確認
    await this.findOne(id)

    await this.drizzleService.db.delete(events).where(eq(events.id, id))
  }
}
