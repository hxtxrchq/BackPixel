import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

export const isCloudinaryEnabled =
  Boolean(env.CLOUDINARY_CLOUD_NAME) && Boolean(env.CLOUDINARY_API_KEY) && Boolean(env.CLOUDINARY_API_SECRET);

if (isCloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const sanitizeBasename = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');

export const uploadBufferToCloudinary = async (params: {
  buffer: Buffer;
  originalName: string;
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}) => {
  if (!isCloudinaryEnabled) {
    throw new Error('Cloudinary no configurado');
  }

  const publicId = `${Date.now()}_${sanitizeBasename(params.originalName || 'file')}`;
  const folder = params.folder ?? env.CLOUDINARY_FOLDER;

  const result = await new Promise<{
    secure_url: string;
    url: string;
  }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: params.resourceType ?? 'auto',
      },
      (error, res) => {
        if (error || !res) {
          reject(error ?? new Error('Fallo subiendo a Cloudinary'));
          return;
        }
        resolve({ secure_url: (res as any).secure_url, url: (res as any).url });
      },
    );

    uploadStream.end(params.buffer);
  });

  return result.secure_url || result.url;
};
