import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorResponse } from '../interfaces/api_response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (response.headersSent) {
      return;
    }

    let errorResponse: Omit<ApiErrorResponse, 'httpStatus'>;
    let httpStatus: HttpStatus;

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      errorResponse = {
        error: {
          code: `HTTP_${httpStatus}`,
          message: exception.message,
          timestamp: Date.now(),
        },
      };
    } else if (exception instanceof Error) {
      if (exception.name === 'ValidationError') {
        httpStatus = HttpStatus.BAD_REQUEST;
        errorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            timestamp: Date.now(),
          },
        };
      } else if (exception.name === 'EntityNotFoundError') {
        httpStatus = HttpStatus.NOT_FOUND;
        errorResponse = {
          error: {
            code: 'NOT_FOUND',
            message: exception.message,
            timestamp: Date.now(),
          },
        };
      } else {
        httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        errorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production'
              ? '服务器内部错误，请稍后重试'
              : exception.message,
            stack: process.env.NODE_ENV === 'development' ? exception.stack : undefined,
            timestamp: Date.now(),
          },
        };
        this.logger.error(`Unexpected error: ${exception.message}`, exception.stack);
      }
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        error: {
          code: 'UNKNOWN_ERROR',
          message: process.env.NODE_ENV === 'production'
            ? '服务器内部错误，请稍后重试'
            : '未知错误',
          timestamp: Date.now(),
        },
      };
      this.logger.error(`Unknown error: ${String(exception)}`);
    }

    response.status(httpStatus).json(errorResponse);
  }
}
