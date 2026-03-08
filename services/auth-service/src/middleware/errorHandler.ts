import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: Date.now(),
        requestId,
      },
    });
  }

  // Unknown error
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: Date.now(),
      requestId,
    },
  });
}
