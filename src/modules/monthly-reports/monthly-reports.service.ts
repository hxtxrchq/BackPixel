import { MonthlyReportsRepository } from './monthly-reports.repository.js';
import type { ReportType } from '@prisma/client';

const repo = new MonthlyReportsRepository();

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export class MonthlyReportsService {
  async save(data: {
    type: string;
    year: number;
    month?: number;
    snapshot: object;
    meta?: object;
    userId?: string;
  }) {
    const reportType = (data.type === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY') as ReportType;
    const period = reportType === 'ANNUAL'
      ? String(data.year)
      : `${MONTH_NAMES[(data.month ?? 1) - 1]} ${data.year}`;

    return repo.save({
      type: reportType,
      period,
      year: data.year,
      month: reportType === 'ANNUAL' ? undefined : data.month,
      snapshot: data.snapshot as any,
      meta: data.meta as any,
      createdById: data.userId,
    });
  }

  async list(filters?: { type?: string; year?: number }) {
    return repo.list({
      type: filters?.type as ReportType | undefined,
      year: filters?.year,
    });
  }

  async getById(id: string) {
    const report = await repo.findById(id);
    if (!report) throw new Error('Reporte no encontrado');
    return report;
  }

  async delete(id: string) {
    await repo.findById(id).then((r) => { if (!r) throw new Error('Reporte no encontrado'); });
    return repo.delete(id);
  }

  async existsForPeriod(year: number, month: number | null, type: string) {
    return repo.existsForPeriod(year, month, (type === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY') as ReportType);
  }
}
