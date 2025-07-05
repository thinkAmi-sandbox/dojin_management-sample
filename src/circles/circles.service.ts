import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, notInArray } from 'drizzle-orm'
import {
  Author,
  Circle,
  CircleAuthor,
  authors,
  circleAuthors,
  circles,
} from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { AddMemberToCircleDto } from './dto/add-member-to-circle.dto'
import { CreateCircleDto } from './dto/create-circle.dto'
import { UpdateCircleMemberDto } from './dto/update-circle-member.dto'
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

  // メンバー管理機能
  async findAuthor(authorId: number): Promise<Author> {
    const [author] = await this.drizzleService.db
      .select()
      .from(authors)
      .where(eq(authors.id, authorId))
      .limit(1)

    if (!author) {
      throw new NotFoundException(`執筆者ID ${authorId} が見つかりません`)
    }

    return author
  }

  async findCircleMembers(circleId: number): Promise<
    (Author & {
      role: string
      joinedAt: Date
      leftAt: Date | null
      notes: string | null
    })[]
  > {
    // サークルが存在するか確認
    await this.findOne(circleId)

    // サークルに関連付けられたメンバーを取得
    const result = await this.drizzleService.db
      .select({
        id: authors.id,
        name: authors.name,
        email: authors.email,
        bio: authors.bio,
        createdAt: authors.createdAt,
        updatedAt: authors.updatedAt,
        role: circleAuthors.role,
        joinedAt: circleAuthors.joinedAt,
        leftAt: circleAuthors.leftAt,
        notes: circleAuthors.notes,
      })
      .from(circleAuthors)
      .innerJoin(authors, eq(circleAuthors.authorId, authors.id))
      .where(eq(circleAuthors.circleId, circleId))
      .orderBy(circleAuthors.joinedAt)

    return result
  }

  async findAvailableAuthors(circleId: number): Promise<Author[]> {
    // サークルが存在するか確認
    await this.findOne(circleId)

    // 既に関連付けられているメンバーのIDを取得
    const associatedAuthorIds = await this.drizzleService.db
      .select({ authorId: circleAuthors.authorId })
      .from(circleAuthors)
      .where(eq(circleAuthors.circleId, circleId))

    const excludeIds = associatedAuthorIds.map((row) => row.authorId)

    // まだ関連付けられていない執筆者を取得
    if (excludeIds.length === 0) {
      return await this.drizzleService.db
        .select()
        .from(authors)
        .orderBy(authors.name)
    }

    return await this.drizzleService.db
      .select()
      .from(authors)
      .where(notInArray(authors.id, excludeIds))
      .orderBy(authors.name)
  }

  async addMember(
    circleId: number,
    addMemberDto: AddMemberToCircleDto,
  ): Promise<void> {
    // サークルが存在するか確認
    await this.findOne(circleId)

    // 執筆者が存在するか確認
    await this.findAuthor(addMemberDto.authorId)

    // 既に関連付けられているか確認
    const existingMember = await this.drizzleService.db
      .select()
      .from(circleAuthors)
      .where(
        and(
          eq(circleAuthors.circleId, circleId),
          eq(circleAuthors.authorId, addMemberDto.authorId),
        ),
      )
      .limit(1)

    if (existingMember.length > 0) {
      throw new BadRequestException('この執筆者は既にサークルに所属しています')
    }

    // メンバーを追加
    await this.drizzleService.db.insert(circleAuthors).values({
      circleId,
      authorId: addMemberDto.authorId,
      role: addMemberDto.role,
      notes: addMemberDto.notes || null,
    })
  }

  async updateMember(
    circleId: number,
    authorId: number,
    updateMemberDto: UpdateCircleMemberDto,
  ): Promise<void> {
    // サークルが存在するか確認
    await this.findOne(circleId)

    // 執筆者が存在するか確認
    await this.findAuthor(authorId)

    // メンバー関係が存在するか確認
    const existingMember = await this.drizzleService.db
      .select()
      .from(circleAuthors)
      .where(
        and(
          eq(circleAuthors.circleId, circleId),
          eq(circleAuthors.authorId, authorId),
        ),
      )
      .limit(1)

    if (existingMember.length === 0) {
      throw new NotFoundException('このメンバー関係が見つかりません')
    }

    // メンバー情報を更新
    await this.drizzleService.db
      .update(circleAuthors)
      .set({
        role: updateMemberDto.role || existingMember[0].role,
        leftAt: updateMemberDto.leftAt
          ? new Date(updateMemberDto.leftAt)
          : undefined,
        notes:
          updateMemberDto.notes !== undefined
            ? updateMemberDto.notes || null
            : existingMember[0].notes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(circleAuthors.circleId, circleId),
          eq(circleAuthors.authorId, authorId),
        ),
      )
  }

  async removeMember(circleId: number, authorId: number): Promise<void> {
    // サークルが存在するか確認
    await this.findOne(circleId)

    // 執筆者が存在するか確認
    await this.findAuthor(authorId)

    // メンバー関係が存在するか確認
    const existingMember = await this.drizzleService.db
      .select()
      .from(circleAuthors)
      .where(
        and(
          eq(circleAuthors.circleId, circleId),
          eq(circleAuthors.authorId, authorId),
        ),
      )
      .limit(1)

    if (existingMember.length === 0) {
      throw new NotFoundException('このメンバー関係が見つかりません')
    }

    // メンバー関係を削除
    await this.drizzleService.db
      .delete(circleAuthors)
      .where(
        and(
          eq(circleAuthors.circleId, circleId),
          eq(circleAuthors.authorId, authorId),
        ),
      )
  }
}
