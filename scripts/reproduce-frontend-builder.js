import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function main() {
  const items = await prisma.content.findMany({
    where: { showOnPortfolio: true },
    include: { medias: true }
  });

  const categoriesMap = new Map();

  for (const item of items) {
    const categoryName = item.category || 'General';
    const categoryId = slugify(categoryName);
    const title = item.title || item.companyName || 'Proyecto';
    const slug = item.slug || `${categoryId}-${slugify(title)}`;

    if (!categoriesMap.has(categoryId)) {
      categoriesMap.set(categoryId, {
        id: categoryId,
        name: categoryName,
        projects: [],
      });
    }

    categoriesMap.get(categoryId).projects.push({
      slug,
      title,
      categoryId,
      categoryName,
    });
  }

  console.log('--- REPRODUCED FRONTEND PORTFOLIO INDEX ---');
  for (const [catId, cat] of categoriesMap.entries()) {
    console.log(`Category: ${catId} (${cat.name})`);
    for (const p of cat.projects) {
      console.log(`  - Project Slug: ${p.slug} | Title: ${p.title} | Cat: ${p.categoryId}`);
    }
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
