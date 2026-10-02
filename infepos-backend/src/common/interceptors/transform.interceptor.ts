import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T> {
  success: boolean;
  statusCode: number;
  timestamp: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseFormat<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // If handler response is already wrapped with success flag, return as is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          data.success === true
        ) {
          return data;
        }

        return {
          success: true,
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
          data: data !== undefined ? data : null,
        };
      }),
    );
  }
}
