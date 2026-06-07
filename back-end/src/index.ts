import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import pool from './config/db.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import lookupsRoutes from './modules/lookups/lookups.routes.js';
import searchQueriesRoutes from './modules/search-queries/search-queries.routes.js';


const app = express();

// Разрешаем запросы с frontend-приложения
app.use(
  cors({
    origin: env.frontendUrl,
  }),
);

// Поддержка JSON request body
app.use(express.json());

// Поддержка form-urlencoded body
app.use(express.urlencoded({ extended: false }));

app.use('/api/queries', searchQueriesRoutes);

// Базовый маршрут проверки сервера
app.get('/', async (req: Request, res: Response) => {
  res.send('Osebni Zdravniki backend is running');
});

// Маршрут проверки соединения с БД
app.get('/api/health/db', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connection = await pool.getConnection();
    connection.release();

    res.json({
      success: true,
      message: 'Database connection successful',
    });
  } catch (error) {
    next(error);
  }
});

// Подключение модульных маршрутов
app.use('/api/auth', authRoutes);
app.use('/api/lookups', lookupsRoutes);

// Централизованный обработчик ошибок
app.use(errorMiddleware);

// Запуск сервера
app.listen(env.port, () => {
  console.log(`Server is running on port ${env.port}`);
});