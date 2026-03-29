import express from 'express';
import db from '../lib/db';

import { DealEngineFacade } from '../services/engine/DealEngineFacade';

const router = express.Router();

/**
 * POST /api/v2/quote
 * Основной эндпоинт для расчета предложения на странице автомобиля (VDP).
 */
router.post('/quote', async (req, res) => {
  try {
    const body = req.body.config ? { ...req.body, ...req.body.config } : req.body;
    const result = await DealEngineFacade.calculateForConsumer(body);
    res.json(result);
  } catch (error: any) {
    console.error('Quote calculation error:', error);
    res.status(500).json({ error: error?.message || String(error) });
  }
});

/**
 * GET /api/v2/quotes
 * Возвращает список предрасчитанных предложений для каталога.
 */
router.get('/quotes', async (req, res) => {
  try {
    // For MVP, just return empty array or mock snapshots
    res.json([]);
  } catch (error: any) {
    console.error('Failed to fetch quote snapshots:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
