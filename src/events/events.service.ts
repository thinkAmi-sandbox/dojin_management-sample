import { Injectable, NotFoundException } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import * as schema from '../db/schema'
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

  // Phase 3-3 版対応: イベント版情報取得メソッド
  async findEventWithEditions(eventId: number) {
    // イベント存在確認
    await this.findOne(eventId)

    // 5テーブル結合: Event → Exhibit → ExhibitBook → Edition → Book
    const result = await this.drizzleService.db
      .select({
        // Event情報
        eventId: schema.events.id,
        eventName: schema.events.name,
        eventDate: schema.events.eventDate,
        venue: schema.events.venue,
        // Exhibit情報
        exhibitId: schema.exhibits.id,
        spaceNumber: schema.exhibits.spaceNumber,
        spaceType: schema.exhibits.spaceType,
        // Circle情報
        circleId: schema.circles.id,
        circleName: schema.circles.name,
        representativeName: schema.circles.representativeName,
        // ExhibitBook情報
        plannedQuantity: schema.exhibitBooks.plannedQuantity,
        actualQuantity: schema.exhibitBooks.actualQuantity,
        soldQuantity: schema.exhibitBooks.soldQuantity,
        remainingQuantity: schema.exhibitBooks.remainingQuantity,
        price: schema.exhibitBooks.price,
        // Edition情報
        editionId: schema.editions.id,
        versionName: schema.editions.versionName,
        versionNumber: schema.editions.versionNumber,
        basePrice: schema.editions.basePrice,
        pageCount: schema.editions.pageCount,
        // Book情報
        bookId: schema.books.id,
        bookTitle: schema.books.title,
        bookSubtitle: schema.books.subtitle,
        bookDescription: schema.books.description,
        bookStatus: schema.books.status,
      })
      .from(schema.events)
      .innerJoin(schema.exhibits, eq(schema.events.id, schema.exhibits.eventId))
      .innerJoin(
        schema.circles,
        eq(schema.exhibits.circleId, schema.circles.id),
      )
      .innerJoin(
        schema.exhibitBooks,
        eq(schema.exhibits.id, schema.exhibitBooks.exhibitId),
      )
      .innerJoin(
        schema.editions,
        eq(schema.exhibitBooks.editionId, schema.editions.id),
      )
      .innerJoin(schema.books, eq(schema.editions.bookId, schema.books.id))
      .where(eq(schema.events.id, eventId))
      .orderBy(schema.exhibitBooks.displayOrder, schema.books.title)

    return result
  }

  // Phase 3-3 版対応: イベント版別統計情報取得
  async getEventEditionStats(eventId: number) {
    const editionData = await this.findEventWithEditions(eventId)

    if (editionData.length === 0) {
      return {
        totalEditions: 0,
        totalPlannedQuantity: 0,
        totalActualQuantity: 0,
        totalSoldQuantity: 0,
        totalSalesAmount: 0,
        totalRemainingQuantity: 0,
      }
    }

    const stats = editionData.reduce(
      (acc, item) => {
        acc.totalPlannedQuantity += item.plannedQuantity || 0
        acc.totalActualQuantity += item.actualQuantity || 0
        acc.totalSoldQuantity += item.soldQuantity || 0
        acc.totalRemainingQuantity += item.remainingQuantity || 0
        acc.totalSalesAmount += (item.soldQuantity || 0) * (item.price || 0)
        return acc
      },
      {
        totalEditions: editionData.length,
        totalPlannedQuantity: 0,
        totalActualQuantity: 0,
        totalSoldQuantity: 0,
        totalSalesAmount: 0,
        totalRemainingQuantity: 0,
      },
    )

    return stats
  }
}
