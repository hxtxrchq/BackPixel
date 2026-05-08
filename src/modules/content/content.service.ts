import { HttpError } from '../../lib/http-error.js';
import { ContentRepository } from './content.repository.js';

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export class ContentService {
  constructor(private readonly contentRepository = new ContentRepository()) {}

  listAll() {
    return this.contentRepository.listAll();
  }

  async getById(contentId: string) {
    const item = await this.contentRepository.getById(contentId);
    if (!item) {
      throw new HttpError(404, 'Contenido no encontrado');
    }

    return item;
  }

  listPublic() {
    return this.contentRepository.listPublic();
  }

  createContent(params: {
    companyName: string;
    title?: string;
    category: string;
    showOnHome: boolean;
    showOnPortfolio: boolean;
    coverFile?: Express.Multer.File;
    logoFile?: Express.Multer.File;
    galleryFiles: Express.Multer.File[];
    createdById?: string;
  }) {
    const title = params.title?.trim() || params.companyName.trim();
    const slug = `${slugify(params.category)}-${slugify(title)}-${Date.now().toString().slice(-6)}`;

    const coverUrl = params.coverFile ? `/uploads/content/${params.coverFile.filename}` : undefined;
    const logoUrl = params.logoFile ? `/uploads/content/${params.logoFile.filename}` : undefined;

    const gallery = params.galleryFiles.map((file, index) => ({
      url: `/uploads/content/${file.filename}`,
      mimeType: file.mimetype,
      sortOrder: index,
    }));

    return this.contentRepository.createContent({
      companyName: params.companyName.trim(),
      title,
      slug,
      category: params.category.trim(),
      showOnHome: params.showOnHome,
      showOnPortfolio: params.showOnPortfolio,
      coverUrl,
      coverMimeType: params.coverFile?.mimetype,
      logoUrl,
      logoMimeType: params.logoFile?.mimetype,
      gallery,
      createdById: params.createdById,
    });
  }

  async updateContent(contentId: string, data: {
    companyName?: string;
    title?: string;
    category?: string;
    showOnHome?: boolean;
    showOnPortfolio?: boolean;
    coverFile?: Express.Multer.File;
    logoFile?: Express.Multer.File;
    galleryFiles?: Express.Multer.File[];
    removeMediaIds?: string[];
  }) {
    const updateData = {
      companyName: data.companyName?.trim(),
      title: data.title?.trim(),
      category: data.category?.trim(),
      showOnHome: data.showOnHome,
      showOnPortfolio: data.showOnPortfolio,
      coverUrl: data.coverFile ? `/uploads/content/${data.coverFile.filename}` : undefined,
      coverMimeType: data.coverFile?.mimetype,
      logoUrl: data.logoFile ? `/uploads/content/${data.logoFile.filename}` : undefined,
      logoMimeType: data.logoFile?.mimetype,
      gallery: (data.galleryFiles ?? []).map((file, index) => ({
        url: `/uploads/content/${file.filename}`,
        mimeType: file.mimetype,
        sortOrder: index,
      })),
      replaceGallery: Boolean(data.galleryFiles && data.galleryFiles.length > 0),
      removeMediaIds: data.removeMediaIds ?? [],
    };

    try {
      return await this.contentRepository.updateContent(contentId, updateData);
    } catch {
      throw new HttpError(404, 'Contenido no encontrado');
    }
  }

  async deleteContent(contentId: string) {
    try {
      await this.contentRepository.deleteContent(contentId);
    } catch {
      throw new HttpError(404, 'Contenido no encontrado');
    }
  }
}
