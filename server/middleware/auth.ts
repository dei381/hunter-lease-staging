import { Request, Response, NextFunction } from 'express';

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET;

  if (process.env.NODE_ENV === 'production' && !adminSecret) {
    console.error('CRITICAL: ADMIN_SECRET is not set in production!');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const secretToUse = adminSecret || (process.env.NODE_ENV === 'production' ? null : 'default_dev_secret');

  console.log(`adminAuth: authHeader=${authHeader}, secretToUse=${secretToUse}`);

  if (!authHeader || !secretToUse || authHeader !== `Bearer ${secretToUse}`) {
    console.log(`adminAuth: Unauthorized access!`);
    return res.status(401).json({ error: 'Unauthorized access' });
  }
  next();
};
