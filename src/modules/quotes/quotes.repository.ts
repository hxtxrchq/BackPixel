import { prisma } from '../../db/prisma.js';

const quoteSelect = {
  id: true,
  quoteNumber: true,
  clientName: true,
  companyName: true,
  serviceType: true,
  serviceDetail: true,
  contractDurationMonths: true,
  basePrice: true,
  discountApplied: true,
  finalPrice: true,
  observations: true,
  status: true,
  convertedToActiveClient: true,
  convertedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class QuotesRepository {
  list(params?: { status?: string; search?: string }) {
    const needle = params?.search?.trim();

    return prisma.quote.findMany({
      where: {
        ...(params?.status ? { status: params.status } : {}),
        ...(needle
          ? {
              OR: [
                { clientName: { contains: needle, mode: 'insensitive' } },
                { companyName: { contains: needle, mode: 'insensitive' } },
                { serviceType: { contains: needle, mode: 'insensitive' } },
                { serviceDetail: { contains: needle, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: quoteSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  getById(quoteId: string) {
    return prisma.quote.findUnique({
      where: { id: quoteId },
      select: quoteSelect,
    });
  }

  findLastByPrefix(prefix: string) {
    return prisma.quote.findFirst({
      where: {
        quoteNumber: {
          startsWith: prefix,
        },
      },
      orderBy: { quoteNumber: 'desc' },
      select: {
        quoteNumber: true,
      },
    });
  }

  create(data: {
    quoteNumber: string;
    clientName: string;
    companyName: string;
    serviceType: string;
    serviceDetail: string;
    contractDurationMonths: number;
    basePrice: number;
    discountApplied: number;
    finalPrice: number;
    observations?: string;
    createdById?: string;
  }) {
    return prisma.quote.create({
      data: {
        quoteNumber: data.quoteNumber,
        clientName: data.clientName,
        companyName: data.companyName,
        serviceType: data.serviceType,
        serviceDetail: data.serviceDetail,
        contractDurationMonths: data.contractDurationMonths,
        basePrice: data.basePrice,
        discountApplied: data.discountApplied,
        finalPrice: data.finalPrice,
        observations: data.observations,
        createdById: data.createdById,
      },
      select: quoteSelect,
    });
  }

  updateStatus(quoteId: string, status: string) {
    return prisma.quote.update({
      where: { id: quoteId },
      data: {
        status,
        ...(status === 'Aprobada'
          ? {
              convertedToActiveClient: true,
              convertedAt: new Date(),
            }
          : {}),
      },
      select: quoteSelect,
    });
  }

  remove(quoteId: string) {
    return prisma.quote.delete({
      where: { id: quoteId },
      select: quoteSelect,
    });
  }
}
