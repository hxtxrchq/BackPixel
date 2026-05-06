import { HttpError } from '../../lib/http-error.js';
import { RolesRepository } from './roles.repository.js';

const ALLOWED_KEYS = ['GLOBAL_ADMIN', 'TI_ADMIN', 'STAFF'];

export class RolesService {
  constructor(private readonly rolesRepository = new RolesRepository()) {}

  listRoles() {
    return this.rolesRepository.listRoles();
  }

  async updateRole(key: string, payload: { label: string; description?: string; color?: string }) {
    if (!ALLOWED_KEYS.includes(key)) {
      throw new HttpError(400, `Rol inválido. Los roles permitidos son: ${ALLOWED_KEYS.join(', ')}`);
    }

    const label = payload.label?.trim();
    if (!label || label.length < 2 || label.length > 80) {
      throw new HttpError(400, 'El nombre del rol debe tener entre 2 y 80 caracteres');
    }

    const description = payload.description?.trim() || undefined;
    const color = payload.color?.trim() || undefined;

    return this.rolesRepository.upsertRole(key, { label, description, color });
  }
}
