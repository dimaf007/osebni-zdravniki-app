import dotenv from 'dotenv';

// Загружаем переменные окружения из файла .env
dotenv.config();

// Собираем и экспортируем конфигурацию приложения
export const env = {
  port: Number(process.env.PORT || 5000),
  dbHost: process.env.DB_HOST || 'localhost',
  dbUser: process.env.DB_USER || 'root',
  dbPass: process.env.DB_PASS || '',
  dbName: process.env.DB_DATABASE,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};