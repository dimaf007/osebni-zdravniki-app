import { Router, Request, Response } from 'express';

const router = Router();

// Временный тестовый endpoint для модуля авторизации
router.post('/login', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Login route is working',
  });
});

// Временный тестовый endpoint для регистрации
router.post('/register', async (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: 'Register route is working',
  });
});

export default router;