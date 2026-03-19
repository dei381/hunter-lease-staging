import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { ExtractionEngine } from "./src/services/ExtractionEngine";
import { CalculationEngine } from "./src/services/CalculationEngine";
import { EligibilityEngine } from "./src/services/EligibilityEngine";
import { FinancialSyncService } from "./src/services/FinancialSyncService";
import { CAR_DB } from "./src/data/cars";
import { DEALS } from "./src/data/deals";
import nodemailer from 'nodemailer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

import { getBodyStyle, getFuelType, getDetailedSpecs, getCategorizedFeatures, getOwnerVerdict } from './src/data/deals';

const prisma = new PrismaClient();

// Path to cars.json for persistence
const CARS_JSON_PATH = path.join(process.cwd(), "src", "data", "cars.json");
const CAR_PHOTOS_JSON_PATH = path.join(process.cwd(), "src", "data", "carPhotos.json");

// Load car photos
let CAR_PHOTOS: any[] = [];
try {
  if (fs.existsSync(CAR_PHOTOS_JSON_PATH)) {
    CAR_PHOTOS = JSON.parse(fs.readFileSync(CAR_PHOTOS_JSON_PATH, "utf-8"));
  }
} catch (error) {
  console.error("Failed to load car photos:", error);
}

// Helper to save car photos to Firestore
const saveCarPhotos = async () => {
  console.log("Saving car photos is disabled in production to prevent read-only file system errors.");
};

// Helper to save lenders to Firestore
const saveLenders = async () => {
  // Lenders are saved to Prisma directly
};

// Helper to save CAR_DB to Firestore
const saveCarDb = async () => {
  console.log("Saving car DB is disabled in production to prevent read-only file system errors.");
};

// Load data from Firestore on startup
const loadDataFromFirestore = async () => {
  // Data is loaded from local JSON or Prisma
  try {
    // Seed site settings if missing
    const existingSettings = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    if (!existingSettings) {
      const defaultSettings = {
        brokerFee: 595,
        taxRateDefault: 8.875,
        supportEmail: 'cargwin4555@gmail.com',
        maintenanceMode: false
      };
      
      // Seed to Prisma
      await prisma.siteSettings.upsert({
        where: { id: 'global' },
        update: {},
        create: {
          id: 'global',
          data: JSON.stringify(defaultSettings)
        }
      });
    }
  } catch (error) {
    console.error("Failed to load data:", error);
  }
};

// Security: Limit file size to 5MB and check MIME type
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, PNG, and WebP are allowed.'));
    }
  }
});

// Photo upload storage
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'public', 'uploads', 'cars');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const photoUpload = multer({ 
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for photos
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'));
    }
  }
});

// Ensure upload directories exist
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'cars');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created upload directory: ${uploadDir}`);
  }
} catch (error) {
  console.warn(`Could not create upload directory (read-only filesystem): ${error}`);
}

// Security: Rate limiting for ingest endpoint
const ingestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' }
});

// Security: Admin Authentication Middleware
const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET;

  if (process.env.NODE_ENV === 'production' && !adminSecret) {
    console.error('CRITICAL: ADMIN_SECRET is not set in production!');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const secretToUse = adminSecret || (process.env.NODE_ENV === 'production' ? null : 'default_dev_secret');

  if (!authHeader || !secretToUse || authHeader !== `Bearer ${secretToUse}`) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }
  next();
};

// Validation Schemas
const leadSchema = z.object({
  client: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().min(10).max(20),
    email: z.string().email().optional().or(z.literal('')),
    payMethod: z.string().max(50).optional(),
    paymentName: z.string().max(100).optional(),
    isFirstTimeBuyer: z.boolean().optional().default(false),
  }),
  tradeIn: z.object({
    make: z.string().max(50).optional(),
    model: z.string().max(50).optional(),
    year: z.number().optional(),
    mileage: z.string().max(20).optional(),
    vin: z.string().max(17).optional(),
    hasLoan: z.boolean().optional(),
    payoff: z.string().max(50).optional(),
  }).nullable().optional(),
  car: z.object({
    make: z.string().max(50),
    model: z.string().max(50),
    year: z.union([z.string(), z.number()]),
    trim: z.string().max(100).optional(),
    msrp: z.union([z.string(), z.number()]),
  }),
  calc: z.object({
    type: z.string().max(20),
    payment: z.union([z.string(), z.number()]),
    down: z.union([z.string(), z.number()]),
    tier: z.string().max(20).optional(),
  }),
  userId: z.string().optional().nullable(),
});

const creditAppSchema = z.object({
  leadId: z.string().uuid(),
  creditApp: z.object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    email: z.string().email(),
    dob: z.string().max(20),
    ssn: z.string().max(20),
    dlNumber: z.string().max(50),
    employer: z.string().max(100),
    position: z.string().max(100),
    monthlyIncome: z.string().max(20),
    incomeType: z.string().max(50),
    additionalIncome: z.string().max(20).optional(),
    workExperience: z.string().max(20),
    employerPhone: z.string().max(20),
    residencyStatus: z.string().max(50),
    address: z.string().max(200),
    prevAddress: z.string().max(200).optional(),
    hasCosigner: z.boolean().optional(),
    prevAuto: z.boolean().optional(),
    signature: z.string().min(2).max(100),
  })
});

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendLeadEmail(lead: any, type: 'new' | 'credit-app') {
  const recipient = 'cargwin4555@gmail.com';
  
  let subject = '';
  let html = '';

  if (type === 'new') {
    subject = `New Lead: ${lead.clientName} - ${lead.carMake} ${lead.carModel}`;
    html = `
      <h1>New Lead Received</h1>
      <p><strong>Client:</strong> ${lead.clientName}</p>
      <p><strong>Phone:</strong> ${lead.clientPhone}</p>
      <p><strong>Email:</strong> ${lead.clientEmail}</p>
      <p><strong>Payment Method:</strong> ${lead.payMethod} (${lead.paymentName})</p>
      <hr/>
      <h3>Car Details</h3>
      <p><strong>Car:</strong> ${lead.carYear} ${lead.carMake} ${lead.carModel} (${lead.carTrim})</p>
      <p><strong>Payment:</strong> $${lead.calcPayment}/${lead.calcType} with $${lead.calcDown} down</p>
      <hr/>
      ${lead.hasTradeIn ? `
        <h3>Trade-in Details</h3>
        <p><strong>Car:</strong> ${lead.tradeInYear} ${lead.tradeInMake} ${lead.tradeInModel}</p>
        <p><strong>Mileage:</strong> ${lead.tradeInMileage}</p>
        <p><strong>VIN:</strong> ${lead.tradeInVin}</p>
        <p><strong>Payoff:</strong> ${lead.tradeInPayoff || 'N/A'}</p>
      ` : '<p>No Trade-in</p>'}
    `;
  } else {
    const app = JSON.parse(lead.creditApp);
    subject = `Credit Application: ${lead.clientName}`;
    html = `
      <h1>Credit Application Received</h1>
      <p><strong>Client:</strong> ${app.firstName} ${app.lastName}</p>
      <p><strong>Email:</strong> ${app.email}</p>
      <p><strong>DOB:</strong> ${app.dob}</p>
      <p><strong>SSN:</strong> ${app.ssn}</p>
      <p><strong>DL Number:</strong> ${app.dlNumber}</p>
      <hr/>
      <h3>Employment</h3>
      <p><strong>Employer:</strong> ${app.employer}</p>
      <p><strong>Position:</strong> ${app.position}</p>
      <p><strong>Income:</strong> $${app.monthlyIncome} (${app.incomeType})</p>
      <p><strong>Additional Income:</strong> $${app.additionalIncome || '0'}</p>
      <p><strong>Work Experience:</strong> ${app.workExperience} years</p>
      <p><strong>Employer Phone:</strong> ${app.employerPhone}</p>
      <hr/>
      <h3>Residency & Address</h3>
      <p><strong>Status:</strong> ${app.residencyStatus}</p>
      <p><strong>Address:</strong> ${app.address}</p>
      <p><strong>Prev Address:</strong> ${app.prevAddress || 'N/A'}</p>
      <hr/>
      <h3>Additional Info</h3>
      <p><strong>Cosigner:</strong> ${app.hasCosigner ? 'Yes' : 'No'}</p>
      <p><strong>Prev Auto Finance:</strong> ${app.prevAuto ? 'Yes' : 'No'}</p>
      <hr/>
      <h3>Authorization</h3>
      <p><strong>Signature:</strong> ${app.signature}</p>
    `;
  }

  try {
    await transporter.sendMail({
      from: `"Hunter Lease Leads" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject,
      html,
    });
    console.log(`Email sent for lead ${lead.id}`);
  } catch (error) {
    console.error(`Failed to send email for lead ${lead.id}:`, error);
  }
}

