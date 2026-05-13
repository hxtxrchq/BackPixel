import { HttpError } from '../../lib/http-error.js';
import { ContentRepository } from './content.repository.js';
import { isCloudinaryEnabled, uploadBufferToCloudinary } from '../../lib/cloudinary.js';

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export class ContentService {
  constructor(private readonly contentRepository = new ContentRepository()) {}

  private async resolveOptionalFileUrl(file?: Express.Multer.File) {
    if (!file) return undefined;

    return this.resolveRequiredFileUrl(file);
  }

  private async resolveRequiredFileUrl(file: Express.Multer.File): Promise<string> {

    // When enabled, store media in Cloudinary to survive serverless deployments.
    if (isCloudinaryEnabled && (file as any).buffer) {
      return uploadBufferToCloudinary({
        buffer: (file as any).buffer,
        originalName: file.originalname,
        folder: 'pixelbros/content',
        resourceType: 'auto',
      });
    }

    // Fallback: local uploads directory.
    return `/uploads/content/${file.filename}`;
  }

  private resolveLocalGallery(file: Express.Multer.File) {
    return {
      url: `/uploads/content/${file.filename}`,
      mimeType: file.mimetype,
    };
  }

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

  async createContent(params: {
    companyName: string;
    title?: string;
    category: string;
    showOnHome: boolean;
    showOnPortfolio: boolean;
    logoLabel?: string;
    coverFile?: Express.Multer.File;
    logoFile?: Express.Multer.File;
    galleryFiles: Express.Multer.File[];
    createdById?: string;
  }) {
    const title = params.title?.trim() || params.companyName.trim();
    const slug = `${slugify(params.category)}-${slugify(title)}-${Date.now().toString().slice(-6)}`;

    const coverUrl = await this.resolveOptionalFileUrl(params.coverFile);
    const logoUrl = await this.resolveOptionalFileUrl(params.logoFile);

    const gallery = isCloudinaryEnabled
      ? await Promise.all(
          params.galleryFiles.map(async (file, index) => ({
            url: await this.resolveRequiredFileUrl(file),
            mimeType: file.mimetype,
            sortOrder: index,
          })),
        )
      : params.galleryFiles.map((file, index) => {
          const local = this.resolveLocalGallery(file);
          return {
            url: local.url,
            mimeType: local.mimeType,
            sortOrder: index,
          };
        });

    return this.contentRepository.createContent({
      companyName: params.companyName.trim(),
      title,
      slug,
      category: params.category.trim(),
      showOnHome: params.showOnHome,
      showOnPortfolio: params.showOnPortfolio,
      logoLabel: params.logoLabel?.trim(),
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
    logoLabel?: string | null;
    coverFile?: Express.Multer.File;
    logoFile?: Express.Multer.File;
    removeCover?: boolean;
    removeLogo?: boolean;
    galleryFiles?: Express.Multer.File[];
    removeMediaIds?: string[];
  }) {
    const coverUrl = data.coverFile
      ? await this.resolveRequiredFileUrl(data.coverFile)
      : data.removeCover
        ? null
        : undefined;
    const coverMimeType = data.coverFile ? data.coverFile.mimetype : data.removeCover ? null : undefined;

    const logoUrl = data.logoFile
      ? await this.resolveRequiredFileUrl(data.logoFile)
      : data.removeLogo
        ? null
        : undefined;
    const logoMimeType = data.logoFile ? data.logoFile.mimetype : data.removeLogo ? null : undefined;

    const updateData = {
      companyName: data.companyName?.trim(),
      title: data.title?.trim(),
      category: data.category?.trim(),
      showOnHome: data.showOnHome,
      showOnPortfolio: data.showOnPortfolio,
      logoLabel: data.logoLabel === null ? null : data.logoLabel?.trim(),
      coverUrl,
      coverMimeType,
      logoUrl,
      logoMimeType,
      gallery: isCloudinaryEnabled
        ? await Promise.all(
            (data.galleryFiles ?? []).map(async (file, index) => ({
              url: await this.resolveRequiredFileUrl(file),
              mimeType: file.mimetype,
              sortOrder: index,
            })),
          )
        : (data.galleryFiles ?? []).map((file, index) => ({
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
