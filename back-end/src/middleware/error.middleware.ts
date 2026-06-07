import { NextFunction, Request, Response } from 'express';

// Централизованный обработчик ошибок Express
export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(error);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}