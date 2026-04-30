import { prisma } from '../src/db/prisma.js';

async function main() {
  const now = new Date();
  const quoteNumber = `Q-EX-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`;

  const payload = {
    quoteNumber,
    clientName: 'ACME S.A.',
    companyName: 'ACME Perú',
    serviceType: 'Branding + Web + Performance',
    serviceDetail: 'Estrategia de branding, diseño de web responsive y campañas de performance',
    contractDurationMonths: 3,
    basePrice: 12000,
    discountApplied: 1000,
    finalPrice: 11000,
    observations: 'Cotización preparada como ejemplo. Incluye 3 meses de trabajo y entregables en fases.',
    status: 'Enviada',
    convertedToActiveClient: false,
    createdById: null,
  };

  try {
    const created = await prisma.quote.create({ data: payload });
    console.log('Cotización creada:', { id: created.id, quoteNumber: created.quoteNumber });
    process.exit(0);
  } catch (error) {
    console.error('Error creando cotización:', error);
    process.exit(1);
  }
}

main();