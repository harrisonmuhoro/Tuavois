import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

const prismaErrorMessages: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'A record with this information already exists' },
  P2003: { status: 400, message: 'This record is still referenced by other data' },
  P2025: { status: 404, message: 'Record not found' },
  P2034: { status: 409, message: 'The operation conflicted with another request. Please retry.' },
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: [],
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const prismaError = prismaErrorMessages[(err as any).code];
  if (prismaError) {
    res.status(prismaError.status).json({
      success: false,
      message: prismaError.message,
      errors: [],
    });
    return;
  }

  if ((err as any).name === 'MulterError') {
    res.status(400).json({
      success: false,
      message: (err as any).code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 10 MB limit' : 'File upload failed',
      errors: [],
    });
    return;
  }

  // Default 500
  console.error('Unhandled error:', err);
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errors: isDev ? [err.message] : [],
  });
};
