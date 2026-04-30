import { HttpError } from '../../lib/http-error.js';
import { QuotesRepository } from './quotes.repository.js';
import { quoteStatuses } from './quotes.validators.js';

const format2 = (value: number) => value.toString().padStart(2, '0');

const generateQuotePrefix = (date = new Date()) => {
  const year = date.getFullYear();
  const month = format2(date.getMonth() + 1);
  return `COT-${year}${month}`;
};

const toQuoteResponse = (quote: {
  id: string;
  quoteNumber: string;
  clientName: string;
  companyName: string;
  serviceType: string;
  serviceDetail: string;
  contractDurationMonths: number;
  basePrice: number;
  discountApplied: number;
  finalPrice: number;
  observations: string | null;
  status: string;
  convertedToActiveClient: boolean;
  convertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: quote.id,
  quoteNumber: quote.quoteNumber,
  client: quote.clientName,
  company: quote.companyName,
  serviceType: quote.serviceType,
  detail: quote.serviceDetail,
  durationMonths: quote.contractDurationMonths,
  duration: `${quote.contractDurationMonths} meses`,
  basePrice: quote.basePrice,
  discount: quote.discountApplied,
  finalPrice: quote.finalPrice,
  observations: quote.observations,
  status: quote.status,
  convertedToActiveClient: quote.convertedToActiveClient,
  convertedAt: quote.convertedAt,
  createdAt: quote.createdAt,
  updatedAt: quote.updatedAt,
});

export class QuotesService {
  constructor(private readonly quotesRepository = new QuotesRepository()) {}

  async listQuotes(filters?: { status?: string; search?: string }) {
    if (filters?.status && !quoteStatuses.includes(filters.status as (typeof quoteStatuses)[number])) {
      throw new HttpError(400, 'Estado de cotizacion invalido.');
    }

    const items = await this.quotesRepository.list(filters);
    return items.map(toQuoteResponse);
  }

  async getById(quoteId: string) {
    const item = await this.quotesRepository.getById(quoteId);
    if (!item) {
      throw new HttpError(404, 'Cotizacion no encontrada');
    }

    return toQuoteResponse(item);
  }

  async createQuote(payload: {
    client: string;
    company: string;
    serviceType: string;
    detail: string;
    durationMonths: number;
    basePrice: number;
    discount: number;
    observations?: string | null;
    createdById?: string;
  }) {
    const basePrice = Number(payload.basePrice) || 0;
    const discountApplied = Number(payload.discount) || 0;
    const finalPrice = Math.max(basePrice - discountApplied, 0);

    const prefix = generateQuotePrefix();
    const lastQuote = await this.quotesRepository.findLastByPrefix(prefix);
    const lastSequence = lastQuote?.quoteNumber ? Number(lastQuote.quoteNumber.slice(-4)) || 0 : 0;
    const quoteNumber = `${prefix}-${(lastSequence + 1).toString().padStart(4, '0')}`;

    const created = await this.quotesRepository.create({
      quoteNumber,
      clientName: payload.client.trim(),
      companyName: payload.company.trim(),
      serviceType: payload.serviceType.trim(),
      serviceDetail: payload.detail.trim(),
      contractDurationMonths: payload.durationMonths,
      basePrice,
      discountApplied,
      finalPrice,
      observations: payload.observations?.trim() || undefined,
      createdById: payload.createdById,
    });

    return toQuoteResponse(created);
  }

  async updateStatus(quoteId: string, status: string) {
    if (!quoteStatuses.includes(status as (typeof quoteStatuses)[number])) {
      throw new HttpError(400, 'Estado de cotizacion invalido.');
    }

    try {
      const updated = await this.quotesRepository.updateStatus(quoteId, status);
      return toQuoteResponse(updated);
    } catch {
      throw new HttpError(404, 'Cotizacion no encontrada');
    }
  }

  async deleteQuote(quoteId: string) {
    try {
      const removed = await this.quotesRepository.remove(quoteId);
      return toQuoteResponse(removed);
    } catch {
      throw new HttpError(404, 'Cotizacion no encontrada');
    }
  }
}
