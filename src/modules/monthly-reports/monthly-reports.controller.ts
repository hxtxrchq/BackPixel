import type { Request, Response } from 'express';
import { MonthlyReportsService } from './monthly-reports.service.js';

const service = new MonthlyReportsService();

export class MonthlyReportsController {
  async list(req: Request, res: Response) {
    try {
      const { type, year } = req.query as { type?: string; year?: string };
      const reports = await service.list({
        type: type as string | undefined,
        year: year ? Number(year) : undefined,
      });
      res.json({ reports });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const report = await service.getById(id);
      res.json({ report });
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  }

  async save(req: Request, res: Response) {
    try {
      const { type, year, month, snapshot, meta } = req.body as {
        type: string;
        year: number;
        month?: number;
        snapshot: object;
        meta?: object;
      };
      if (!year || !snapshot) {
        return res.status(400).json({ message: 'year y snapshot son requeridos' });
      }
      const userId = (req as any).user?.id;
      const report = await service.save({ type, year, month, snapshot, meta, userId });
      res.status(201).json({ report });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await service.delete(id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  }
}
