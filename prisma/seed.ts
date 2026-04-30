import { Role } from '@prisma/client';
import { prisma } from '../src/db/prisma.js';
import { hashPassword } from '../src/lib/password.js';

async function upsertUser(params: {
  email: string;
  fullName: string;
  password: string;
  role: Role;
}) {
  const email = params.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return false;

  const passwordHash = await hashPassword(params.password);
  await prisma.user.create({
    data: {
      fullName: params.fullName,
      email,
      passwordHash,
      role: params.role,
      isActive: true,
    },
  });

  return true;
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Erika';

  const tiEmail = process.env.SEED_TI_EMAIL;
  const tiPassword = process.env.SEED_TI_PASSWORD;
  const tiName = process.env.SEED_TI_NAME ?? 'Equipo TI';

  if (adminEmail && adminPassword) {
    const adminCreated = await upsertUser({
      email: adminEmail,
      fullName: adminName,
      password: adminPassword,
      role: Role.GLOBAL_ADMIN,
    });

    if (adminCreated) {
      console.log(`Administrador creado: ${adminEmail}`);
    } else {
      console.log('Administrador ya existe, no se crea otro.');
    }
  } else {
    console.log('Seed admin omitido: define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para crearlo.');
  }

  if (tiEmail && tiPassword) {
    const tiCreated = await upsertUser({
      email: tiEmail,
      fullName: tiName,
      password: tiPassword,
      role: Role.TI_ADMIN,
    });

    if (tiCreated) {
      console.log(`Usuario TI creado: ${tiEmail}`);
    } else {
      console.log('Usuario TI ya existe, no se crea otro.');
    }
  } else {
    console.log('Seed TI omitido: define SEED_TI_EMAIL y SEED_TI_PASSWORD para crearlo.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
