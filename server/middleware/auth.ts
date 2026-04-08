import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import db from '../lib/db';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log('Firebase Admin initialized with service account, projectId:', serviceAccount.project_id);
    } else {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        admin.initializeApp({ projectId: config.projectId });
        console.log('Firebase Admin initialized with projectId:', config.projectId);
      } else {
        console.warn('firebase-applet-config.json not found, attempting default initialization');
        admin.initializeApp();
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

const verifyRole = async (req: Request, res: Response, next: NextFunction, allowedRoles: string[]) => {
  const authHeader = req.headers.authorization;

  // Fallback for legacy adminSecret
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && authHeader === `Bearer ${adminSecret}`) {
    (req as any).user = { role: 'SUPER_ADMIN' };
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized access: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    let user = await db.user.findUnique({ where: { email: decodedToken.email } });
    
    if (!user && decodedToken.email === 'azat.cutliahmetov@gmail.com') {
      user = await db.user.create({
        data: {
          email: decodedToken.email,
          name: decodedToken.name || 'Super Admin',
          role: 'SUPER_ADMIN'
        }
      });
    }

    if (!user) {
      return res.status(403).json({ error: 'Forbidden: User not found in system' });
    }
    
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires one of roles: ${allowedRoles.join(', ')}` });
    }
    
    (req as any).user = { ...decodedToken, dbUser: user };
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return res.status(401).json({ error: 'Unauthorized access: Invalid token' });
  }
};

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  return verifyRole(req, res, next, ['SUPER_ADMIN']);
};

export const superAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
  return verifyRole(req, res, next, ['SUPER_ADMIN']);
};

export const contentManagerAuth = async (req: Request, res: Response, next: NextFunction) => {
  return verifyRole(req, res, next, ['SUPER_ADMIN', 'CONTENT_MANAGER']);
};

export const salesAgentAuth = async (req: Request, res: Response, next: NextFunction) => {
  return verifyRole(req, res, next, ['SUPER_ADMIN', 'SALES_AGENT']);
};

export const generalAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
  return verifyRole(req, res, next, ['SUPER_ADMIN', 'SALES_AGENT', 'CONTENT_MANAGER']);
};

export const dealerAuth = async (req: Request, res: Response, next: NextFunction) => {
  return verifyRole(req, res, next, ['SUPER_ADMIN', 'DEALER']);
};

export const userAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized access: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return res.status(401).json({ error: 'Unauthorized access: Invalid token' });
  }
};
