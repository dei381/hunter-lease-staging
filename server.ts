import { GoogleGenAI } from "@google/genai";
import { NotificationService } from './server/services/NotificationService';
import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "./server/lib/db";
import { adminAuth } from "./server/middleware/auth";
import calculatorAdminRoutes from "./server/routes/calculatorAdminRoutes";
import quoteRoutes from "./server/routes/quoteRoutes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { ExtractionEngine } from "./server/services/ExtractionEngine";
import { CalculationEngine, LeaseCalculationEngine, FinanceCalculationEngine } from "./server/services/CalculationEngine";
import { EligibilityEngine } from "./server/services/EligibilityEngine";
import { FinancialSyncService } from "./server/services/FinancialSyncService";
import { AutoSyncService } from "./server/services/AutoSyncService";
import nodemailer from 'nodemailer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

import { getBodyStyle, getFuelType, getDetailedSpecs, getCategorizedFeatures, getOwnerVerdict } from './server/data/deals';
import { getVal } from './src/utils/finance';

const prisma = db;

// Helper to get CAR_DB from Postgres
const getCarDb = async () => {
  const record = await prisma.siteSettings.findUnique({ where: { id: 'car_db' } });
  return record ? JSON.parse(record.data) : {};
};

// Helper to save CAR_DB to Postgres
const saveCarDb = async (data: any) => {
  try {
    await prisma.siteSettings.upsert({
      where: { id: 'car_db' },
      update: { data: JSON.stringify(data) },
      create: { id: 'car_db', data: JSON.stringify(data) }
    });
  } catch (error) {
    console.error("Failed to save CAR_DB to database:", error);
  }
};

// Helper to get CAR_PHOTOS from Postgres
const getCarPhotos = async () => {
  const record = await prisma.siteSettings.findUnique({ where: { id: 'car_photos' } });
  return record ? JSON.parse(record.data) : [];
};

// Helper to save CAR_PHOTOS to Postgres
const saveCarPhotos = async (data: any[]) => {
  try {
    await prisma.siteSettings.upsert({
      where: { id: 'car_photos' },
      update: { data: JSON.stringify(data) },
      create: { id: 'car_photos', data: JSON.stringify(data) }
    });
  } catch (error) {
    console.error("Failed to save CAR_PHOTOS to database:", error);
  }
};



