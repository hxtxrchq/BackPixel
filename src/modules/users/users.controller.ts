import type { NextFunction, Request, Response } from 'express';
import { UsersService } from './users.service.js';
import { createUserSchema, updateUserSchema } from './users.validators.js';
import { HttpError } from '../../lib/http-error.js';

export class UsersController {
  constructor(private readonly usersService = new UsersService()) {}

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.usersService.listUsers();
      return res.status(200).json({ users });
    } catch (error) {
      return next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = createUserSchema.parse(req.body);
      const user = await this.usersService.createUser(payload);
      return res.status(201).json({ user });
    } catch (error) {
      return next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = updateUserSchema.parse(req.body);
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      if (!userId) {
        throw new HttpError(400, 'ID de usuario invalido.');
      }

      const user = await this.usersService.updateUser(userId, payload);
      return res.status(200).json({ user });
    } catch (error) {
      return next(error);
    }
  };
}
