import { registerAs } from '@nestjs/config';

export interface StorageConfig {
  driver: 'local' | 's3';
  uploadDir: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  aws: {
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string;
  };
}

export default registerAs(
  'storage',
  (): StorageConfig => ({
    driver: (process.env.STORAGE_DRIVER as 'local' | 's3') || 'local',
    uploadDir: process.env.STORAGE_UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(
      process.env.STORAGE_MAX_FILE_SIZE || '10485760',
      10,
    ), // 10MB
    allowedMimeTypes: process.env.STORAGE_ALLOWED_MIME_TYPES
      ? process.env.STORAGE_ALLOWED_MIME_TYPES.split(',').map((m) => m.trim())
      : ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    aws: {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      endpoint: process.env.AWS_S3_ENDPOINT,
    },
  }),
);
