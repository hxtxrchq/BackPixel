import type { NextFunction, Request, Response } from 'express';
import { ContentService } from './content.service.js';
import { createContentSchema, updateContentSchema } from './content.validators.js';
import { HttpError } from '../../lib/http-error.js';

export class ContentController {
  constructor(private readonly contentService = new ContentService()) {}

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await this.contentService.listAll();
      return res.status(200).json({ items });
    } catch (error) {
      return next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contentId = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
      if (!contentId) {
        throw new HttpError(400, 'ID de contenido invalido.');
      }

      const item = await this.contentService.getById(contentId);
      return res.status(200).json({ item });
    } catch (error) {
      return next(error);
    }
  };

  listPublic = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await this.contentService.listPublic();
      return res.status(200).json({ items });
    } catch (error) {
      return next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = createContentSchema.parse(req.body);
      const files = req.files as { cover?: Express.Multer.File[]; gallery?: Express.Multer.File[] } | undefined;
      const coverFile = files?.cover?.[0];
      const galleryFiles = files?.gallery ?? [];

      const item = await this.contentService.createContent({
        ...payload,
        coverFile,
        galleryFiles,
        createdById: req.auth?.userId,
      });

      return res.status(201).json({ item });
    } catch (error) {
      return next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = updateContentSchema.parse(req.body);
      const files = req.files as { cover?: Express.Multer.File[]; gallery?: Express.Multer.File[] } | undefined;
      const coverFile = files?.cover?.[0];
      const galleryFiles = files?.gallery ?? [];
      const removeMediaIds = payload.removeMediaIds ?? [];

      if (Object.keys(payload).length === 0 && !coverFile && galleryFiles.length === 0 && removeMediaIds.length === 0) {
        throw new HttpError(400, 'Debes enviar al menos un cambio para actualizar.');
      }

      const contentId = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
      if (!contentId) {
        throw new HttpError(400, 'ID de contenido invalido.');
      }

      const item = await this.contentService.updateContent(contentId, {
        ...payload,
        coverFile,
        galleryFiles,
        removeMediaIds,
      });
      return res.status(200).json({ item });
    } catch (error) {
      return next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contentId = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
      if (!contentId) {
        throw new HttpError(400, 'ID de contenido invalido.');
      }

      await this.contentService.deleteContent(contentId);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
