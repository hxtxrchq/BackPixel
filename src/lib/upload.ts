import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const uploadRoot = path.resolve(process.cwd(), 'uploads', 'content');

const ensureDir = (dirPath: string) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureDir(uploadRoot);
    callback(null, uploadRoot);
  },
  filename: (_req, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    callback(null, `${Date.now()}_${safeName}`);
  },
});

export const contentUpload = multer({
  storage,
  limits: {
    files: 20,
    fileSize: 20 * 1024 * 1024,
  },
});