async function startServer() {
  // Ensure data is loaded before starting routes (non-blocking)
  loadDataFromFirestore().catch(err => console.error("Initial data load failed:", err));
  
  const app = express();
  const PORT = 3000;

  // Seed default data (non-blocking)
  (async () => {
    try {
      const userCount = await prisma.user.count();
    if (userCount === 0) {
      await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@hunterlease.com',
          role: 'admin',
          status: 'active'
        }
      });
      console.log('Default admin user created: admin@hunterlease.com');
    }

    const settingsCount = await prisma.siteSettings.count();
    if (settingsCount === 0) {
      await prisma.siteSettings.create({
        data: {
          id: 'global',
          data: JSON.stringify({
            siteName: "Hunter Lease",
            contactEmail: "cargwin4555@gmail.com",
            maintenanceMode: false,
            allowNewRegistrations: true,
            defaultRegion: "California",
            currency: "USD"
          })
        }
      });
      console.log('Default site settings created');
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
  })();

  // Security: Restrict CORS in production
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://hunter.lease',
    'https://www.hunter.lease',
    'https://hunterlease.com',
    'https://www.hunterlease.com'
  ].filter(Boolean);

  const corsOptions = process.env.NODE_ENV === 'production' 
    ? { origin: allowedOrigins.length > 0 ? allowedOrigins : false } 
    : {};
  app.use(cors(corsOptions));
  app.use(express.json());

  // Security: Rate limiting for lead submission and feedback
  const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' }
  });

  // --- API ROUTES ---
  
  // Admin Stats
  app.get("/api/admin/stats", adminAuth, async (req, res) => {
    try {
      const [totalDeals, activeDeals, pendingReviews, totalLeads, totalUsers] = await Promise.all([
        prisma.dealRecord.count(),
        prisma.dealRecord.count({ where: { publishStatus: 'PUBLISHED' } }),
        prisma.dealRecord.count({ where: { reviewStatus: 'NEEDS_REVIEW' } }),
        prisma.lead.count(),
        prisma.user.count()
      ]);

      let visits: any[] = [];
      // Visits are now fetched directly from Firestore by the client

      const totalVisits = 0;
      const visitsByPath: any[] = [];

      const recentLeads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      const recentActivity = recentLeads.map((l: any) => ({
        id: l.id,
        type: 'lead',
        clientName: l.clientName,
        status: l.status,
        createdAt: l.createdAt
      }));

      res.json({
        totalDeals,
        activeDeals,
        pendingReviews,
        totalLeads,
        totalUsers,
        totalVisits,
        visitsByPath: visitsByPath.slice(0, 10),
        recentActivity
      });
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // API Key Status
  app.get("/api/admin/api-key-status", adminAuth, async (req, res) => {
    try {
      let hasKey = !!(process.env.API_KEY || process.env.GEMINI_API_KEY);
      
      if (!hasKey) {
        try {
          const settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
          if (settings && JSON.parse(settings.data)?.geminiApiKey) {
            hasKey = true;
          }
        } catch (e) {
          // Ignore error, fallback to env
        }
      }
      
      res.json({ hasKey });
    } catch (error) {
      res.json({ hasKey: !!(process.env.API_KEY || process.env.GEMINI_API_KEY) });
    }
  });

  // Site Settings
  app.get("/api/settings", async (req, res) => {
    try {
      // Fetch from Prisma
      const settings = await prisma.siteSettings.findUnique({
        where: { id: 'global' }
      });
      res.json(settings ? JSON.parse(settings.data) : {
        brokerFee: 595,
        taxRateDefault: 8.875,
        supportEmail: 'cargwin4555@gmail.com',
        maintenanceMode: false,
        dmvFee: 400,
        docFee: 85,
        acquisitionFee: 650,
        dispositionFee: 395
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      // Even if everything fails, return default settings instead of 500
      res.json({
        brokerFee: 595,
        taxRateDefault: 8.875,
        supportEmail: 'cargwin4555@gmail.com',
        maintenanceMode: false,
        dmvFee: 400,
        docFee: 85,
        acquisitionFee: 650,
        dispositionFee: 395
      });
    }
  });

  app.put("/api/admin/settings", adminAuth, async (req, res) => {
    try {
      const data = JSON.stringify(req.body);
      
      // Save to Prisma
      await prisma.siteSettings.upsert({
        where: { id: 'global' },
        update: { data },
        create: { id: 'global', data }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // User Management
  app.get("/api/admin/users", adminAuth, async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", adminAuth, async (req, res) => {
    try {
      const { name, email, role } = req.body;
      const user = await prisma.user.create({
        data: { name, email, role }
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/admin/users/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, role, status } = req.body;
      const user = await prisma.user.update({
        where: { id },
        data: { name, email, role, status }
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.user.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Lenders DB
  app.get("/api/reviews", async (req, res) => {
    try {
      const reviews = await prisma.review.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Feedback API
  app.post("/api/feedback", standardLimiter, async (req, res) => {
    try {
      const { name, email, message } = req.body;
      const feedback = await prisma.feedback.create({
        data: { name, email, message }
      });
      res.json(feedback);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.get("/api/admin/feedback", async (req, res) => {
    try {
      const feedback = await prisma.feedback.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(feedback);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.put("/api/admin/feedback/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const feedback = await prisma.feedback.update({
        where: { id },
        data: { status }
      });
      res.json(feedback);
    } catch (error) {
      res.status(500).json({ error: "Failed to update feedback status" });
    }
  });

  app.get("/api/admin/reviews", adminAuth, async (req, res) => {
    try {
      const reviews = await prisma.review.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/admin/reviews", adminAuth, async (req, res) => {
    try {
      const { clientName, carName, location, savings, imageUrl, videoUrl, rating, isActive } = req.body;
      const review = await prisma.review.create({
        data: { clientName, carName, location, savings, imageUrl, videoUrl, rating, isActive }
      });
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.put("/api/admin/reviews/:id", adminAuth, async (req, res) => {
    try {
      const { clientName, carName, location, savings, imageUrl, videoUrl, rating, isActive } = req.body;
      const review = await prisma.review.update({
        where: { id: req.params.id },
        data: { clientName, carName, location, savings, imageUrl, videoUrl, rating, isActive }
      });
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: "Failed to update review" });
    }
  });

  app.delete("/api/admin/reviews/:id", adminAuth, async (req, res) => {
    try {
      await prisma.review.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  app.get("/api/admin/lenders", adminAuth, async (req, res) => {
    try {
      const lenders = await prisma.lender.findMany();
      res.json(lenders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lenders" });
    }
  });

  app.post("/api/admin/lenders", adminAuth, express.json(), async (req, res) => {
    try {
      const { name, isCaptive, isFirstTimeBuyerFriendly, aliases } = req.body;
      const newLender = await prisma.lender.create({
        data: {
          name,
          isCaptive: isCaptive || false,
          isFirstTimeBuyerFriendly: isFirstTimeBuyerFriendly || false,
          aliases: JSON.stringify(aliases || [])
        }
      });
      await saveLenders();
      res.json(newLender);
    } catch (error) {
      console.error("Failed to create lender:", error);
      res.status(500).json({ error: "Failed to create lender" });
    }
  });

  app.put("/api/admin/lenders/:id", adminAuth, express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, isCaptive, isFirstTimeBuyerFriendly, aliases } = req.body;
      const updatedLender = await prisma.lender.update({
        where: { id },
        data: {
          name,
          isCaptive,
          isFirstTimeBuyerFriendly,
          aliases: JSON.stringify(aliases || [])
        }
      });
      await saveLenders();
      res.json(updatedLender);
    } catch (error) {
      console.error("Failed to update lender:", error);
      res.status(500).json({ error: "Failed to update lender" });
    }
  });

  app.delete("/api/admin/lenders/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.lender.delete({ where: { id } });
      await saveLenders();
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete lender:", error);
      res.status(500).json({ error: "Failed to delete lender" });
    }
  });

  // --- CAR DATABASE MANAGEMENT ---
  app.get("/api/admin/cars", adminAuth, (req, res) => {
    res.json(CAR_DB);
  });

  app.put("/api/admin/cars", adminAuth, (req, res) => {
    try {
      const { makes } = req.body;
      if (makes) (CAR_DB as any).makes = makes;
      if ('tiers' in (CAR_DB as any)) delete (CAR_DB as any).tiers;
      
      saveCarDb();
      res.json({ message: "Car database updated successfully", data: CAR_DB });
    } catch (error) {
      console.error("Failed to update car database:", error);
      res.status(500).json({ error: "Failed to update car database" });
    }
  });

  app.post("/api/admin/sync-external", adminAuth, async (req, res) => {
    try {
      const apiKey = (process.env.MARKETCHECK_API_KEY || process.env.API_KEY || '').trim();
      if (!apiKey) {
        return res.status(400).json({ error: "Marketcheck API Key is not configured. Please set MARKETCHECK_API_KEY in Secrets or use the Select Key dialog." });
      }

      const result = await FinancialSyncService.syncFromExternalAPI(apiKey, CAR_DB);
      
      // Update the global CAR_DB object
      Object.assign(CAR_DB, result.updatedDb);
      
      // Persist to Firestore and local JSON
      await saveCarDb();

      res.json({ 
        message: "External sync completed", 
        stats: result.stats,
        lastSync: (CAR_DB as any).lastGlobalSync 
      });
    } catch (error: any) {
      console.error("External sync failed:", error);
      res.status(500).json({ 
        error: "External sync failed", 
        details: error.message 
      });
    }
  });

  app.post("/api/admin/snapshot-calculator", adminAuth, async (req, res) => {
    try {
      // Writing to local files is disabled in production to prevent read-only file system errors.
      res.json({ 
        message: "Calculator snapshot feature is disabled in production", 
        timestamp: new Date().toISOString() 
      });
    } catch (error: any) {
      console.error("Failed to create calculator snapshot:", error);
      res.status(500).json({ error: "Failed to create calculator snapshot", details: error.message });
    }
  });

  app.get("/api/admin/test-marketcheck", adminAuth, async (req, res) => {
    try {
      const apiKey = (process.env.MARKETCHECK_API_KEY || '').trim();
      const results: any[] = [];

      // Test 1: auto-complete
      const url1 = new URL('https://api.marketcheck.com/v2/search/car/auto-complete');
      url1.searchParams.append('api_key', apiKey);
      url1.searchParams.append('field', 'make');
      url1.searchParams.append('input', 'toy');

      const response1 = await fetch(url1.toString(), { 
        headers: { 
          "Accept": "application/json",
          "api_key": apiKey,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        } 
      });
      const data1 = await response1.json();

      if (response1.status === 401) {
        return res.status(401).json({
          error: "Invalid Marketcheck API Key",
          details: "The API returned 401 Unauthorized. Please check your MARKETCHECK_API_KEY in the AI Studio Secrets panel. Ensure there are no extra spaces.",
          raw_response: data1
        });
      }

      results.push({
        test: "auto-complete",
        request_url: url1.toString().replace(apiKey, 'HIDDEN_KEY'),
        headers_used: { "Accept": "application/json", "api_key": "HIDDEN" },
        status: response1.status,
        raw_response: data1
      });

      // Test 2: active with finance
      const testMake = req.query.make as string || 'Toyota';
      const testModel = req.query.model as string || 'Camry';
      const url2 = new URL('https://api.marketcheck.com/v2/search/car/active');
      url2.searchParams.append('api_key', apiKey);
      url2.searchParams.append('car_type', 'new');
      url2.searchParams.append('make', testMake);
      url2.searchParams.append('model', testModel);
      url2.searchParams.append('rows', '5');
      url2.searchParams.append('include_finance', 'true');

      const response2 = await fetch(url2.toString(), { 
        headers: { 
          "Accept": "application/json",
          "api_key": apiKey,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        } 
      });
      const data2 = await response2.json();

      if (response2.status === 401) {
        return res.status(401).json({
          error: "Invalid Marketcheck API Key",
          details: "The API returned 401 Unauthorized during the 'active' search test. Please check your MARKETCHECK_API_KEY.",
          raw_response: data2
        });
      }

      results.push({
        test: "search-active-finance",
        request_url: url2.toString().replace(apiKey, 'HIDDEN_KEY'),
        status: response2.status,
        listing_count: data2.listings?.length || 0,
        sample_listing: data2.listings?.[0] ? {
          vin: data2.listings[0].vin,
          build: data2.listings[0].build,
          msrp: data2.listings[0].msrp,
          price: data2.listings[0].price,
          rebates: data2.listings[0].rebates,
          extra: data2.listings[0].extra,
          finance_details: data2.listings[0].finance_details
        } : null
      });

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Marketcheck Auto-Complete
  app.get("/api/search/auto-complete", async (req, res) => {
    try {
      const apiKey = process.env.MARKETCHECK_API_KEY;
      const { field, input } = req.query;
      
      if (!field || !input) {
        return res.status(400).json({ error: "Missing field or input" });
      }

      const url = new URL('https://api.marketcheck.com/v2/search/car/auto-complete');
      url.searchParams.append('api_key', apiKey || '');
      url.searchParams.append('field', field as string);
      url.searchParams.append('input', input as string);

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Auto-complete failed:", error);
      res.status(500).json({ error: "Auto-complete failed" });
    }
  });

  // Inventory Search with Filters
  app.get("/api/inventory", async (req, res) => {
    try {
      // Inventory is not currently implemented in Prisma
      res.json([]);
    } catch (error) {
      console.error("Fetch inventory failed:", error);
      res.status(500).json({ error: "Fetch inventory failed" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Deal Engine Backend is running" });
  });

  // Cars DB
  app.get("/api/cars", (req, res) => {
    res.json(CAR_DB);
  });

  // Cars DB Update
  app.put("/api/cars", adminAuth, (req, res) => {
    try {
      const { makes } = req.body;
      if (makes) (CAR_DB as any).makes = makes;
      if ('tiers' in (CAR_DB as any)) delete (CAR_DB as any).tiers;
      
      saveCarDb();
      res.json({ success: true, data: CAR_DB });
    } catch (error) {
      console.error("Failed to update car database:", error);
      res.status(500).json({ error: "Failed to update car database" });
    }
  });

  // --- CAR PHOTO MANAGEMENT ---
  app.get("/api/car-photos", (req, res) => {
    res.json(CAR_PHOTOS);
  });

  app.post("/api/admin/car-photos/upload", adminAuth, express.json(), (req, res) => {
    try {
      const { makeId, modelId, year, colorId, isDefault, imageUrl } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ error: "No image URL provided" });
      }

      const newPhoto = {
        id: `photo_${Date.now()}`,
        makeId,
        modelId,
        year: parseInt(year),
        colorId: colorId || 'default',
        imageUrl,
        isDefault: isDefault === 'true' || isDefault === true,
        createdAt: new Date().toISOString()
      };

      // If this is set as default, unset other defaults for same model/year
      if (newPhoto.isDefault) {
        CAR_PHOTOS.forEach(p => {
          if (p.makeId === makeId && p.modelId === modelId && p.year === newPhoto.year) {
            p.isDefault = false;
          }
        });
      }

      CAR_PHOTOS.push(newPhoto);
      saveCarPhotos();

      res.json({ success: true, photo: newPhoto });
    } catch (error) {
      console.error("Failed to upload car photo:", error);
      res.status(500).json({ error: "Failed to upload car photo" });
    }
  });

  app.delete("/api/admin/car-photos/:id", adminAuth, (req, res) => {
    try {
      const { id } = req.params;
      const photoIndex = CAR_PHOTOS.findIndex(p => p.id === id);
      
      if (photoIndex === -1) {
        return res.status(404).json({ error: "Photo not found" });
      }

      // We no longer delete the file from disk since it's in Firebase Storage
      // The client should ideally delete it from Firebase Storage, but for now we just remove the metadata
      CAR_PHOTOS.splice(photoIndex, 1);
      saveCarPhotos();

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete car photo:", error);
      res.status(500).json({ error: "Failed to delete car photo" });
    }
  });

  app.put("/api/admin/car-photos/:id/default", adminAuth, (req, res) => {
    try {
      const { id } = req.params;
      const photo = CAR_PHOTOS.find(p => p.id === id);
      
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      // Unset other defaults for same model/year
      CAR_PHOTOS.forEach(p => {
        if (p.makeId === photo.makeId && p.modelId === photo.modelId && p.year === photo.year) {
          p.isDefault = false;
        }
      });

      photo.isDefault = true;
      saveCarPhotos();

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to set default photo:", error);
      res.status(500).json({ error: "Failed to set default photo" });
    }
  });

  // Lead Endpoints
  app.post("/api/lead", standardLimiter, async (req, res) => {
    try {
      // Security: Validate input
      const validatedData = leadSchema.parse(req.body);
      const { client, tradeIn, car, calc } = validatedData;

      const lead = await prisma.lead.create({
        data: {
          clientName: client.name,
          clientPhone: client.phone,
          clientEmail: client.email || '',
          payMethod: client.payMethod || '',
          paymentName: client.paymentName || '',
          
          hasTradeIn: !!tradeIn,
          tradeInMake: tradeIn?.make,
          tradeInModel: tradeIn?.model,
          tradeInYear: tradeIn?.year ? String(tradeIn.year) : undefined,
          tradeInMileage: tradeIn?.mileage,
          tradeInVin: tradeIn?.vin,
          tradeInHasLoan: tradeIn?.hasLoan || false,
          tradeInPayoff: tradeIn?.payoff,

          carMake: car.make,
          carModel: car.model,
          carYear: Number(car.year),
          carTrim: car.trim,
          carMsrp: Number(car.msrp),

          calcType: calc.type,
          calcPayment: Number(calc.payment),
          calcDown: Number(calc.down),
          calcTier: calc.tier || '',
          isFirstTimeBuyer: client.isFirstTimeBuyer || false,
          userId: validatedData.userId || null,
          
          dealersSent: 5, // Mock initial value
          dealersAccepted: 0
        }
      });

      // Send notification email
      sendLeadEmail(lead, 'new');

      res.json({ success: true, leadId: lead.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: (error as any).errors });
      }
      console.error("Failed to create lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.post("/api/lead/credit-app", async (req, res) => {
    try {
      // Security: Validate input
      const validatedData = creditAppSchema.parse(req.body);
      const { leadId, creditApp } = validatedData;
      
      const lead = await prisma.lead.findUnique({
        where: { id: leadId }
      });

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const updatedLead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          creditApp: JSON.stringify(creditApp)
        }
      });

      // Send credit app email
      sendLeadEmail(updatedLead, 'credit-app');

      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: (error as any).errors });
      }
      console.error("Failed to update lead with credit app:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.get("/api/lead/:id", async (req, res) => {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: req.params.id }
      });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      
      res.json({
        id: lead.id,
        status: lead.status,
        dealersSent: lead.dealersSent,
        dealersAccepted: lead.dealersAccepted,
        acceptedBy: lead.acceptedBy,
        car: { make: lead.carMake, model: lead.carModel },
        createdAt: lead.createdAt,
        creditApp: lead.creditApp
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  // Security: Protect admin routes
  app.get("/api/leads/my", async (req, res) => {
    try {
      const userId = req.headers['x-user-uid'] as string;
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      const leads = await prisma.lead.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      const mappedLeads = leads.map(l => ({
        id: l.id,
        clientName: l.clientName,
        clientPhone: l.clientPhone,
        clientEmail: l.clientEmail,
        status: l.status,
        createdAt: l.createdAt.toISOString(),
        vehicle: {
          make: l.carMake,
          model: l.carModel,
          year: l.carYear,
          trim: l.carTrim,
          msrp: l.carMsrp
        },
        calc: {
          type: l.calcType,
          payment: l.calcPayment,
          down: l.calcDown,
          tier: l.calcTier
        }
      }));

      res.json(mappedLeads);
    } catch (error) {
      console.error("Failed to fetch user leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads", adminAuth, async (req, res) => {
    try {
      const leads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' }
      });
      
      const mappedLeads = leads.map(l => ({
        id: l.id,
        client: { 
          name: l.clientName, 
          phone: l.clientPhone, 
          payMethod: l.payMethod, 
          paymentName: l.paymentName,
          isFirstTimeBuyer: l.isFirstTimeBuyer
        },
        tradeIn: l.hasTradeIn ? {
          hasTradeIn: true,
          make: l.tradeInMake,
          model: l.tradeInModel,
          year: l.tradeInYear,
          mileage: l.tradeInMileage,
          vin: l.tradeInVin,
          hasLoan: l.tradeInHasLoan,
          payoff: l.tradeInPayoff
        } : null,
        car: { make: l.carMake, model: l.carModel, year: l.carYear, trim: l.carTrim, msrp: l.carMsrp },
        calc: { type: l.calcType, payment: l.calcPayment, down: l.calcDown, tier: l.calcTier },
        status: l.status,
        dealersSent: l.dealersSent,
        dealersAccepted: l.dealersAccepted,
        createdAt: l.createdAt.toISOString()
      }));
      
      res.json(mappedLeads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.put("/api/lead/:id", adminAuth, async (req, res) => {
    try {
      const { status } = req.body;
      const updatedLead = await prisma.lead.update({
        where: { id: req.params.id },
        data: { status }
      });
      res.json({ success: true, lead: updatedLead });
    } catch (error) {
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/lead/:id", adminAuth, async (req, res) => {
    try {
      await prisma.lead.delete({
        where: { id: req.params.id }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete lead:", error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Upload endpoint (Ingestion Layer)
  // Security: Apply rate limiting and multer limits
  app.post("/api/ingest", adminAuth, ingestLimiter, upload.single("offer"), async (req, res) => {
    try {
      console.log("Received ingestion request...");
      if (!req.file) {
        console.error("Ingestion failed: No file uploaded");
        return res.status(400).json({ error: "No file uploaded" });
      }

      const ingestionId = `ingest_${Date.now()}`;
      console.log(`Processing ingestion ${ingestionId}, file: ${req.file.originalname}, size: ${req.file.size}`);

      // 1. Extract Data using Gemini
      console.log(`Extracting data for ${ingestionId} using Gemini...`);
      let extractedData;
      try {
        // Get API Key from settings if available
      let customApiKey = undefined;
      try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
        if (settings) {
          customApiKey = JSON.parse(settings.data)?.geminiApiKey;
        }
      } catch (e) {
        console.error("Error fetching custom API key:", e);
      }

      extractedData = await ExtractionEngine.extract(req.file.buffer, req.file.mimetype, customApiKey);
        console.log(`Gemini extraction successful for ${ingestionId}:`, JSON.stringify(extractedData).substring(0, 200) + "...");
      } catch (geminiError) {
        console.error(`Gemini extraction failed for ${ingestionId}:`, geminiError);
        return res.status(500).json({ error: "AI extraction failed. Please check your Gemini API key configuration." });
      }

      // 2. Calculate & Evaluate
      console.log(`Evaluating data for ${ingestionId}...`);
      const calcResult = CalculationEngine.calculateLease(extractedData);
      const eligibility = EligibilityEngine.evaluate(extractedData, calcResult.mode, calcResult.markups);

      // 3. Save to DB (Prisma)
      const deal = await prisma.dealRecord.create({
        data: {
          ingestionId,
          reviewStatus: eligibility.is_publishable ? "APPROVED" : "NEEDS_REVIEW",
          publishStatus: eligibility.publish_mode,
          programKeys: JSON.stringify({}),
          financialData: JSON.stringify(extractedData),
          eligibility: JSON.stringify(eligibility),
          isFirstTimeBuyerEligible: true
        }
      });

      console.log(`Ingestion ${ingestionId} completed successfully. Deal ID: ${deal.id}`);
      res.json({ 
        success: true, 
        ingestionId, 
        dealId: deal.id,
        message: "File ingested and analyzed successfully." 
      });
    } catch (error) {
      console.error("Ingestion error:", error);
      res.status(500).json({ error: "Failed to ingest offer" });
    }
  });

  // Sync static deals to database
  app.post("/api/admin/deals/sync", adminAuth, async (req, res) => {
    try {
      // Use statically imported DEALS instead of dynamic import
      let createdCount = 0;
      let updatedCount = 0;

      for (const deal of DEALS) {
        const ingestionId = `STATIC-${deal.id}`;
        
        // Map static deal to DealRecord format
        const financialData = {
          make: deal.make,
          model: deal.model,
          year: deal.year,
          trim: deal.trim,
          msrp: deal.msrp,
          payment: deal.payment,
          term: parseInt(deal.term?.toString().split(' ')[0] || "36"),
          down: deal.down,
          type: deal.type,
          savings: deal.savings,
          dealer: deal.dealer,
          region: deal.region,
          intel: deal.intel,
          image: deal.image,
          hot: deal.hot,
          secret: deal.secret,
          icon: deal.icon,
          class: deal.class,
          availableIncentives: deal.availableIncentives
        };

        const financialDataString = JSON.stringify(financialData);

        // Sync to Prisma
        const existingPrisma = await prisma.dealRecord.findUnique({
          where: { ingestionId }
        });

        if (existingPrisma) {
          await prisma.dealRecord.update({
            where: { ingestionId },
            data: {
              financialData: financialDataString,
            }
          });
          updatedCount++;
        } else {
          await prisma.dealRecord.create({
            data: {
              ingestionId,
              financialData: financialDataString,
              programKeys: "{}",
              eligibility: JSON.stringify({ is_publishable: true, blocking_reasons: [] }),
              reviewStatus: "APPROVED",
              publishStatus: "PUBLISHED",
              isFirstTimeBuyerEligible: true
            }
          });
          createdCount++;
        }
      }

      res.json({ success: true, createdCount, updatedCount });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Failed to sync deals" });
    }
  });

  // Get all deals for Admin Queue
  app.get("/api/admin/deals", adminAuth, async (req, res) => {
    try {
      const deals = await prisma.dealRecord.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(deals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // Create a manual deal
  app.post("/api/admin/deals", adminAuth, async (req, res) => {
    try {
      const { financialData, reviewStatus, publishStatus, lenderId, isFirstTimeBuyerEligible } = req.body;
      
      const deal = await prisma.dealRecord.create({
        data: {
          ingestionId: `MANUAL-${Date.now()}`,
          financialData: JSON.stringify(financialData || {}),
          programKeys: "{}",
          eligibility: JSON.stringify({ is_publishable: true, blocking_reasons: [] }),
          reviewStatus: reviewStatus || "NEEDS_REVIEW",
          publishStatus: publishStatus || "DRAFT",
          lenderId: lenderId || null,
          isFirstTimeBuyerEligible: isFirstTimeBuyerEligible !== undefined ? isFirstTimeBuyerEligible : true
        }
      });
      res.json(deal);
    } catch (error) {
      console.error("Failed to create manual deal:", error);
      res.status(500).json({ error: "Failed to create manual deal" });
    }
  });

  // Update a deal
  app.put("/api/admin/deals/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { financialData, reviewStatus, publishStatus, lenderId, isFirstTimeBuyerEligible } = req.body;
      
      // Re-evaluate eligibility if financialData or eligibility settings changed
      let eligibilityString = undefined;
      if (financialData) {
        const calcResult = CalculationEngine.calculateLease(financialData);
        const eligibility = EligibilityEngine.evaluate(
          financialData, 
          calcResult.mode, 
          calcResult.markups,
          isFirstTimeBuyerEligible !== undefined ? isFirstTimeBuyerEligible : true
        );
        eligibilityString = JSON.stringify(eligibility);
      }

      const updates: any = {};
      if (financialData) updates.financialData = JSON.stringify(financialData);
      if (reviewStatus) updates.reviewStatus = reviewStatus;
      if (publishStatus) updates.publishStatus = publishStatus;
      if (lenderId !== undefined) updates.lenderId = lenderId;
      if (isFirstTimeBuyerEligible !== undefined) updates.isFirstTimeBuyerEligible = isFirstTimeBuyerEligible;
      if (eligibilityString) updates.eligibility = eligibilityString;

      const updatedDeal = await prisma.dealRecord.update({
        where: { id },
        data: updates
      });
      res.json(updatedDeal);
    } catch (error) {
      console.error("Failed to update deal:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  // Delete a deal
  app.delete("/api/admin/deals/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.dealRecord.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete deal:", error);
      res.status(500).json({ error: "Failed to delete deal" });
    }
  });

  // Helper to extract value from potentially nested object or direct number
  const getVal = (field: any, fallback: number = 0): number => {
    if (field === null || field === undefined) return fallback;
    if (typeof field === 'object' && 'value' in field) return field.value;
    if (typeof field === 'number') return field;
    if (typeof field === 'string') {
      const parsed = parseFloat(field.replace(/[^0-9.]/g, ''));
      return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  };

  // Get approved/published deals for Marketplace
  app.get("/api/deals", async (req, res) => {
    try {
      // Fetch deals that are APPROVED or PUBLISHED from Prisma (fallback to static DEALS if empty)
      const dbDeals = await prisma.dealRecord.findMany({
        where: {
          OR: [
            { reviewStatus: 'APPROVED' },
            { publishStatus: 'PUBLISHED' }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      const taxRate = 0.095; // Default CA tax rate for calculations

      // Map DB deals to the format expected by the frontend
      const mappedDeals = (dbDeals as any[]).map(deal => {
        const data = deal.financialData ? JSON.parse(deal.financialData) : null;
        if (!data) return null;

        const hunterDiscount = data.hunterDiscount?.isGlobal ? (data.hunterDiscount.value || 0) : 0;
        const manufacturerRebate = data.manufacturerRebate?.isGlobal ? (data.manufacturerRebate.value || 0) : 0;
        const totalGlobalSavings = hunterDiscount + manufacturerRebate;

        let msrp = getVal(data.msrp);
        let mf = getVal(data.moneyFactor || data.mf, 0.002);
        let rv = getVal(data.residualValue || data.rv, 0.5);
        let leaseCash = getVal(data.leaseCash || data.rebates, 0);
        let term = getVal(data.term, 36);
        let down = getVal(data.down, 3000); // This is total DAS
        let savings = getVal(data.savings, 0);

        // Use totalGlobalSavings if it's greater than 0, otherwise fallback to existing savings logic
        const effectiveSavings = totalGlobalSavings > 0 ? totalGlobalSavings : savings;
        let type = data.type || 'lease';

        // AUTOMATIC UPDATE: Check CAR_DB for latest data
        if (data.make && data.model && data.trim) {
          const makeObj = (CAR_DB as any).makes?.find((m: any) => m.name.toLowerCase() === data.make.toLowerCase());
          if (makeObj) {
            const modelObj = makeObj.models?.find((m: any) => m.name.toLowerCase() === data.model.toLowerCase());
            if (modelObj) {
              const trimObj = modelObj.trims?.find((t: any) => t.name.toLowerCase() === data.trim.toLowerCase());
              if (trimObj) {
                // Use latest data from catalog
                msrp = trimObj.msrp || msrp;
                mf = trimObj.mf || mf;
                rv = trimObj.rv36 || rv;
                leaseCash = trimObj.leaseCash || leaseCash;
              }
            }
          }
        }

        // Re-calculate payment based on new DAS logic
        let payment = getVal(data.monthlyPayment || data.payment);
        
        if (type === 'lease') {
          const acqFee = 650;
          const docFee = 85;
          const rvAmt = msrp * (rv > 1 ? rv / 100 : rv);
          const sellingPrice = msrp - effectiveSavings;
          
          // Approximate first payment to find cap reduction
          const approxCapCost = sellingPrice - down + acqFee + docFee;
          const approxDepreciation = (approxCapCost - rvAmt) / term;
          const approxRent = (approxCapCost + rvAmt) * mf;
          const approxFirstPayment = (approxDepreciation + approxRent) * (1 + taxRate);
          
          const capReduction = Math.max(0, down - approxFirstPayment - acqFee - docFee - (acqFee + docFee) * taxRate);
          const capCost = sellingPrice - capReduction + acqFee + docFee;
          
          const depreciation = (capCost - rvAmt) / term;
          const rentCharge = (capCost + rvAmt) * mf;
          const baseLeasePay = depreciation + rentCharge;
          payment = Math.round(baseLeasePay * (1 + taxRate));
        } else {
          // Finance
          const docFee = 85;
          const apr = getVal(data.apr, 6.9);
          const amountFinanced = (msrp - effectiveSavings) + docFee + ((msrp - effectiveSavings) * taxRate) - down;
          const r = apr / 100 / 12;
          payment = Math.round((amountFinanced * (r * Math.pow(1 + r, term))) / (Math.pow(1 + r, term) - 1));
        }

        // Handle RV percentage vs absolute
        let rvPercent = '0%';
        if (rv > 0) {
          if (rv < 1) {
            rvPercent = (rv * 100).toFixed(0) + '%';
          } else if (msrp > 0) {
            rvPercent = (rv / msrp * 100).toFixed(0) + '%';
          } else {
            rvPercent = rv.toString();
          }
        }

        // Find photo from CAR_PHOTOS if available
        let imageUrl = data.image || null;
        let bodyStyle = data.bodyStyle || 'SUV';
        let fuelType = data.fuelType || 'Gas';
        let driveType = data.driveType || 'FWD';
        let seats = data.seats || 5;
        let features = data.features || [];
        let featuresRu = data.featuresRu || [];
        
        if (data.make && data.model) {
          const makeObj = (CAR_DB as any).makes?.find((m: any) => m.name.toLowerCase() === data.make.toLowerCase());
          if (makeObj) {
            const modelObj = makeObj.models?.find((m: any) => m.name.toLowerCase() === data.model.toLowerCase());
            if (modelObj) {
              const photo = CAR_PHOTOS.find(p => p.makeId === makeObj.id && p.modelId === modelObj.id && p.isDefault);
              if (photo) {
                imageUrl = photo.imageUrl;
              }
              bodyStyle = getBodyStyle(modelObj.class, modelObj.name);
              fuelType = getFuelType(modelObj.class, data.trim || '');
              seats = modelObj.class.includes('3-Row') || modelObj.class.includes('Minivan') ? 7 : 5;
              
              if (data.trim) {
                const trimObj = modelObj.trims?.find((t: any) => t.name.toLowerCase() === data.trim.toLowerCase());
                if (trimObj && trimObj.feat) {
                  driveType = trimObj.feat.includes('AWD') || trimObj.feat.includes('4x4') ? 'AWD' : 'FWD';
                  features = trimObj.feat.split(' · ');
                  // Note: featuresRu is translated in frontend or we can leave it empty to fallback
                }
              }
            }
          }
        }

        const { specs, specsRu } = getDetailedSpecs(data.model || '', data.trim || '', bodyStyle, fuelType);
        const catFeatures = getCategorizedFeatures(data.make || '', data.model || '', data.trim || '');
        const isLuxury = ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Porsche', 'Land Rover'].includes(data.make || '');
        const verdict = getOwnerVerdict(data.make || '', data.model || '', data.trim || '', isLuxury);

        return {
          id: deal.id,
          type: type,
          hot: data.hot || savings > 5000 || payment < 300,
          secret: data.secret || false,
          icon: data.icon || (fuelType === 'Electric' || fuelType === 'PHEV' ? '⚡' : '🚗'),
          make: data.make || 'Unknown',
          model: data.model || 'Unknown',
          year: data.year || new Date().getFullYear(),
          trim: data.trim || 'Base',
          class: data.class || 'Auto',
          payment: payment,
          term: typeof data.term === 'string' && data.term.includes('mo') ? data.term : `${term} mo`,
          down: down,
          mf: typeof mf === 'number' ? mf.toFixed(5) : mf,
          rv: rvPercent,
          msrp: msrp,
          savings: effectiveSavings,
          dealer: data.dealer || 'Verified Dealer',
          region: data.region || 'California',
          intel: data.intel || '11-Key Lock Verified Deal. No hidden markups.',
          marketAvg: data.marketAvg || Math.round(payment * 1.15),
          incHint: data.incHint || 'Contact us for exact incentives.',
          time: data.time || 1,
          unit: data.unit || 'h',
          dot: data.dot || 'lv',
          isNew: data.isNew !== undefined ? data.isNew : true,
          isFirstTimeBuyerEligible: deal.isFirstTimeBuyerEligible,
          image: imageUrl,
          availableIncentives: data.availableIncentives || [],
          // New fields for detailed deal page
          bodyStyle: bodyStyle,
          fuelType: fuelType,
          driveType: driveType,
          seats: seats,
          efficiency: data.efficiency,
          features: data.features && data.features.length > 0 ? data.features : features,
          featuresRu: data.featuresRu && data.featuresRu.length > 0 ? data.featuresRu : featuresRu,
          categorizedFeatures: data.categorizedFeatures && Object.keys(data.categorizedFeatures).length > 0 ? data.categorizedFeatures : catFeatures.en,
          categorizedFeaturesRu: data.categorizedFeaturesRu && Object.keys(data.categorizedFeaturesRu).length > 0 ? data.categorizedFeaturesRu : catFeatures.ru,
          fuelEconomy: data.fuelEconomy || { city: 25, hwy: 32, combined: 28 },
          ownerVerdict: data.ownerVerdict && Object.keys(data.ownerVerdict).length > 0 ? data.ownerVerdict : verdict.en,
          ownerVerdictRu: data.ownerVerdictRu && Object.keys(data.ownerVerdictRu).length > 0 ? data.ownerVerdictRu : verdict.ru,
          detailedSpecs: data.detailedSpecs && Object.keys(data.detailedSpecs).length > 0 ? data.detailedSpecs : specs,
          detailedSpecsRu: data.detailedSpecsRu && Object.keys(data.detailedSpecsRu).length > 0 ? data.detailedSpecsRu : specsRu
        };
      }).filter(Boolean);

      // Return database deals only, or fallback to static DEALS if empty
      if (mappedDeals.length === 0) {
        res.json(DEALS);
      } else {
        res.json(mappedDeals);
      }
    } catch (error) {
      console.error("Failed to fetch published deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // --- STATIC ASSETS ---
  // Serve public folder at root to ensure /uploads/... paths work correctly
  app.use(express.static(path.join(process.cwd(), 'public')));
  
  // Also keep the explicit /uploads route for backward compatibility if needed
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  // --- VITE MIDDLEWARE / STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
