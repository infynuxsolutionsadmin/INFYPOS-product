import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  constructor(private readonly configService: ConfigService) {}

  async hash(password: string): Promise<string> {
    const saltRounds = Number(
      this.configService.getOrThrow<number>('BCRYPT_SALT_ROUNDS'),
    );
    return bcrypt.hash(password, saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
