import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        const response: StandardResponse<T> = {
          success: true,
          data,
        };
        if (data && typeof data === 'object' && 'message' in data) {
          response.message = data.message;
          const { message, ...rest } = data;
          response.data = rest as T;
        }
        if (data && typeof data === 'object' && 'meta' in data) {
          response.meta = data.meta;
          const { meta, ...rest } = data;
          response.data = rest as T;
        }
        return response;
      }),
    );
  }
}
