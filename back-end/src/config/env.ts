import dotenv from 'dotenv';

// Загружаем переменные окружения из файла .env
dotenv.config();

// Собираем и экспортируем конфигурацию приложения
export const env = {
  port: Number(process.env.PORT || 5000),
  dbHost: process.env.DBHOST || 'localhost',
  dbUser: process.env.DBUSER || 'root',
  dbPass: process.env.DBPASS || '',
  dbName: process.env.DBDATABASE,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};