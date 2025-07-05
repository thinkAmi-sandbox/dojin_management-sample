import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateConsignmentDto, UpdateConsignmentDto } from './dto'

@Injectable()
export class ConsignmentsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async create(
    createConsignmentDto: CreateConsignmentDto,
  ): Promise<schema.Consignment> {
    // 保管場所が委託可能かチェック
    const location = await this.drizzleService.db
      .select()
      .from(schema.storageLocations)
      .where(eq(schema.storageLocations.id, createConsignmentDto.locationId))
      .limit(1)

    if (location.length === 0) {
      throw new NotFoundException('指定された保管場所が見つかりません')
    }

    if (!location[0].isConsignment || location[0].type !== 'consignment') {
      throw new BadRequestException('委託先として使用できない保管場所です')
    }

    const [consignment] = await this.drizzleService.db
      .insert(schema.consignments)
      .values({
        locationId: createConsignmentDto.locationId,
        storeName: createConsignmentDto.storeName,
        commissionRate: createConsignmentDto.commissionRate,
        settlementCycle: createConsignmentDto.settlementCycle,
        contractStartDate: new Date(createConsignmentDto.contractStartDate),
        contractEndDate: createConsignmentDto.contractEndDate
          ? new Date(createConsignmentDto.contractEndDate)
          : null,
        contactPerson: createConsignmentDto.contactPerson,
        contactEmail: createConsignmentDto.contactEmail,
        contactPhone: createConsignmentDto.contactPhone,
        paymentInfo: createConsignmentDto.paymentInfo,
        contractTerms: createConsignmentDto.contractTerms,
        notes: createConsignmentDto.notes,
      })
      .returning()

    return consignment
  }

  async findAll(): Promise<ConsignmentWithLocation[]> {
    return await this.drizzleService.db
      .select({
        id: schema.consignments.id,
        storeName: schema.consignments.storeName,
        commissionRate: schema.consignments.commissionRate,
        settlementCycle: schema.consignments.settlementCycle,
        contractStartDate: schema.consignments.contractStartDate,
        contractEndDate: schema.consignments.contractEndDate,
        contactPerson: schema.consignments.contactPerson,
        isActive: schema.consignments.isActive,
        locationName: schema.storageLocations.name,
        locationAddress: schema.storageLocations.address,
        createdAt: schema.consignments.createdAt,
      })
      .from(schema.consignments)
      .innerJoin(
        schema.storageLocations,
        eq(schema.consignments.locationId, schema.storageLocations.id),
      )
      .orderBy(desc(schema.consignments.createdAt))
  }

  async findOne(id: number): Promise<ConsignmentDetail> {
    const result = await this.drizzleService.db
      .select({
        id: schema.consignments.id,
        locationId: schema.consignments.locationId,
        storeName: schema.consignments.storeName,
        commissionRate: schema.consignments.commissionRate,
        settlementCycle: schema.consignments.settlementCycle,
        contractStartDate: schema.consignments.contractStartDate,
        contractEndDate: schema.consignments.contractEndDate,
        contactPerson: schema.consignments.contactPerson,
        contactEmail: schema.consignments.contactEmail,
        contactPhone: schema.consignments.contactPhone,
        paymentInfo: schema.consignments.paymentInfo,
        contractTerms: schema.consignments.contractTerms,
        notes: schema.consignments.notes,
        isActive: schema.consignments.isActive,
        locationName: schema.storageLocations.name,
        locationAddress: schema.storageLocations.address,
        createdAt: schema.consignments.createdAt,
        updatedAt: schema.consignments.updatedAt,
      })
      .from(schema.consignments)
      .innerJoin(
        schema.storageLocations,
        eq(schema.consignments.locationId, schema.storageLocations.id),
      )
      .where(eq(schema.consignments.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException('委託契約が見つかりません')
    }

    // 委託先の在庫状況も取得
    const stockStatus = await this.getConsignmentStockStatus(
      result[0].locationId,
    )

    return {
      ...result[0],
      stockStatus,
    }
  }

  async update(
    id: number,
    updateConsignmentDto: UpdateConsignmentDto,
  ): Promise<schema.Consignment> {
    // 存在確認
    await this.findOne(id)

    const [updatedConsignment] = await this.drizzleService.db
      .update(schema.consignments)
      .set({
        storeName: updateConsignmentDto.storeName,
        commissionRate: updateConsignmentDto.commissionRate,
        settlementCycle: updateConsignmentDto.settlementCycle,
        contractEndDate: updateConsignmentDto.contractEndDate
          ? new Date(updateConsignmentDto.contractEndDate)
          : null,
        contactPerson: updateConsignmentDto.contactPerson,
        contactEmail: updateConsignmentDto.contactEmail,
        contactPhone: updateConsignmentDto.contactPhone,
        paymentInfo: updateConsignmentDto.paymentInfo,
        contractTerms: updateConsignmentDto.contractTerms,
        notes: updateConsignmentDto.notes,
        isActive: updateConsignmentDto.isActive,
        updatedAt: new Date(),
      })
      .where(eq(schema.consignments.id, id))
      .returning()

    return updatedConsignment
  }

  async remove(id: number): Promise<void> {
    // 存在確認
    const consignment = await this.findOne(id)

    // 未精算の販売報告がないかチェック（将来実装予定）
    // const unsettledSales = await this.checkUnsettledSales(id)
    // if (unsettledSales > 0) {
    //   throw new BadRequestException('未精算の販売報告があるため削除できません')
    // }

    // 委託先在庫がないかチェック
    const stockCount = await this.checkConsignmentStock(consignment.locationId)
    if (stockCount > 0) {
      throw new BadRequestException('委託先に在庫があるため削除できません')
    }

    await this.drizzleService.db
      .delete(schema.consignments)
      .where(eq(schema.consignments.id, id))
  }

  private async getConsignmentStockStatus(
    locationId: number,
  ): Promise<ConsignmentStockStatus> {
    const stockData = await this.drizzleService.db
      .select({
        totalBooks: sql<number>`COUNT(DISTINCT ${schema.stocks.editionId})`,
        totalQuantity: sql<number>`COALESCE(SUM(${schema.stocks.quantity}), 0)`,
        totalValue: sql<number>`COALESCE(SUM(${schema.stocks.quantity} * ${schema.editions.basePrice}), 0)`,
      })
      .from(schema.stocks)
      .innerJoin(
        schema.editions,
        eq(schema.stocks.editionId, schema.editions.id),
      )
      .where(eq(schema.stocks.locationId, locationId))

    return stockData[0] || { totalBooks: 0, totalQuantity: 0, totalValue: 0 }
  }

  private async checkConsignmentStock(locationId: number): Promise<number> {
    const result = await this.drizzleService.db
      .select({
        count: sql<number>`COALESCE(SUM(${schema.stocks.quantity}), 0)`,
      })
      .from(schema.stocks)
      .where(eq(schema.stocks.locationId, locationId))

    return result[0].count || 0
  }
}

// 型定義
export type ConsignmentWithLocation = {
  id: number
  storeName: string
  commissionRate: number
  settlementCycle: string | null
  contractStartDate: Date
  contractEndDate: Date | null
  contactPerson: string | null
  isActive: boolean
  locationName: string
  locationAddress: string | null
  createdAt: Date
}

export type ConsignmentDetail = ConsignmentWithLocation & {
  locationId: number
  contactEmail: string | null
  contactPhone: string | null
  paymentInfo: string | null
  contractTerms: string | null
  notes: string | null
  updatedAt: Date
  stockStatus: ConsignmentStockStatus
}

export type ConsignmentStockStatus = {
  totalBooks: number
  totalQuantity: number
  totalValue: number
}
