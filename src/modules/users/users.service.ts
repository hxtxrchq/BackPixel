import { Role } from '@prisma/client';
import { HttpError } from '../../lib/http-error.js';
import { hashPassword } from '../../lib/password.js';
import { UsersRepository } from './users.repository.js';

export class UsersService {
  constructor(private readonly usersRepository = new UsersRepository()) {}

  listUsers() {
    return this.usersRepository.listUsers();
  }

  async createUser(payload: { fullName: string; email: string; password: string; role: Role }) {
    const existing = await this.usersRepository.findByEmail(payload.email);
    if (existing) {
      throw new HttpError(409, 'El correo ya esta registrado');
    }

    const passwordHash = await hashPassword(payload.password);
    return this.usersRepository.createUser({
      fullName: payload.fullName,
      email: payload.email,
      passwordHash,
      role: payload.role,
    });
  }

  async updateUser(userId: string, payload: { fullName?: string; role?: Role; isActive?: boolean }) {
    try {
      return await this.usersRepository.updateUser(userId, payload);
    } catch {
      throw new HttpError(404, 'Usuario no encontrado');
    }
  }
}
