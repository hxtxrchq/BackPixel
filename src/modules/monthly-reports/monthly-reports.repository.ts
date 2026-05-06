import { prisma } from '../../db/prisma.js';
import type { ReportType } from '@prisma/client';

export interface ReportSnapshot {
  totalBilling: number;
  activeClients: number;
  lostClients: number;
  prospects: number;
  retentionRate: number;
  conversionRate: number;
  avgTicket: number;
  totalSales: number;
  totalBrands: number;
  approvedQuotes: number;
  pendingQuotes: number;
  rejectedQuotes: number;
  totalQuotes: number;
  salesByService: [string, number][];
  pipelineByStage: { stage: string; count: number; amount: number }[];
  analysis: string[];
  crmTotal: number;
}

export class MonthlyReportsRepository {
  async save(data: {
    type: ReportType;
    period: string;
    year: number;
    month?: number;
    snapshot: ReportSnapshot;
    meta?: Record<string, unknown>;
    createdById?: string;
  }) {
    return prisma.monthlyReport.create({
      data: {
        type: data.type,
        period: data.period,
        year: data.year,
        month: data.month ?? null,
        snapshot: data.snapshot as object,
        meta: data.meta as object ?? null,
        createdById: data.createdById ?? null,
      },
      include: { createdBy: { select: { fullName: true } } },
    });
  }

  async list(filters?: { type?: ReportType; year?: number }) {
    return prisma.monthlyReport.findMany({
      where: {
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.year ? { year: filters.year } : {}),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: {
        id: true, type: true, period: true, year: true, month: true, createdAt: true,
        createdBy: { select: { fullName: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.monthlyReport.findUnique({
      where: { id },
      include: { createdBy: { select: { fullName: true } } },
    });
  }

  async delete(id: string) {
    return prisma.monthlyReport.delete({ where: { id } });
  }

  /** Check if a report for a specific period already exists */
  async existsForPeriod(year: number, month: number | null, type: ReportType) {
    const count = await prisma.monthlyReport.count({
      where: { year, month: month ?? undefined, type },
    });
    return count > 0;
  }
}
