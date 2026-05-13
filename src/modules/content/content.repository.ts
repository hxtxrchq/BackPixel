import { prisma } from '../../db/prisma.js';

export class ContentRepository {
  listAll() {
    return prisma.content.findMany({
      select: {
        id: true,
        companyName: true,
        title: true,
        slug: true,
        category: true,
        showOnHome: true,
        showOnPortfolio: true,
        coverUrl: true,
        coverMimeType: true,
        logoUrl: true,
        logoMimeType: true,
        logoLabel: true,
        galleryCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getById(contentId: string) {
    return prisma.content.findUnique({
      where: { id: contentId },
      include: {
        medias: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  listPublic() {
    return prisma.content.findMany({
      where: {
        showOnPortfolio: true,
      },
      include: {
        medias: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listHome() {
    return prisma.content.findMany({
      where: {
        showOnHome: true,
      },
      include: {
        medias: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  createContent(data: {
    companyName: string;
    title: string;
    slug: string;
    category: string;
    showOnHome: boolean;
    showOnPortfolio: boolean;
    logoLabel?: string;
    coverUrl?: string;
    coverMimeType?: string;
    logoUrl?: string;
    logoMimeType?: string;
    gallery: Array<{ url: string; mimeType?: string; sortOrder: number }>;
    createdById?: string;
  }) {
    return prisma.content.create({
      data: {
        companyName: data.companyName,
        title: data.title,
        slug: data.slug,
        category: data.category,
        showOnHome: data.showOnHome,
        showOnPortfolio: data.showOnPortfolio,
        coverUrl: data.coverUrl,
        coverMimeType: data.coverMimeType,
        logoUrl: data.logoUrl,
        logoMimeType: data.logoMimeType,
        logoLabel: data.logoLabel,
        galleryCount: data.gallery.length,
        createdById: data.createdById,
        medias: {
          create: data.gallery,
        },
      },
      include: {
        medias: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async updateContent(contentId: string, data: {
    companyName?: string;
    title?: string;
    category?: string;
    showOnHome?: boolean;
    showOnPortfolio?: boolean;
    coverUrl?: string | null;
    coverMimeType?: string | null;
    logoUrl?: string | null;
    logoMimeType?: string | null;
    logoLabel?: string | null;
    gallery?: Array<{ url: string; mimeType?: string; sortOrder: number }>;
    replaceGallery?: boolean;
    removeMediaIds?: string[];
  }) {
    const updateData: {
      companyName?: string;
      title?: string;
      category?: string;
      showOnHome?: boolean;
      showOnPortfolio?: boolean;
      coverUrl?: string | null;
      coverMimeType?: string | null;
      logoUrl?: string | null;
      logoMimeType?: string | null;
      logoLabel?: string | null;
      medias?:
        | { deleteMany: {}; create: Array<{ url: string; mimeType?: string; sortOrder: number }> }
        | { deleteMany: { id: { in: string[] } } };
    } = {
      companyName: data.companyName,
      title: data.title,
      category: data.category,
      showOnHome: data.showOnHome,
      showOnPortfolio: data.showOnPortfolio,
    };

    if (data.logoLabel !== undefined) {
      updateData.logoLabel = data.logoLabel;
    }

    if (data.coverUrl !== undefined) {
      updateData.coverUrl = data.coverUrl;
      updateData.coverMimeType = data.coverMimeType;
    }

    if (data.logoUrl !== undefined) {
      updateData.logoUrl = data.logoUrl;
      updateData.logoMimeType = data.logoMimeType;
    }

    if (data.replaceGallery) {
      const gallery = data.gallery ?? [];
      updateData.medias = {
        deleteMany: {},
        create: gallery,
      };
    } else if ((data.removeMediaIds?.length ?? 0) > 0) {
      updateData.medias = {
        deleteMany: {
          id: {
            in: data.removeMediaIds ?? [],
          },
        },
      };
    }

    return prisma.$transaction(async (tx) => {
      await tx.content.update({
        where: { id: contentId },
        data: updateData,
      });

      if (data.replaceGallery || (data.removeMediaIds?.length ?? 0) > 0) {
        const mediaCount = await tx.contentMedia.count({
          where: { contentId },
        });

        await tx.content.update({
          where: { id: contentId },
          data: {
            galleryCount: mediaCount,
          },
        });
      }

      return tx.content.findUniqueOrThrow({
        where: { id: contentId },
        include: {
          medias: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });
  }

  deleteContent(contentId: string) {
    return prisma.content.delete({ where: { id: contentId } });
  }
}