// Load data from Postgres on startup
const loadDataFromFirestore = async () => {
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

// Security: Rate limiting for ingest endpoint
const ingestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' }
});

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

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16' as any,
});

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

    const carDbCount = await prisma.siteSettings.count({ where: { id: 'car_db' } });
    if (carDbCount === 0) {
      const initialCarDb = {
        makes: [
          {
            name: "Toyota",
            destinationFee: 1095,
            rules: {
              mileageRV: { "7500": 1, "10000": 0, "12000": -1, "15000": -2 },
              tierMF: { "t1": 0, "t2": 0.00020, "t3": 0.00045, "t4": 0.00085 }
            },
            models: [
              {
                name: "Camry",
                trims: [
                  { id: "camry-le-2026", name: "LE (2026)", msrp: 29495, rv36: 58, mf: 0.00210, baseAPR: 4.9, leaseCash: 500 },
                  { id: "camry-se-2026", name: "SE (2026)", msrp: 31795, rv36: 59, mf: 0.00210, baseAPR: 4.9, leaseCash: 500 },
                  { id: "camry-xle-2026", name: "XLE (2026)", msrp: 34495, rv36: 56, mf: 0.00210, baseAPR: 4.9, leaseCash: 500 }
                ]
              },
              {
                name: "RAV4",
                trims: [
                  { id: "rav4-le-2026", name: "LE (2026)", msrp: 29970, rv36: 62, mf: 0.00240, baseAPR: 5.9, leaseCash: 0 },
                  { id: "rav4-xle-2026", name: "XLE (2026)", msrp: 31480, rv36: 61, mf: 0.00240, baseAPR: 5.9, leaseCash: 0 },
                  { id: "rav4-limited-2026", name: "Limited (2026)", msrp: 38275, rv36: 59, mf: 0.00240, baseAPR: 5.9, leaseCash: 0 }
                ]
              },
              {
                name: "Prius",
                trims: [
                  { id: "prius-le-2026", name: "LE (2026)", msrp: 29045, rv36: 63, mf: 0.00220, baseAPR: 4.9, leaseCash: 0 },
                  { id: "prius-xle-2026", name: "XLE (2026)", msrp: 32490, rv36: 61, mf: 0.00220, baseAPR: 4.9, leaseCash: 0 }
                ]
              }
            ]
          },
          {
            name: "BMW",
            destinationFee: 1175,
            rules: {
              mileageRV: { "7500": 1, "10000": 0, "12000": -1, "15000": -3 },
              tierMF: { "t1": 0, "t2": 0.00025, "t3": 0.00060, "t4": 0.00100 }
            },
            models: [
              {
                name: "3 Series",
                trims: [
                  { id: "330i-2026", name: "330i (2026)", msrp: 46675, rv36: 57, mf: 0.00210, baseAPR: 4.9, leaseCash: 1000 },
                  { id: "m340i-2026", name: "M340i (2026)", msrp: 58775, rv36: 55, mf: 0.00210, baseAPR: 4.9, leaseCash: 1000 }
                ]
              },
              {
                name: "5 Series",
                trims: [
                  { id: "530i-2026", name: "530i (2026)", msrp: 59375, rv36: 54, mf: 0.00220, baseAPR: 5.2, leaseCash: 1500 },
                  { id: "i5-edrive40-2026", name: "i5 eDrive40 (2026)", msrp: 68975, rv36: 52, mf: 0.00190, baseAPR: 4.9, leaseCash: 7500 }
                ]
              },
              {
                name: "X5",
                trims: [
                  { id: "x5-40i-2026", name: "sDrive40i (2026)", msrp: 66375, rv36: 54, mf: 0.00210, baseAPR: 4.9, leaseCash: 1000 },
                  { id: "x5-xdrive40i-2026", name: "xDrive40i (2026)", msrp: 68675, rv36: 53, mf: 0.00210, baseAPR: 4.9, leaseCash: 1000 }
                ]
              }
            ]
          },
          {
            name: "Kia",
            destinationFee: 1325,
            rules: {
              mileageRV: { "7500": 1, "10000": 0, "12000": -1, "15000": -3 },
              tierMF: { "t1": 0, "t2": 0.00020, "t3": 0.00050, "t4": 0.00090 }
            },
            models: [
              {
                name: "Sportage",
                trims: [
                  { id: "sportage-lx-2026", name: "LX (2026)", msrp: 28515, rv36: 60, mf: 0.00230, baseAPR: 5.4, leaseCash: 1000 },
                  { id: "sportage-ex-2026", name: "EX (2026)", msrp: 30415, rv36: 59, mf: 0.00230, baseAPR: 5.4, leaseCash: 1000 },
                  { id: "sportage-sx-2026", name: "SX Prestige (2026)", msrp: 35915, rv36: 57, mf: 0.00230, baseAPR: 5.4, leaseCash: 1000 }
                ]
              },
              {
                name: "Telluride",
                trims: [
                  { id: "telluride-s-2026", name: "S (2026)", msrp: 39215, rv36: 64, mf: 0.00260, baseAPR: 6.5, leaseCash: 0 },
                  { id: "telluride-ex-2026", name: "EX (2026)", msrp: 42915, rv36: 62, mf: 0.00260, baseAPR: 6.5, leaseCash: 0 },
                  { id: "telluride-sx-2026", name: "SX (2026)", msrp: 47115, rv36: 60, mf: 0.00260, baseAPR: 6.5, leaseCash: 0 }
                ]
              },
              {
                name: "EV9",
                trims: [
                  { id: "ev9-light-2026", name: "Light RWD (2026)", msrp: 56225, rv36: 55, mf: 0.00050, baseAPR: 2.9, leaseCash: 7500 },
                  { id: "ev9-wind-2026", name: "Wind AWD (2026)", msrp: 65225, rv36: 53, mf: 0.00050, baseAPR: 2.9, leaseCash: 7500 }
                ]
              }
            ]
          }
        ]
      };
      await prisma.siteSettings.create({
        data: {
          id: 'car_db',
          data: JSON.stringify(initialCarDb)
        }
      });
      console.log('Initial CA-specific car database seeded for Toyota, BMW, Kia (March 2026)');
    }

    const dealCount = await prisma.dealRecord.count();
    if (dealCount === 0) {
      const { DEALS } = await import('./server/data/deals');
      for (const deal of DEALS) {
        await prisma.dealRecord.create({
          data: {
            type: deal.type || 'lease',
            publishStatus: 'PUBLISHED',
            reviewStatus: 'APPROVED',
            financialData: JSON.stringify(deal),
            payload: JSON.stringify(deal),
          }
        });
      }
      console.log(`Seeded ${DEALS.length} deals`);
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
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // MVP Calculator Routes
  app.use("/api/v2", quoteRoutes);
  app.use("/api/admin/calculator", calculatorAdminRoutes);

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

  // Lenders Management
  app.get("/api/admin/lenders", adminAuth, async (req, res) => {
    try {
      const lenders = await prisma.lender.findMany({
        include: {
          eligibilityRules: true
        },
        orderBy: { name: 'asc' }
      });
      res.json(lenders);
    } catch (error) {
      console.error("Failed to fetch lenders:", error);
      res.status(500).json({ error: "Failed to fetch lenders" });
    }
  });

  // Lease Programs
  app.get("/api/admin/lenders/:id/lease-programs", adminAuth, async (req, res) => {
    try {
      const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
      if (!activeBatch) return res.json([]);
      
      const programs = await prisma.bankProgram.findMany({
        where: { lenderId: req.params.id, programType: 'LEASE', batchId: activeBatch.id },
        orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }, { term: 'asc' }]
      });
      res.json(programs.map(p => ({
        ...p,
        buyRateMf: p.mf,
        residualPercentage: p.rv,
        internalLenderTier: 'Standard',
        isActive: true
      })));
    } catch (error) {
      console.error("Failed to fetch lease programs:", error);
      res.status(500).json({ error: "Failed to fetch lease programs" });
    }
  });

  app.post("/api/admin/lenders/:id/lease-programs", adminAuth, express.json(), async (req, res) => {
    try {
      let activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
      if (!activeBatch) {
        activeBatch = await prisma.programBatch.create({ data: { status: 'ACTIVE', isValid: true } });
      }
      
      const { make, model, trim, year, term, mileage, buyRateMf, residualPercentage } = req.body;
      const program = await prisma.bankProgram.create({
        data: {
          batchId: activeBatch.id,
          lenderId: req.params.id,
          programType: 'LEASE',
          make, model, trim, year: parseInt(year), term: parseInt(term), mileage: parseInt(mileage),
          mf: parseFloat(buyRateMf), rv: parseFloat(residualPercentage),
          apr: 0,
          rebates: 0
        }
      });
      res.json({
        ...program,
        buyRateMf: program.mf,
        residualPercentage: program.rv,
        internalLenderTier: 'Standard',
        isActive: true
      });
    } catch (error) {
      console.error("Failed to create lease program:", error);
      res.status(500).json({ error: "Failed to create lease program" });
    }
  });

  app.put("/api/admin/lenders/:id/lease-programs/:programId", adminAuth, express.json(), async (req, res) => {
    try {
      const { make, model, trim, year, term, mileage, buyRateMf, residualPercentage } = req.body;
      const program = await prisma.bankProgram.update({
        where: { id: req.params.programId },
        data: {
          make, model, trim, year: parseInt(year), term: parseInt(term), mileage: parseInt(mileage),
          mf: parseFloat(buyRateMf), rv: parseFloat(residualPercentage)
        }
      });
      res.json({
        ...program,
        buyRateMf: program.mf,
        residualPercentage: program.rv,
        internalLenderTier: 'Standard',
        isActive: true
      });
    } catch (error) {
      console.error("Failed to update lease program:", error);
      res.status(500).json({ error: "Failed to update lease program" });
    }
  });

  app.delete("/api/admin/lenders/:id/lease-programs/:programId", adminAuth, async (req, res) => {
    try {
      await prisma.bankProgram.delete({ where: { id: req.params.programId } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete lease program:", error);
      res.status(500).json({ error: "Failed to delete lease program" });
    }
  });

  // Finance Programs
  app.get("/api/admin/lenders/:id/finance-programs", adminAuth, async (req, res) => {
    try {
      const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
      if (!activeBatch) return res.json([]);
      
      const programs = await prisma.bankProgram.findMany({
        where: { lenderId: req.params.id, programType: 'FINANCE', batchId: activeBatch.id },
        orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }, { term: 'asc' }]
      });
      res.json(programs.map(p => ({
        ...p,
        buyRateApr: p.apr,
        internalLenderTier: 'Standard',
        isActive: true
      })));
    } catch (error) {
      console.error("Failed to fetch finance programs:", error);
      res.status(500).json({ error: "Failed to fetch finance programs" });
    }
  });

  app.post("/api/admin/lenders/:id/finance-programs", adminAuth, express.json(), async (req, res) => {
    try {
      let activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
      if (!activeBatch) {
        activeBatch = await prisma.programBatch.create({ data: { status: 'ACTIVE', isValid: true } });
      }
      
      const { make, model, trim, year, term, buyRateApr } = req.body;
      const program = await prisma.bankProgram.create({
        data: {
          batchId: activeBatch.id,
          lenderId: req.params.id,
          programType: 'FINANCE',
          make, model, trim, year: parseInt(year), term: parseInt(term),
          apr: parseFloat(buyRateApr),
          mf: 0, rv: 0, rebates: 0
        }
      });
      res.json({
        ...program,
        buyRateApr: program.apr,
        internalLenderTier: 'Standard',
        isActive: true
      });
    } catch (error) {
      console.error("Failed to create finance program:", error);
      res.status(500).json({ error: "Failed to create finance program" });
    }
  });

  app.put("/api/admin/lenders/:id/finance-programs/:programId", adminAuth, express.json(), async (req, res) => {
    try {
      const { make, model, trim, year, term, buyRateApr } = req.body;
      const program = await prisma.bankProgram.update({
        where: { id: req.params.programId },
        data: {
          make, model, trim, year: parseInt(year), term: parseInt(term),
          apr: parseFloat(buyRateApr)
        }
      });
      res.json({
        ...program,
        buyRateApr: program.apr,
        internalLenderTier: 'Standard',
        isActive: true
      });
    } catch (error) {
      console.error("Failed to update finance program:", error);
      res.status(500).json({ error: "Failed to update finance program" });
    }
  });

  app.delete("/api/admin/lenders/:id/finance-programs/:programId", adminAuth, async (req, res) => {
    try {
      await prisma.bankProgram.delete({ where: { id: req.params.programId } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete finance program:", error);
      res.status(500).json({ error: "Failed to delete finance program" });
    }
  });

  app.post("/api/admin/lenders", adminAuth, express.json(), async (req, res) => {
    try {
      const { name, isCaptive, isFirstTimeBuyerFriendly, eligibilityRules } = req.body;
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: "Name is required" });
      }
      
      const existing = await prisma.lender.findUnique({ where: { name: name.trim() } });
      if (existing) {
        return res.status(400).json({ error: "A bank with this name already exists" });
      }

      const lender = await prisma.lender.create({
        data: { 
          name: name.trim(), 
          isCaptive, 
          isFirstTimeBuyerFriendly,
          eligibilityRules: {
            create: eligibilityRules || []
          }
        },
        include: { eligibilityRules: true }
      });
      res.json(lender);
    } catch (error) {
      console.error("Failed to create lender:", error);
      res.status(500).json({ error: "Failed to create lender" });
    }
  });

  app.put("/api/admin/lenders/:id", adminAuth, express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, isCaptive, isFirstTimeBuyerFriendly, eligibilityRules } = req.body;
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: "Name is required" });
      }

      const existing = await prisma.lender.findFirst({
        where: { name: name.trim(), id: { not: id } }
      });
      if (existing) {
        return res.status(400).json({ error: "A bank with this name already exists" });
      }

      // Delete existing rules and recreate them
      if (eligibilityRules) {
        await prisma.lenderEligibilityRule.deleteMany({
          where: { lenderId: id }
        });
      }

      const lender = await prisma.lender.update({
        where: { id },
        data: { 
          name: name.trim(), 
          isCaptive, 
          isFirstTimeBuyerFriendly,
          ...(eligibilityRules ? {
            eligibilityRules: {
              create: eligibilityRules.map((rule: any) => ({
                make: rule.make,
                model: rule.model || 'ALL',
                dealApplicability: rule.dealApplicability || 'ALL',
                allowFirstTimeBuyer: rule.allowFirstTimeBuyer ?? false,
                allowWithCoSigner: rule.allowWithCoSigner ?? true,
                requiresEstablishedCredit: rule.requiresEstablishedCredit ?? true,
                minUxTierRequired: rule.minUxTierRequired || 't1'
              }))
            }
          } : {})
        },
        include: { eligibilityRules: true }
      });
      res.json(lender);
    } catch (error) {
      console.error("Failed to update lender:", error);
      res.status(500).json({ error: "Failed to update lender" });
    }
  });

  app.delete("/api/admin/lenders/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.lender.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete lender:", error);
      res.status(500).json({ error: "Failed to delete lender" });
    }
  });

  // OEM Incentives Management
  app.get("/api/admin/incentives", adminAuth, async (req, res) => {
    try {
      const incentives = await prisma.oemIncentiveProgram.findMany({
        orderBy: [{ make: 'asc' }, { model: 'asc' }, { name: 'asc' }]
      });
      res.json(incentives);
    } catch (error) {
      console.error("Failed to fetch incentives:", error);
      res.status(500).json({ error: "Failed to fetch incentives" });
    }
  });

  app.post("/api/admin/incentives", adminAuth, express.json(), async (req, res) => {
    try {
      const { name, amountCents, type, dealApplicability, isTaxableCa, exclusiveGroupId, make, model, isActive, effectiveFrom, effectiveTo } = req.body;
      const incentive = await prisma.oemIncentiveProgram.create({
        data: {
          name,
          amountCents: parseInt(amountCents),
          type,
          dealApplicability: dealApplicability || 'ALL',
          isTaxableCa: isTaxableCa ?? true,
          exclusiveGroupId: exclusiveGroupId || null,
          make,
          model: model || null,
          isActive: isActive ?? true,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null
        }
      });
      res.json(incentive);
    } catch (error) {
      console.error("Failed to create incentive:", error);
      res.status(500).json({ error: "Failed to create incentive" });
    }
  });

  app.put("/api/admin/incentives/:id", adminAuth, express.json(), async (req, res) => {
    try {
      const { name, amountCents, type, dealApplicability, isTaxableCa, exclusiveGroupId, make, model, isActive, effectiveFrom, effectiveTo } = req.body;
      const incentive = await prisma.oemIncentiveProgram.update({
        where: { id: req.params.id },
        data: {
          name,
          amountCents: parseInt(amountCents),
          type,
          dealApplicability: dealApplicability || 'ALL',
          isTaxableCa: isTaxableCa ?? true,
          exclusiveGroupId: exclusiveGroupId || null,
          make,
          model: model || null,
          isActive: isActive ?? true,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null
        }
      });
      res.json(incentive);
    } catch (error) {
      console.error("Failed to update incentive:", error);
      res.status(500).json({ error: "Failed to update incentive" });
    }
  });

  app.delete("/api/admin/incentives/:id", adminAuth, async (req, res) => {
    try {
      await prisma.oemIncentiveProgram.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete incentive:", error);
      res.status(500).json({ error: "Failed to delete incentive" });
    }
  });

  // Bulk Edit Endpoints
  app.get("/api/admin/bulk/lease-programs", adminAuth, async (req, res) => {
    try {
      const programs = await prisma.bankProgram.findMany({
        where: { programType: 'LEASE', batch: { status: 'ACTIVE' } },
        include: { lender: true },
        orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }]
      });
      const mapped = programs.map(p => ({
        ...p,
        buyRateMf: p.mf,
        residualPercentage: p.rv,
        internalLenderTier: 'Standard'
      }));
      res.json(mapped);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lease programs" });
    }
  });

  app.put("/api/admin/bulk/lease-programs", adminAuth, express.json(), async (req, res) => {
    try {
      const { updates } = req.body;
      const transactions = updates.map((u: any) => 
        prisma.bankProgram.update({
          where: { id: u.id },
          data: { 
            mf: parseFloat(u.buyRateMf), 
            rv: parseFloat(u.residualPercentage) 
          }
        })
      );
      await prisma.$transaction(transactions);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update lease programs" });
    }
  });

  app.get("/api/admin/bulk/finance-programs", adminAuth, async (req, res) => {
    try {
      const programs = await prisma.bankProgram.findMany({
        where: { programType: 'FINANCE', batch: { status: 'ACTIVE' } },
        include: { lender: true },
        orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }]
      });
      const mapped = programs.map(p => ({
        ...p,
        buyRateApr: p.apr,
        internalLenderTier: 'Standard'
      }));
      res.json(mapped);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch finance programs" });
    }
  });

  app.put("/api/admin/bulk/finance-programs", adminAuth, express.json(), async (req, res) => {
    try {
      const { updates } = req.body;
      const transactions = updates.map((u: any) => 
        prisma.bankProgram.update({
          where: { id: u.id },
          data: { apr: parseFloat(u.buyRateApr) }
        })
      );
      await prisma.$transaction(transactions);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update finance programs" });
    }
  });

  app.put("/api/admin/bulk/incentives", adminAuth, express.json(), async (req, res) => {
    try {
      const { updates } = req.body;
      const transactions = updates.map((u: any) => 
        prisma.oemIncentiveProgram.update({
          where: { id: u.id },
          data: { amountCents: parseInt(u.amountCents) }
        })
      );
      await prisma.$transaction(transactions);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update incentives" });
    }
  });

  app.get("/api/admin/bulk/dealer-discounts", adminAuth, async (req, res) => {
    try {
      const discounts = await prisma.dealerAdjustment.findMany({
        orderBy: [{ make: 'asc' }, { model: 'asc' }]
      });
      res.json(discounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dealer discounts" });
    }
  });

  app.post("/api/admin/bulk/dealer-discounts", adminAuth, express.json(), async (req, res) => {
    try {
      const { make, model, trim, amount, isActive } = req.body;
      const discount = await prisma.dealerAdjustment.create({
        data: { make: make || null, model: model || null, trim: trim || null, amount: parseInt(amount), isActive: isActive ?? true }
      });
      res.json(discount);
    } catch (error) {
      res.status(500).json({ error: "Failed to create dealer discount" });
    }
  });

  app.put("/api/admin/bulk/dealer-discounts", adminAuth, express.json(), async (req, res) => {
    try {
      const { updates } = req.body;
      const transactions = updates.map((u: any) => 
        prisma.dealerAdjustment.update({
          where: { id: u.id },
          data: { amount: parseInt(u.amount), isActive: u.isActive }
        })
      );
      await prisma.$transaction(transactions);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update dealer discounts" });
    }
  });
  
  app.delete("/api/admin/bulk/dealer-discounts/:id", adminAuth, async (req, res) => {
    try {
      await prisma.dealerAdjustment.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete dealer discount" });
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

  // --- CAR DATABASE MANAGEMENT ---
  app.get("/api/admin/cars", adminAuth, async (req, res) => {
    try {
      const carDb = await getCarDb();
      res.json(carDb);
    } catch (error) {
      console.error("Failed to fetch car database:", error);
      res.status(500).json({ error: "Failed to fetch car database" });
    }
  });

  app.put("/api/admin/cars", adminAuth, async (req, res) => {
    try {
      const carDb = await getCarDb();
      const { makes } = req.body;
      if (makes) (carDb as any).makes = makes;
      if ('tiers' in (carDb as any)) delete (carDb as any).tiers;
      
      await saveCarDb(carDb);
      res.json({ message: "Car database updated successfully", data: carDb });
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

      const { make, model } = req.body || {};

      const carDb = await getCarDb();
      const result = await FinancialSyncService.syncFromExternalAPI(apiKey, carDb, make, model);
      
      // Update the carDb object
      Object.assign(carDb, result.updatedDb);
      
      // Persist to Firestore and local JSON
      await saveCarDb(carDb);

      res.json({ 
        message: "External sync completed", 
        stats: result.stats,
        lastSync: (carDb as any).lastGlobalSync 
      });
    } catch (error: any) {
      console.error("External sync failed:", error);
      res.status(502).json({ 
        error: "External sync failed due to upstream API error", 
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

  // Sync Report API
  app.get("/api/admin/sync-report", adminAuth, async (req, res) => {
    try {
      const report = await AutoSyncService.getReport();
      const carDb = await getCarDb();
      const lastSync = (carDb as any).lastGlobalSync;
      
      res.json({
        report,
        lastSync,
        nextSync: lastSync ? new Date(new Date(lastSync).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString() : null,
        isSyncing: (AutoSyncService as any).isSyncing
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch sync report" });
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
      if (!response.ok) {
        throw new Error(`Marketcheck API responded with status: ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Auto-complete failed:", error);
      res.status(502).json({ error: "Upstream API (Marketcheck) failed", details: error.message });
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
  app.get("/api/cars", async (req, res) => {
    try {
      const carDb = await getCarDb();
      res.json(carDb);
    } catch (error) {
      console.error("Failed to fetch car database:", error);
      res.status(500).json({ error: "Failed to fetch car database" });
    }
  });

  // Sync brands from deals to carDb
  app.post("/api/admin/cars/sync-from-deals", adminAuth, async (req, res) => {
    try {
      const deals = await prisma.dealRecord.findMany();
      const carDb = await getCarDb();
      
      if (!carDb.makes) {
        carDb.makes = [];
      }

      let addedMakes = 0;
      let addedModels = 0;

      for (const deal of deals) {
        let payloadData: any = {};
        try {
          payloadData = JSON.parse(deal.payload);
        } catch (e) {
          continue;
        }
        
        const makeName = payloadData.make;
        const modelName = payloadData.model;
        const trimName = payloadData.trim;
        const msrpValue = payloadData.msrp || 0;

        if (!makeName || !modelName) continue;

        const makeId = makeName.toLowerCase().replace(/\s+/g, '-');
        const modelId = modelName.toLowerCase().replace(/\s+/g, '-');

        let make = carDb.makes.find((m: any) => m.id === makeId);
        if (!make) {
          make = {
            id: makeId,
            name: makeName,
            models: [],
            tiers: [
              { id: "t1", label: "Tier 1", score: "740+", aprAdd: 0, mfAdd: 0, cls: "r1" },
              { id: "t2", label: "Tier 2", score: "700–739", aprAdd: 1.5, mfAdd: 0.00040, cls: "r2" },
              { id: "t3", label: "Tier 3", score: "660–699", aprAdd: 4.5, mfAdd: 0.00120, cls: "r3" },
              { id: "t4", label: "Tier 4", score: "620–659", aprAdd: 9.0, mfAdd: 0.00240, cls: "r4" }
            ],
            baseMF: 0.002,
            baseAPR: 6.9
          };
          carDb.makes.push(make);
          addedMakes++;
        }

        let model = make.models.find((m: any) => m.id === modelId);
        if (!model) {
          model = {
            id: modelId,
            name: modelName,
            class: 'Unknown',
            msrpRange: '$30k - $40k',
            years: new Date().getFullYear().toString(),
            mf: 0.00150,
            rv36: 0.60,
            baseAPR: 4.9,
            leaseCash: 0,
            trims: []
          };
          make.models.push(model);
          addedModels++;
        }
        
        if (trimName) {
          const trimExists = model.trims.find((t: any) => t.name === trimName);
          if (!trimExists) {
            model.trims.push({ name: trimName, msrp: msrpValue });
          }
        }
      }

      await saveCarDb(carDb);
      
      res.json({ 
        success: true, 
        message: `Synced ${addedMakes} new makes and ${addedModels} new models from deals.`,
        carDb
      });
    } catch (error) {
      console.error("Failed to sync cars from deals:", error);
      res.status(500).json({ error: "Failed to sync cars from deals" });
    }
  });

  // Cars DB Update
  app.put("/api/cars", adminAuth, async (req, res) => {
    try {
      const carDb = await getCarDb();
      const { makes } = req.body;
      if (makes) (carDb as any).makes = makes;
      if ('tiers' in (carDb as any)) delete (carDb as any).tiers;
      
      await saveCarDb(carDb);
      res.json({ success: true, data: carDb });
    } catch (error) {
      console.error("Failed to update car database:", error);
      res.status(500).json({ error: "Failed to update car database" });
    }
  });

  // --- CAR PHOTO MANAGEMENT ---
  app.get("/api/car-photos", async (req, res) => {
    try {
      const carPhotos = await getCarPhotos();
      res.json(carPhotos);
    } catch (error) {
      console.error("Failed to fetch car photos:", error);
      res.status(500).json({ error: "Failed to fetch car photos" });
    }
  });

  app.post("/api/admin/car-photos/upload", adminAuth, express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { makeId, modelId, year, colorId, isDefault, imageUrl } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ error: "No image URL provided" });
      }

      const carPhotos = await getCarPhotos();

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
        carPhotos.forEach((p: any) => {
          if (p.makeId === makeId && p.modelId === modelId && p.year === newPhoto.year) {
            p.isDefault = false;
          }
        });
      }

      carPhotos.push(newPhoto);
      await saveCarPhotos(carPhotos);

      res.json({ success: true, photo: newPhoto });
    } catch (error) {
      console.error("Failed to upload car photo:", error);
      res.status(500).json({ error: "Failed to upload car photo" });
    }
  });

  app.delete("/api/admin/car-photos/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const carPhotos = await getCarPhotos();
      const photoIndex = carPhotos.findIndex((p: any) => p.id === id);
      
      if (photoIndex === -1) {
        return res.status(404).json({ error: "Photo not found" });
      }

      // We no longer delete the file from disk since it's in Firebase Storage
      // The client should ideally delete it from Firebase Storage, but for now we just remove the metadata
      carPhotos.splice(photoIndex, 1);
      await saveCarPhotos(carPhotos);

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete car photo:", error);
      res.status(500).json({ error: "Failed to delete car photo" });
    }
  });

  app.put("/api/admin/car-photos/:id/default", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const carPhotos = await getCarPhotos();
      const photo = carPhotos.find((p: any) => p.id === id);
      
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      // Unset other defaults for same model/year
      carPhotos.forEach((p: any) => {
        if (p.makeId === photo.makeId && p.modelId === photo.modelId && p.year === photo.year) {
          p.isDefault = false;
        }
      });

      photo.isDefault = true;
      await saveCarPhotos(carPhotos);

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
          tradeInYear: tradeIn?.year ? Number(tradeIn.year) : undefined,
          tradeInMileage: tradeIn?.mileage ? Number(tradeIn.mileage) : undefined,
          tradeInVin: tradeIn?.vin,
          tradeInHasLoan: tradeIn?.hasLoan || false,
          tradeInPayoff: tradeIn?.payoff ? Number(tradeIn.payoff) : undefined,

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
        include: { offers: true },
        orderBy: { createdAt: 'desc' }
      });

      const mappedLeads = leads.map(l => ({
        id: l.id,
        clientName: l.clientName,
        clientPhone: l.clientPhone,
        clientEmail: l.clientEmail,
        status: l.status,
        depositStatus: l.depositStatus,
        depositAmount: l.depositAmount,
        creditConsent: l.creditConsent,
        creditScore: l.creditScore,
        createdAt: l.createdAt.toISOString(),
        offers: l.offers,
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

  app.get("/api/notifications/my", async (req, res) => {
    try {
      const userId = req.headers['x-user-uid'] as string;
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/my/read", async (req, res) => {
    try {
      const userId = req.headers['x-user-uid'] as string;
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating notifications:", error);
      res.status(500).json({ error: "Failed to update notifications" });
    }
  });

  app.post("/api/admin/calculator/bulk-update", adminAuth, async (req, res) => {
    try {
      const { filters, updates } = req.body;
      const userId = req.headers['x-user-uid'] as string;

      // In a real app, we would apply these updates to the database
      // For now, we'll just log the action
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'BULK_UPDATE',
          entity: 'CalculatorPrograms',
          details: JSON.stringify({ filters, updates })
        }
      });

      res.json({ success: true, message: "Bulk update applied successfully" });
    } catch (error) {
      console.error("Error applying bulk update:", error);
      res.status(500).json({ error: "Failed to apply bulk update" });
    }
  });

  app.get("/api/admin/audit-logs", adminAuth, async (req, res) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Dealer Portal Routes
  app.get("/api/dealer/leads", async (req, res) => {
    try {
      const userId = req.headers['x-user-uid'] as string;
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      // In a real app, verify if the user is a dealer
      const leads = await prisma.lead.findMany({
        where: { status: { in: ['new', 'pending'] } },
        orderBy: { createdAt: 'desc' }
      });

      // Anonymize leads
      const anonymizedLeads = leads.map(l => ({
        id: l.id,
        status: l.status,
        createdAt: l.createdAt.toISOString(),
        carMake: l.carMake,
        carModel: l.carModel,
        carYear: l.carYear,
        carTrim: l.carTrim,
        carMsrp: l.carMsrp,
        calcType: l.calcType,
        calcPayment: l.calcPayment,
        calcDown: l.calcDown
      }));

      res.json(anonymizedLeads);
    } catch (error) {
      console.error("Error fetching dealer leads:", error);
      res.status(500).json({ error: "Failed to fetch dealer leads" });
    }
  });

  app.post("/api/dealer/leads/:id/:action", async (req, res) => {
    try {
      const { id, action } = req.params;
      const { vin } = req.body || {};
      const userId = req.headers['x-user-uid'] as string;
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      if (action === 'accept' && !vin) {
        return res.status(400).json({ error: "VIN is required to accept a lead" });
      }

      const newStatus = action === 'accept' ? 'accepted' : 'rejected';

      const updatedLead = await prisma.lead.update({
        where: { id },
        data: { 
          status: newStatus,
          acceptedBy: action === 'accept' ? userId : null,
          vin: action === 'accept' ? vin : null
        }
      });

      // Notify the client
      if (updatedLead.userId && action === 'accept') {
        await prisma.notification.create({
          data: {
            userId: updatedLead.userId,
            title: "Application Accepted",
            message: `Your application for ${updatedLead.carYear} ${updatedLead.carMake} ${updatedLead.carModel} has been accepted by a dealer. Reserved VIN: ${vin}`
          }
        });

        if (updatedLead.clientEmail) {
          await NotificationService.notifyClientStatusChange(
            updatedLead.clientEmail,
            updatedLead.clientPhone || '',
            newStatus,
            `${updatedLead.carYear} ${updatedLead.carMake} ${updatedLead.carModel}`
          );
        }
      }

      res.json({ success: true, status: newStatus });
    } catch (error) {
      console.error(`Error ${req.params.action}ing lead:`, error);
      res.status(500).json({ error: `Failed to ${req.params.action} lead` });
    }
  });

  app.post("/api/leads/:id/complaint", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.headers['x-user-uid'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Create complaint
      await prisma.complaint.create({
        data: {
          leadId: id,
          userId: userId,
          dealerId: lead.acceptedBy,
          reason: reason,
          status: 'open'
        }
      });

      // Update lead status
      await prisma.lead.update({
        where: { id },
        data: { status: 'complaint_opened' }
      });

      // Notify admin
      // In a real app we would send an email/slack to the admin team here

      res.json({ success: true });
    } catch (error) {
      console.error("Error submitting complaint:", error);
      res.status(500).json({ error: "Failed to submit complaint" });
    }
  });

  app.post("/api/dealer/leads/:id/counter", async (req, res) => {
    try {
      const { id } = req.params;
      const { payment, down, alternative, message } = req.body;
      const userId = req.headers['x-user-uid'] as string;
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const offer = await prisma.leadOffer.create({
        data: {
          leadId: id,
          dealerId: userId,
          payment,
          down,
          alternative,
          message,
          status: 'pending'
        }
      });

      // Update lead status
      await prisma.lead.update({
        where: { id },
        data: { status: 'countered' }
      });

      // Notify the client
      if (lead.userId) {
        await prisma.notification.create({
          data: {
            userId: lead.userId,
            title: "New Counter Offer",
            message: `A dealer has sent you a counter offer for your ${lead.carYear} ${lead.carMake} ${lead.carModel}.`
          }
        });

        if (lead.clientEmail) {
          await NotificationService.notifyClientStatusChange(
            lead.clientEmail,
            lead.clientPhone || '',
            'Counter Offer Received',
            `${lead.carYear} ${lead.carMake} ${lead.carModel}`
          );
        }
      }

      res.json({ success: true, offer });
    } catch (error) {
      console.error("Error creating counter offer:", error);
      res.status(500).json({ error: "Failed to create counter offer" });
    }
  });

  // 700Credit Soft Pull
  app.post("/api/700credit/soft-pull", async (req, res) => {
    try {
      const { leadId, firstName, lastName, address, city, state, zip, dob, ssnLast4 } = req.body;
      const userId = req.headers['x-user-uid'] as string;
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // In a real app, we would call the 700Credit API here
      // const creditResponse = await fetch('https://api.700credit.com/v1/softpull', { ... });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock credit score result
      const mockScore = Math.floor(Math.random() * (850 - 600 + 1)) + 600;
      let mockTier = 'Tier 1';
      if (mockScore < 650) mockTier = 'Tier 3';
      else if (mockScore < 700) mockTier = 'Tier 2';

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          creditConsent: true,
          creditScore: mockScore,
          calcTier: mockTier
        }
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SOFT_PULL',
          entity: 'Lead',
          entityId: leadId,
          details: `Soft pull completed. Score: ${mockScore}, Tier: ${mockTier}`
        }
      });

      res.json({ success: true, score: mockScore, tier: mockTier });
    } catch (error) {
      console.error("Error performing soft pull:", error);
      res.status(500).json({ error: "Failed to perform soft pull" });
    }
  });

  // Stripe Deposit Flow
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { leadId } = req.body;
      const userId = req.headers['x-user-uid'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Deposit for ${lead.carYear} ${lead.carMake} ${lead.carModel}`,
                description: 'Lock in your deal with a $95 deposit.',
              },
              unit_amount: 9500, // $95.00
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard`,
        client_reference_id: leadId,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Stripe Webhook
  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // For local testing without webhook secret, we just parse the body
      // In production, use stripe.webhooks.constructEvent
      const payload = req.body.toString();
      event = JSON.parse(payload);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const leadId = session.client_reference_id;

      if (leadId) {
        try {
          const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data: { 
              depositStatus: 'paid',
              depositAmount: session.amount_total,
              depositId: session.id
            }
          });

          if (updatedLead.userId) {
            await prisma.notification.create({
              data: {
                userId: updatedLead.userId,
                title: "Deposit Received",
                message: `We received your $95 deposit for the ${updatedLead.carYear} ${updatedLead.carMake} ${updatedLead.carModel}. A dealer will contact you shortly.`
              }
            });
          }
        } catch (error) {
          console.error("Error updating lead after payment:", error);
        }
      }
    }

    res.json({ received: true });
  });

  app.get("/api/leads", adminAuth, async (req, res) => {
    try {
      const leads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' }
      });
      
      const mappedLeads = leads.map(l => ({
        id: l.id,
        name: l.clientName || l.name,
        email: l.clientEmail || l.email,
        phone: l.clientPhone || l.phone,
        payMethod: l.payMethod,
        paymentName: l.paymentName,
        legalConsent: { tcpa: true, terms: true },
        isFirstTimeBuyer: l.isFirstTimeBuyer,
        hasCosigner: false,
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
        vehicle: { make: l.carMake, model: l.carModel, year: l.carYear, trim: l.carTrim, msrp: l.carMsrp },
        calc: { type: l.calcType, payment: l.calcPayment, down: l.calcDown, tier: l.calcTier, mileage: 10000 },
        status: l.status,
        depositStatus: l.depositStatus,
        depositAmount: l.depositAmount,
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
        return res.status(500).json({ error: "Database error while retrieving API key configuration." });
      }

      extractedData = await ExtractionEngine.extract(req.file.buffer, req.file.mimetype, customApiKey);
        console.log(`Gemini extraction successful for ${ingestionId}:`, JSON.stringify(extractedData).substring(0, 200) + "...");
      } catch (geminiError: any) {
        console.error(`Gemini extraction failed for ${ingestionId}:`, geminiError);
        return res.status(502).json({ 
          error: "Upstream API (Gemini) extraction failed", 
          details: geminiError.message || "Please check your Gemini API key configuration." 
        });
      }

      // 2. Calculate & Evaluate
      console.log(`Evaluating data for ${ingestionId}...`);
      const CAR_DB = await getCarDb();
      const calcResult = CalculationEngine.calculateLease(extractedData, CAR_DB);
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
      const dealsToSync = req.body.deals;
      if (!Array.isArray(dealsToSync)) {
        return res.status(400).json({ error: "Missing or invalid 'deals' array in request body" });
      }

      let createdCount = 0;
      let updatedCount = 0;

      for (const deal of dealsToSync) {
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
        const CAR_DB = await getCarDb();
        const calcResult = CalculationEngine.calculateLease(financialData, CAR_DB);
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

  // Get approved/published deals for Marketplace
  app.get("/api/deals", async (req, res) => {
    try {
      const { term: queryTerm, down: queryDown, mileage: queryMileage, tier: queryTier, displayMode: queryDisplayMode } = req.query;
      
      // Fetch deals that are APPROVED or PUBLISHED from Prisma
      const [dbDeals, CAR_DB, CAR_PHOTOS, settingsRecord] = await Promise.all([
        prisma.dealRecord.findMany({
          where: {
            OR: [
              { reviewStatus: 'APPROVED' },
              { publishStatus: 'PUBLISHED' }
            ]
          },
          include: {
            lender: {
              include: {
                eligibilityRules: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        getCarDb(),
        getCarPhotos(),
        prisma.siteSettings.findUnique({ where: { id: 'global' } })
      ]);

      const settings = settingsRecord ? JSON.parse(settingsRecord.data) : {
        brokerFee: 595,
        taxRateDefault: 8.875,
        dmvFee: 400,
        docFee: 85,
        acquisitionFee: 650
      };

      const acqFeeCents = (settings.acquisitionFee || 650) * 100;
      const docFeeCents = (settings.docFee || 85) * 100;
      const dmvFeeCents = (settings.dmvFee || 400) * 100;
      const brokerFeeCents = (settings.brokerFee || 595) * 100;
      const taxRate = (settings.taxRateDefault || 8.875) / 100;

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
        let term = queryTerm ? parseInt(queryTerm as string, 10) : getVal(data.term, 36);
        let down = queryDown ? parseInt(queryDown as string, 10) : getVal(data.down !== undefined ? data.down : data.dueAtSigning, 3000); // This is total DAS
        let savings = getVal(data.savings, 0);
        let discount = getVal(data.discount, 0);
        let rebates = getVal(data.rebates, 0);

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

        // Apply query adjustments
        if (queryMileage) {
          if (queryMileage === '12k') rv -= 0.01;
          else if (queryMileage === '15k') rv -= 0.03;
          else if (queryMileage === '20k') rv -= 0.05;
          else if (queryMileage === '7.5k') rv += 0.01;
        }

        if (queryTier) {
          if (queryTier === 't2') mf *= 1.1;
          else if (queryTier === 't3') mf *= 1.2;
          else if (queryTier === 't4') mf *= 1.35;
          else if (queryTier === 't5') mf *= 1.5;
          else if (queryTier === 't6') mf *= 1.7;
        }

        // Re-calculate payment based on new DAS logic
        let payment = 0;
        let financePayment = 0;
        
        const lease = LeaseCalculationEngine.calculate({
          msrpCents: msrp * 100,
          sellingPriceCents: (msrp - effectiveSavings - leaseCash - rebates - discount) * 100,
          residualValuePercent: rv > 1 ? rv / 100 : rv,
          moneyFactor: mf,
          term,
          dueAtSigningCents: down * 100,
          acqFeeCents: acqFeeCents,
          docFeeCents: docFeeCents,
          dmvFeeCents: dmvFeeCents,
          brokerFeeCents: brokerFeeCents,
          taxRate: taxRate
        });
        payment = lease.finalPaymentCents / 100;

        let apr = getVal(data.apr, 4.9);
        if (queryTier) {
          if (queryTier === 't2') apr += 1.0;
          else if (queryTier === 't3') apr += 2.5;
          else if (queryTier === 't4') apr += 4.5;
          else if (queryTier === 't5') apr += 7.0;
          else if (queryTier === 't6') apr += 10.0;
        }

        const finance = FinanceCalculationEngine.calculate({
          msrpCents: msrp * 100,
          sellingPriceCents: (msrp - effectiveSavings - (totalGlobalSavings || rebates) - discount) * 100,
          apr,
          term,
          downPaymentCents: down * 100,
          docFeeCents: docFeeCents,
          dmvFeeCents: dmvFeeCents,
          brokerFeeCents: brokerFeeCents,
          taxRate: taxRate
        });
        financePayment = finance.finalPaymentCents / 100;

        // Handle RV percentage vs absolute
        let rvPercent = '0%';
        if (rv > 0) {
          if (rv < 1) {
            rvPercent = (rv * 100).toFixed(0) + '%';
          } else if (rv <= 100) {
            rvPercent = rv.toFixed(0) + '%';
          } else if (msrp > 0) {
            rvPercent = (rv / msrp * 100).toFixed(0) + '%';
          } else {
            rvPercent = rv.toString();
          }
        }

        // Find photo from CAR_PHOTOS if available
        let imageUrl = data.image || null;
        let images: string[] = [];
        if (data.image) {
          images.push(data.image);
        }
        let bodyStyle = data.bodyStyle || 'Auto';
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
              const modelPhotos = CAR_PHOTOS.filter(p => p.makeId === makeObj.id && p.modelId === modelObj.id);
              if (modelPhotos.length > 0) {
                // Sort so default is first
                modelPhotos.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
                images = modelPhotos.map(p => p.imageUrl);
                imageUrl = images[0];
              }
              bodyStyle = getBodyStyle(modelObj.class, modelObj.name);
              fuelType = getFuelType(modelObj.class, data.trim || '');
              seats = (modelObj.class || '').includes('3-Row') || (modelObj.class || '').includes('Minivan') ? 7 : 5;
              
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

        let isFirstTimeBuyerEligible = deal.isFirstTimeBuyerEligible;
        let allowWithCoSigner = true;
        
        // Evaluate based on lender eligibility rules if available
        if ((deal as any).lender && (deal as any).lender.eligibilityRules) {
          const rules = (deal as any).lender.eligibilityRules;
          const make = data.make || '';
          const model = data.model || '';
          const dealType = type.toUpperCase(); // LEASE or FINANCE
          
          // Find the most specific rule
          // 1. Match make, model, and deal type
          // 2. Match make, ALL models, and deal type
          // 3. Match make, model, ALL deal types
          // 4. Match make, ALL models, ALL deal types
          
          let matchedRule = rules.find((r: any) => 
            r.make.toLowerCase() === make.toLowerCase() && 
            r.model.toLowerCase() === model.toLowerCase() && 
            r.dealApplicability === dealType
          );
          
          if (!matchedRule) {
            matchedRule = rules.find((r: any) => 
              r.make.toLowerCase() === make.toLowerCase() && 
              r.model === 'ALL' && 
              r.dealApplicability === dealType
            );
          }
          
          if (!matchedRule) {
            matchedRule = rules.find((r: any) => 
              r.make.toLowerCase() === make.toLowerCase() && 
              r.model.toLowerCase() === model.toLowerCase() && 
              r.dealApplicability === 'ALL'
            );
          }
          
          if (!matchedRule) {
            matchedRule = rules.find((r: any) => 
              r.make.toLowerCase() === make.toLowerCase() && 
              r.model === 'ALL' && 
              r.dealApplicability === 'ALL'
            );
          }
          
          if (matchedRule) {
            isFirstTimeBuyerEligible = matchedRule.allowFirstTimeBuyer;
            allowWithCoSigner = matchedRule.allowWithCoSigner;
          }
        }

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
          financePayment: financePayment,
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
          isFirstTimeBuyerEligible: isFirstTimeBuyerEligible,
          allowWithCoSigner: allowWithCoSigner,
          displayPayment: payment,
          displayType: type,
          image: imageUrl,
          images: images,
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

      // Return database deals only
      res.json(mappedDeals);
    } catch (error) {
      console.error("Failed to fetch published deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const deals = await prisma.dealRecord.findMany({
        where: {
          publishStatus: 'PUBLISHED',
          reviewStatus: 'APPROVED'
        },
        select: { id: true, updatedAt: true }
      });

      const baseUrl = 'https://hunterlease.com';
      const staticUrls = [
        { loc: '/', priority: '1.0', changefreq: 'weekly' },
        { loc: '/deals', priority: '0.9', changefreq: 'daily' },
        { loc: '/privacy', priority: '0.5', changefreq: 'monthly' },
        { loc: '/terms', priority: '0.5', changefreq: 'monthly' },
      ];

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      staticUrls.forEach(url => {
        xml += `  <url>\n    <loc>${baseUrl}${url.loc}</loc>\n    <priority>${url.priority}</priority>\n    <changefreq>${url.changefreq}</changefreq>\n  </url>\n`;
      });

      deals.forEach(deal => {
        xml += `  <url>\n    <loc>${baseUrl}/deal/${deal.id}</loc>\n    <lastmod>${deal.updatedAt.toISOString().split('T')[0]}</lastmod>\n    <priority>0.8</priority>\n    <changefreq>weekly</changefreq>\n  </url>\n`;
      });

      xml += '</urlset>';
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error("Failed to generate sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Chat endpoint for ExpertChat
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, language } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: `You are Hunter, a premium auto lease expert for Hunter Lease. 
          Your goal is to help users understand lease calculations, find hidden markups, and explain why Hunter Lease is the best choice (zero hidden fees, 11-key lock technology).
          Be professional, concise, and helpful. Use the user's language (${language}).
          If they ask about specific deals, refer them to the calculator on the site.`,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message || 'Chat failed' });
    }
  });

  // Audit endpoint for DealAuditor
  app.post("/api/audit", async (req, res) => {
    try {
      const { imagePart, language } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              imagePart,
              { text: `Analyze this car dealer offer/contract. 
              1. Identify the MSRP, Selling Price, and all fees (Doc fee, Acquisition fee, Registration, etc.).
              2. Look for hidden markups or unnecessary add-ons (Paint protection, VIN etching, nitrogen tires, etc.).
              3. Compare the Money Factor/APR if visible to market averages.
              4. Provide a clear summary: Is this a good deal or are there hidden markups?
              5. Give a recommendation on what the user should negotiate.
              6. Generate a 0-100 "Deal Score" where 100 is a perfect wholesale deal and 0 is a total rip-off.
              7. Provide a word-for-word "Negotiation Script" the user can copy-paste to email the dealer.
              
              Respond in ${language === 'ru' ? 'Russian' : 'English'}. 
              Use Markdown for the main analysis. 
              Crucially, include the Deal Score at the very beginning of your response in the format: [SCORE: XX].` }
            ]
          }
        ]
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Audit error:', error);
      res.status(500).json({ error: error.message || 'Audit failed' });
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
    // In production, serve from dist with correct caching headers
    const distPath = path.join(process.cwd(), "dist");
    
    // 1. Assets (JS, CSS, Images with hashes) - Cache for 1 year
    app.use("/assets", express.static(path.join(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
      index: false,
    }));

    // 2. Other static files in dist
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          // 3. HTML - Never cache, always revalidate
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        }
      }
    }));

    app.get("*", (req, res) => {
      // 4. SPA Fallback - Never cache index.html
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
