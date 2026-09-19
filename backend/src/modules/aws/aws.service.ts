import { Injectable, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class AwsService {
  private readonly logger = new Logger(AwsService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private isConfigured = false;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'infypos-installers';
    
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (region && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.isConfigured = true;
      this.logger.log(`AWS S3 Client configured for region ${region}`);
    } else {
      this.logger.warn('AWS S3 credentials not fully provided in env. S3 Service is running in simulated mode.');
    }
  }

  async generateInstallerSignedUrl(installerVersion: string): Promise<string> {
    const objectKey = `installers/infypos-till-${installerVersion}.exe`;
    const expiresInSeconds = 900; // 15 minutes

    if (!this.isConfigured || !this.s3Client) {
      // Return simulated URL if actual AWS SDK isn't configured with real keys.
      return `https://${this.bucketName}.s3.amazonaws.com/${objectKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=SIMULATED&X-Amz-Date=20260808T000000Z&X-Amz-Expires=${expiresInSeconds}&X-Amz-Signature=mock&X-Amz-SignedHeaders=host`;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${objectKey}: ${error.message}`);
      throw new Error('Could not generate download URL');
    }
  }
}
