import type { NextFunction, Request, Response } from 'express';
import { UsersService } from './users.service.js';
import { createUserSchema, monthSchema, updateUserSchema } from './users.validators.js';
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
      const result = await this.usersService.createUser(payload);
      return res.status(201).json({ user: result.user, tempPassword: result.tempPassword });
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

  getSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      if (!userId) {
        throw new HttpError(400, 'ID de usuario invalido.');
      }

      const month = monthSchema.parse(req.query.month);
      const schedule = await this.usersService.getUserSchedule(userId, month);
      return res.status(200).json({ schedule });
    } catch (error) {
      return next(error);
    }
  };

  setSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      if (!userId) {
        throw new HttpError(400, 'ID de usuario invalido.');
      }

      const month = monthSchema.parse(req.query.month);
      const text = typeof req.body?.text === 'string' ? req.body.text : '';
      const schedule = await this.usersService.setUserSchedule(userId, month, text);
      return res.status(200).json({ schedule });
    } catch (error) {
      return next(error);
    }
  };
}
