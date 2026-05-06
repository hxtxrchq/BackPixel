import type { NextFunction, Request, Response } from 'express';
import { RolesService } from './roles.service.js';
import { HttpError } from '../../lib/http-error.js';

export class RolesController {
  constructor(private readonly rolesService = new RolesService()) {}

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = await this.rolesService.listRoles();
      return res.status(200).json({ roles });
    } catch (error) {
      return next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
      if (!key) throw new HttpError(400, 'Clave de rol inválida');

      const { label, description, color } = req.body ?? {};
      if (typeof label !== 'string') throw new HttpError(400, 'El campo label es requerido');

      const role = await this.rolesService.updateRole(key, { label, description, color });
      return res.status(200).json({ role });
    } catch (error) {
      return next(error);
    }
  };
}
