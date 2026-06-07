import { Router, Request, Response } from 'express';

const router = Router();

// Тестовый endpoint для справочников
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Lookups route is working',
  });
});

export default router;