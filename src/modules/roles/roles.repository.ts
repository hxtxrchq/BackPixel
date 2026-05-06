import { prisma } from '../../db/prisma.js';

const DEFAULT_ROLES = [
  { key: 'GLOBAL_ADMIN', label: 'Administrador global', description: 'Acceso completo al sistema', color: '#e73c50' },
  { key: 'TI_ADMIN', label: 'TI', description: 'Administrador de tecnología', color: '#6c84ff' },
  { key: 'STAFF', label: 'Staff', description: 'Usuario estándar del equipo', color: '#35c98f' },
];

export class RolesRepository {
  async listRoles() {
    const stored = await prisma.roleConfig.findMany({ orderBy: { key: 'asc' } });

    // Merge defaults with stored, always returning all 3 enum roles
    return DEFAULT_ROLES.map((def) => {
      const found = stored.find((r) => r.key === def.key);
      return found ?? def;
    });
  }

  async upsertRole(key: string, data: { label: string; description?: string; color?: string }) {
    return prisma.roleConfig.upsert({
      where: { key },
      create: { key, label: data.label, description: data.description, color: data.color },
      update: { label: data.label, description: data.description, color: data.color },
    });
  }

  async findByKey(key: string) {
    return prisma.roleConfig.findUnique({ where: { key } });
  }
}
