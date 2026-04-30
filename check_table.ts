import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.$queryRawUnsafe('SELECT to_regclass(\'public."Quote"\')::text as table_name');
  console.log(JSON.stringify(rows));
}
main().finally(() => prisma.$disconnect());
