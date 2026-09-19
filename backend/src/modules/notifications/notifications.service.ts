import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private sesClient: SESClient | null = null;
  private senderEmail: string;
  private isConfigured = false;

  constructor() {
    this.senderEmail = process.env.AWS_SES_SENDER_EMAIL || 'no-reply@infypos.com';

    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (region && accessKeyId && secretAccessKey) {
      this.sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.isConfigured = true;
      this.logger.log(`AWS SES Client configured for region ${region}`);
    } else {
      this.logger.warn('AWS SES credentials not fully provided in env. Notifications Service running in simulated mode.');
    }
  }

  async sendEmail(toAddress: string, subject: string, bodyText: string, bodyHtml?: string): Promise<boolean> {
    if (!this.isConfigured || !this.sesClient) {
      this.logger.log(`[SIMULATED EMAIL] To: ${toAddress} | Subject: ${subject}`);
      // Do not log OTP content in production, but we are in dev/simulated mode.
      // Wait, PRD says: "never log OTPs in production logs". Let's assume we just return true.
      return true;
    }

    try {
      const command = new SendEmailCommand({
        Source: this.senderEmail,
        Destination: {
          ToAddresses: [toAddress],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: bodyText,
              Charset: 'UTF-8',
            },
            ...(bodyHtml && {
              Html: {
                Data: bodyHtml,
                Charset: 'UTF-8',
              },
            }),
          },
        },
      });

      await this.sesClient.send(command);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${toAddress}: ${error.message}`);
      return false;
    }
  }
}
