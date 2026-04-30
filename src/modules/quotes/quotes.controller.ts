import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../lib/http-error.js';
import { QuotesService } from './quotes.service.js';
import { createQuoteSchema, updateQuoteStatusSchema } from './quotes.validators.js';

export class QuotesController {
  constructor(private readonly quotesService = new QuotesService()) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;
      const search = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search;

      const items = await this.quotesService.listQuotes({
        status: typeof status === 'string' ? status : undefined,
        search: typeof search === 'string' ? search : undefined,
      });

      return res.status(200).json({ items });
    } catch (error) {
      return next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quoteId = Array.isArray(req.params.quoteId) ? req.params.quoteId[0] : req.params.quoteId;
      if (!quoteId) {
        throw new HttpError(400, 'ID de cotizacion invalido.');
      }

      const item = await this.quotesService.getById(quoteId);
      return res.status(200).json({ item });
    } catch (error) {
      return next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = createQuoteSchema.parse(req.body);
      const item = await this.quotesService.createQuote({
        ...payload,
        createdById: req.auth?.userId,
      });

      return res.status(201).json({ item });
    } catch (error) {
      return next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quoteId = Array.isArray(req.params.quoteId) ? req.params.quoteId[0] : req.params.quoteId;
      if (!quoteId) {
        throw new HttpError(400, 'ID de cotizacion invalido.');
      }

      const payload = updateQuoteStatusSchema.parse(req.body);
      const item = await this.quotesService.updateStatus(quoteId, payload.status);

      return res.status(200).json({ item });
    } catch (error) {
      return next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quoteId = Array.isArray(req.params.quoteId) ? req.params.quoteId[0] : req.params.quoteId;
      if (!quoteId) {
        throw new HttpError(400, 'ID de cotizacion invalido.');
      }

      await this.quotesService.deleteQuote(quoteId);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
