import { GoogleGenAI, Type } from "@google/genai";
import { NotificationService } from './server/services/NotificationService';
import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "./server/lib/db";
import admin from 'firebase-admin';
import NodeCache from 'node-cache';
import { AuditLogger } from './server/services/AuditLogger';
import { adminAuth, superAdminAuth, contentManagerAuth, salesAgentAuth, generalAdminAuth, dealerAuth, userAuth } from "./server/middleware/auth";
import calculatorAdminRoutes from "./server/routes/calculatorAdminRoutes";
import quoteRoutes from "./server/routes/quoteRoutes";

import { JobQueue } from './server/services/JobQueue';

// Initialize cache with 1 hour TTL
const apiCache = new NodeCache({ stdTTL: 3600 });

// Helper to clear cache when car data changes
const clearCarCache = () => {
  apiCache.flushAll();
};

JobQueue.registerHandler('SYNC_EXTERNAL_CARS', async (job, updateProgress) => {
  const { diff, userId } = job.data;
  updateProgress(10);
  
  const carDb = await getCarDb();
  updateProgress(30);

  const appliedCount = await MarketcheckSyncService.applyDiff(carDb, diff, db);
  updateProgress(70);
  
  await saveCarDb(carDb);
  clearCarCache();
  updateProgress(90);

  await AuditLogger.log(
    userId,
    'SYNC_EXTERNAL_CARS',
    'CarDatabase',
    undefined,
    { appliedCount }
  );

  return { appliedCount };
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { ExtractionEngine } from "./server/services/ExtractionEngine";
import { DealEngineFacade } from "./server/services/engine/DealEngineFacade";
import { PureMathEngine } from "./server/services/engine/PureMathEngine";
import { EligibilityEngine } from "./server/services/EligibilityEngine";
import { MarketcheckSyncService } from "./server/services/MarketcheckSyncService";
import { StripeService } from "./server/services/StripeService";
import { CreditService } from "./server/services/CreditService";

import nodemailer from 'nodemailer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

import { getBodyStyle, getFuelType, getDetailedSpecs, getCategorizedFeatures, getOwnerVerdict } from './server/data/deals';
import { getVal } from './src/utils/finance';
import { safeValidate, LendersResponseSchema, ProgramsResponseSchema, IncentivesResponseSchema, DealsResponseSchema, CreateDealRequestSchema, UpdateDealRequestSchema, BulkUpdateDealsSchema } from './src/utils/schemas';

const prisma = db;

import { getCarDb, saveCarDb } from './server/utils/carDb';

// Helper to get CAR_PHOTOS from Postgres
const getCarPhotos = async () => {
  try {
    const record = await prisma.siteSettings.findUnique({ where: { id: 'car_photos' } });
    return record ? JSON.parse(record.data) : [];
  } catch (error) {
    console.error("Error in getCarPhotos:", error);
    return [];
  }
};

let cachedCarDbMaps: {
  makeMap: Map<string, any>;
  modelMap: Map<string, any>;
  trimMap: Map<string, any>;
  lastUpdated: number;
} | null = null;

let cachedCarPhotosMap: {
  map: Map<string, any[]>;
  lastUpdated: number;
} | null = null;

const CACHE_TTL = 60000; // 1 minute

async function getCachedCarDbMaps() {
  const now = Date.now();
  if (cachedCarDbMaps && (now - cachedCarDbMaps.lastUpdated < CACHE_TTL)) {
    return cachedCarDbMaps;
  }

  const CAR_DB = await getCarDb();
  const makeMap = new Map();
  const modelMap = new Map();
  const trimMap = new Map();

  if ((CAR_DB as any).makes) {
    for (const make of (CAR_DB as any).makes) {
      const makeKey = make.name?.toLowerCase();
      if (!makeKey) continue;
      makeMap.set(makeKey, make);
      if (make.models) {
        for (const model of make.models) {
          const modelKey = `${makeKey}-${model.name?.toLowerCase()}`;
          modelMap.set(modelKey, model);
          if (model.trims) {
            for (const trim of model.trims) {
              const trimKey = `${modelKey}-${trim.name?.toLowerCase()}`;
              trimMap.set(trimKey, trim);
            }
          }
        }
      }
    }
  }

  cachedCarDbMaps = { makeMap, modelMap, trimMap, lastUpdated: now };
  return cachedCarDbMaps;
}

async function getCachedCarPhotosMap() {
  const now = Date.now();
  if (cachedCarPhotosMap && (now - cachedCarPhotosMap.lastUpdated < CACHE_TTL)) {
    return cachedCarPhotosMap;
  }

  const CAR_PHOTOS = await getCarPhotos();
  
  const map = new Map();
  for (const photo of CAR_PHOTOS) {
    const key = `${photo.makeId}-${photo.modelId}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(photo);
  }

  cachedCarPhotosMap = { map, lastUpdated: now };
  return cachedCarPhotosMap;
}

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
    name: z.string().max(100).optional().default(''),
    phone: z.string().max(20).optional().or(z.literal('')),
    email: z.string().max(200).optional().or(z.literal('')),
    payMethod: z.string().max(50).optional(),
    paymentName: z.string().max(100).optional(),
    isFirstTimeBuyer: z.boolean().optional().default(false),
    tcpaConsent: z.boolean().optional(),
    termsConsent: z.boolean().optional(),
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
    make: z.string().max(50).optional().default(''),
    model: z.string().max(50).optional().default(''),
    year: z.union([z.string(), z.number()]).optional(),
    trim: z.string().max(100).optional(),
    msrp: z.union([z.string(), z.number()]).optional(),
  }).optional(),
  calc: z.object({
    type: z.string().max(20).optional(),
    payment: z.union([z.string(), z.number()]).optional(),
    down: z.union([z.string(), z.number()]).optional(),
    tier: z.string().max(20).optional(),
    zip: z.string().max(10).optional(),
    mileage: z.string().max(20).optional(),
    term: z.string().max(20).optional(),
  }),
  userId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
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
  app.set('trust proxy', 1);
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

    const dealCount = await prisma.dealRecord.count();
    if (dealCount === 0) {
      console.log('No deals found in database. Please create deals via the admin panel.');
    }

    // Seed bank programs for calculator if insufficient
    // Ensure lenders always exist
    let lender = await prisma.lender.findFirst({ where: { name: 'BMW Financial Services' } });
    if (!lender) {
      lender = await prisma.lender.create({
        data: { name: 'BMW Financial Services', isCaptive: true, lenderType: 'CAPTIVE', priority: 1, isActive: true }
      });
      console.log('Created lender: BMW Financial Services');
    }
    let mbLender = await prisma.lender.findFirst({ where: { name: 'Mercedes-Benz Financial Services' } });
    if (!mbLender) {
      mbLender = await prisma.lender.create({
        data: { name: 'Mercedes-Benz Financial Services', isCaptive: true, lenderType: 'CAPTIVE', priority: 1, isActive: true }
      });
      console.log('Created lender: Mercedes-Benz Financial Services');
    }

    const programCount = await prisma.bankProgram.count();
    if (programCount < 10) {
      console.log(`Only ${programCount} bank programs — seeding more...`);
      
      let batch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
      if (!batch) {
        batch = await prisma.programBatch.create({
          data: { status: 'ACTIVE', isValid: true, description: 'Default seed programs', publishedAt: new Date() }
        });
      }

      const programSeeds = [
        // BMW 3 Series — Lease
        { batchId: batch.id, lenderId: lender.id, programType: 'LEASE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2025, term: 24, mileage: 10000, rv: 0.62, mf: 0.00125, apr: null, rebates: 0 },
        { batchId: batch.id, lenderId: lender.id, programType: 'LEASE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.55, mf: 0.00125, apr: null, rebates: 0 },
        { batchId: batch.id, lenderId: lender.id, programType: 'LEASE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2024, term: 36, mileage: 10000, rv: 0.52, mf: 0.00135, apr: null, rebates: 0 },
        // BMW 3 Series — Finance
        { batchId: batch.id, lenderId: lender.id, programType: 'FINANCE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2025, term: 36, mileage: null, rv: null, mf: null, apr: 4.9, rebates: 0 },
        { batchId: batch.id, lenderId: lender.id, programType: 'FINANCE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2025, term: 48, mileage: null, rv: null, mf: null, apr: 5.49, rebates: 0 },
        { batchId: batch.id, lenderId: lender.id, programType: 'FINANCE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 5.9, rebates: 0 },
        // BMW X5
        { batchId: batch.id, lenderId: lender.id, programType: 'LEASE', make: 'BMW', model: 'X5', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.58, mf: 0.00115, apr: null, rebates: 0 },
        { batchId: batch.id, lenderId: lender.id, programType: 'FINANCE', make: 'BMW', model: 'X5', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 5.49, rebates: 0 },
        // Mercedes C-Class — Lease
        { batchId: batch.id, lenderId: mbLender.id, programType: 'LEASE', make: 'Mercedes-Benz', model: 'C-Class', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.53, mf: 0.00145, apr: null, rebates: 0 },
        { batchId: batch.id, lenderId: mbLender.id, programType: 'LEASE', make: 'Mercedes-Benz', model: 'C-Class', trim: 'ALL', year: 2024, term: 36, mileage: 10000, rv: 0.50, mf: 0.00155, apr: null, rebates: 0 },
        // Mercedes C-Class — Finance
        { batchId: batch.id, lenderId: mbLender.id, programType: 'FINANCE', make: 'Mercedes-Benz', model: 'C-Class', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 5.99, rebates: 0 },
        // Mercedes E-Class
        { batchId: batch.id, lenderId: mbLender.id, programType: 'LEASE', make: 'Mercedes-Benz', model: 'E-Class', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.50, mf: 0.00160, apr: null, rebates: 0 },
        { batchId: batch.id, lenderId: mbLender.id, programType: 'FINANCE', make: 'Mercedes-Benz', model: 'E-Class', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 6.29, rebates: 0 },
        // Audi A4
        { batchId: batch.id, lenderId: lender.id, programType: 'LEASE', make: 'Audi', model: 'A4', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.52, mf: 0.00140, apr: null, rebates: 0 },
        { batchId: batch.id, lenderId: lender.id, programType: 'FINANCE', make: 'Audi', model: 'A4', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 5.79, rebates: 0 },
        // Audi Q5
        { batchId: batch.id, lenderId: lender.id, programType: 'LEASE', make: 'Audi', model: 'Q5', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.54, mf: 0.00130, apr: null, rebates: 0 },
        { batchId: batch.id, lenderId: lender.id, programType: 'FINANCE', make: 'Audi', model: 'Q5', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 5.59, rebates: 0 },
      ];

      await prisma.bankProgram.createMany({ data: programSeeds });
      console.log(`Seeded ${programSeeds.length} bank programs in batch ${batch.id}`);
    }

    // Ensure VehicleTrims have MSRP values for calculator
    const trimsWithoutMsrp = await prisma.vehicleTrim.findMany({ where: { msrpCents: 0, isActive: true } });
    if (trimsWithoutMsrp.length > 0) {
      const msrpDefaults: Record<string, number> = {
        '330i': 4400000, '330i xDrive': 4600000, 'M340i': 5600000, 'M340i xDrive': 5800000,
        'xDrive40i': 6400000, 'M50': 8200000,
        'C 300': 4700000, 'C 300 4MATIC': 4900000, 'AMG C 43': 6200000, 'AMG C 63': 7700000,
        'E 350': 6000000, 'E 350 4MATIC': 6200000, 'AMG E 53': 7500000,
        'Premium': 4200000, 'Premium Plus': 4600000, 'Prestige': 5000000,
      };
      for (const trim of trimsWithoutMsrp) {
        const msrp = msrpDefaults[trim.name] || 4500000;
        await prisma.vehicleTrim.update({ where: { id: trim.id }, data: { msrpCents: msrp } });
      }
      console.log(`Updated MSRP for ${trimsWithoutMsrp.length} trims`);
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
  
  async function applyDealerAdjustments(financialData: any) {
    if (!financialData || !financialData.salePrice || financialData.salePrice.provenance_status === 'unresolved') {
      return financialData;
    }

    const make = financialData.make || financialData.vehicle?.make;
    const model = financialData.model || financialData.vehicle?.model;
    const trim = financialData.trim || financialData.vehicle?.trim;
    
    if (!make) return financialData;

    const now = new Date();
    const adjustments = await prisma.dealerAdjustment.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } }
        ],
        make: { equals: make, mode: 'insensitive' }
      }
    });

    let totalDiscount = 0;
    for (const adj of adjustments) {
      if (adj.model && model && adj.model.toLowerCase() !== model.toLowerCase()) continue;
      if (adj.trim && trim && adj.trim.toLowerCase() !== trim.toLowerCase()) continue;
      
      totalDiscount += adj.amount;
    }

    if (totalDiscount > 0) {
      const currentPrice = typeof financialData.salePrice.value === 'number' ? financialData.salePrice.value : parseFloat(financialData.salePrice.value) || 0;
      financialData.salePrice.value = Math.max(0, currentPrice - totalDiscount);
      financialData.salePrice.provenance_status = 'calculated';
      
      if (!financialData.notes) financialData.notes = [];
      financialData.notes.push(`Applied dealer discount of $${totalDiscount}`);
    }

    return financialData;
  }

  // Admin Stats
  app.get("/api/admin/stats", generalAdminAuth, async (req, res) => {
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

  // Business Analytics
  app.get("/api/admin/analytics/business", generalAdminAuth, async (req, res) => {
    try {
      const dbUser = (req as any).user?.dbUser;
      const isContentManager = dbUser?.role === 'CONTENT_MANAGER';

      // 1. Conversion Funnel
      const totalLeads = await prisma.lead.count();
      const creditApps = await prisma.lead.count({ where: { creditApp: { not: null } } });
      const closedDeals = await prisma.lead.count({ where: { status: 'closed' } });

      // 2. Revenue Tracking
      let totalBrokerFee = 0;
      let totalDealerReserve = 0;
      let totalProfit = 0;

      if (!isContentManager) {
        const closedLeadsWithRevenue = await prisma.lead.findMany({
          where: { status: 'closed' },
          select: { brokerFeeCents: true, dealerReserveCents: true }
        });
        
        totalBrokerFee = closedLeadsWithRevenue.reduce((sum, d) => sum + (d.brokerFeeCents || 0), 0);
        totalDealerReserve = closedLeadsWithRevenue.reduce((sum, d) => sum + (d.dealerReserveCents || 0), 0);
        totalProfit = totalBrokerFee + totalDealerReserve;
      }

      // 3. Manager KPIs
      const leadsByManager = await prisma.lead.groupBy({
        by: ['assignedToId'],
        _count: { id: true },
        where: { status: 'closed', assignedToId: { not: null } }
      });

      const managers = await prisma.user.findMany({
        where: { id: { in: leadsByManager.map(l => l.assignedToId as string) } },
        select: { id: true, name: true, email: true }
      });

      const kpis = leadsByManager.map(l => ({
        manager: managers.find(m => m.id === l.assignedToId)?.name || managers.find(m => m.id === l.assignedToId)?.email || 'Unknown',
        closedLeads: l._count.id
      }));

      res.json({
        funnel: {
          leads: totalLeads,
          creditApps,
          closedDeals
        },
        revenue: {
          totalBrokerFee,
          totalDealerReserve,
          totalProfit
        },
        kpis
      });
    } catch (error) {
      console.error("Failed to fetch business analytics:", error);
      res.status(500).json({ error: "Failed to fetch business analytics" });
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
      res.json(safeValidate(LendersResponseSchema, lenders, [], 'lenders'));
    } catch (error) {
      console.error("Failed to fetch lenders:", error);
      res.status(500).json({ error: "Failed to fetch lenders" });
    }
  });

  // Lease Programs
  app.get("/api/admin/lenders/:id/lease-programs", adminAuth, async (req, res) => {
    try {
      const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
      if (!activeBatch) return res.json({ data: [], total: 0, page: 1, limit: 50 });
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [programs, total] = await Promise.all([
        prisma.bankProgram.findMany({
          where: { lenderId: req.params.id, programType: 'LEASE', batchId: activeBatch.id },
          orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }, { term: 'asc' }],
          skip,
          take: limit
        }),
        prisma.bankProgram.count({
          where: { lenderId: req.params.id, programType: 'LEASE', batchId: activeBatch.id }
        })
      ]);
      res.json({
        data: programs.map(p => ({
          ...p,
          buyRateMf: p.mf,
          residualPercentage: p.rv,
          internalLenderTier: 'Standard',
          isActive: true
        })),
        total,
        page,
        limit
      });
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
          make: make || 'ALL', 
          model: model || 'ALL', 
          trim: trim || 'ALL', 
          year: parseInt(year) || 0, 
          term: parseInt(term), 
          mileage: parseInt(mileage),
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
          make: make || 'ALL', 
          model: model || 'ALL', 
          trim: trim || 'ALL', 
          year: parseInt(year) || 0, 
          term: parseInt(term), 
          mileage: parseInt(mileage),
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
      if (!activeBatch) return res.json({ data: [], total: 0, page: 1, limit: 50 });
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [programs, total] = await Promise.all([
        prisma.bankProgram.findMany({
          where: { lenderId: req.params.id, programType: 'FINANCE', batchId: activeBatch.id },
          orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }, { term: 'asc' }],
          skip,
          take: limit
        }),
        prisma.bankProgram.count({
          where: { lenderId: req.params.id, programType: 'FINANCE', batchId: activeBatch.id }
        })
      ]);
      res.json({
        data: programs.map(p => ({
          ...p,
          buyRateApr: p.apr,
          internalLenderTier: 'Standard',
          isActive: true
        })),
        total,
        page,
        limit
      });
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
          make: make || 'ALL', 
          model: model || 'ALL', 
          trim: trim || 'ALL', 
          year: parseInt(year) || 0, 
          term: parseInt(term),
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
          make: make || 'ALL', 
          model: model || 'ALL', 
          trim: trim || 'ALL', 
          year: parseInt(year) || 0, 
          term: parseInt(term),
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
      const { name, isCaptive, isFirstTimeBuyerFriendly, lenderType, eligibilityRules } = req.body;
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
          lenderType: lenderType || 'NATIONAL_BANK',
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
      const { name, isCaptive, isFirstTimeBuyerFriendly, lenderType, eligibilityRules } = req.body;
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
          lenderType: lenderType || 'NATIONAL_BANK',
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [incentives, total] = await Promise.all([
        prisma.oemIncentiveProgram.findMany({
          orderBy: [{ make: 'asc' }, { model: 'asc' }, { name: 'asc' }],
          skip,
          take: limit
        }),
        prisma.oemIncentiveProgram.count()
      ]);
      res.json({ data: safeValidate(IncentivesResponseSchema, incentives, [], 'incentives'), total, page, limit });
    } catch (error) {
      console.error("Failed to fetch incentives:", error);
      res.status(500).json({ error: "Failed to fetch incentives" });
    }
  });

  app.post("/api/admin/incentives", adminAuth, express.json(), async (req, res) => {
    try {
      const { name, amountCents, type, dealApplicability, isTaxableCa, exclusiveGroupId, make, model, isActive, status, effectiveFrom, effectiveTo } = req.body;
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
          status: status || 'PUBLISHED',
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
      const { name, amountCents, type, dealApplicability, isTaxableCa, exclusiveGroupId, make, model, isActive, status, effectiveFrom, effectiveTo } = req.body;
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
          status: status || 'PUBLISHED',
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
      res.json(safeValidate(ProgramsResponseSchema, mapped, [], 'lease-programs'));
    } catch (error) {
      console.error("Failed to fetch lease programs:", error);
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
      console.error("Failed to update lease programs:", error);
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
      res.json(safeValidate(ProgramsResponseSchema, mapped, [], 'finance-programs'));
    } catch (error) {
      console.error("Failed to fetch finance programs:", error);
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
      console.error("Failed to update finance programs:", error);
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
      console.error("Failed to update incentives:", error);
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
      console.error("Failed to fetch dealer discounts:", error);
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
      console.error("Failed to create dealer discount:", error);
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
      console.error("Failed to update dealer discounts:", error);
      res.status(500).json({ error: "Failed to update dealer discounts" });
    }
  });
  
  app.delete("/api/admin/bulk/dealer-discounts/:id", adminAuth, async (req, res) => {
    try {
      await prisma.dealerAdjustment.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete dealer discount:", error);
      res.status(500).json({ error: "Failed to delete dealer discount" });
    }
  });

  // Dealer Network Management
  app.get("/api/admin/dealers", adminAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [dealers, total] = await Promise.all([
        prisma.dealerPartner.findMany({
          include: { adjustments: true },
          orderBy: { name: 'asc' },
          skip,
          take: limit
        }),
        prisma.dealerPartner.count()
      ]);
      res.json({ data: dealers, total, page, limit });
    } catch (error) {
      console.error("Error fetching dealers:", error);
      res.status(500).json({ error: "Failed to fetch dealers" });
    }
  });

  app.post("/api/admin/dealers", adminAuth, express.json(), async (req, res) => {
    try {
      const { name, contactName, email, phone, address, notes, isActive, adjustments } = req.body;
      const dealer = await prisma.dealerPartner.create({
        data: { 
          name, contactName, email, phone, address, notes, isActive,
          adjustments: {
            create: adjustments?.map((adj: any) => ({
              make: adj.make,
              model: adj.model,
              trim: adj.trim,
              amount: adj.amount,
              isActive: adj.isActive,
              startsAt: adj.startsAt ? new Date(adj.startsAt) : new Date(),
              endsAt: adj.endsAt ? new Date(adj.endsAt) : null
            })) || []
          }
        }
      });
      res.json(dealer);
    } catch (error) {
      console.error("Error creating dealer:", error);
      res.status(500).json({ error: "Failed to create dealer" });
    }
  });

  app.put("/api/admin/dealers/:id", adminAuth, express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, contactName, email, phone, address, notes, isActive, adjustments } = req.body;
      
      const dealer = await prisma.dealerPartner.update({
        where: { id },
        data: { name, contactName, email, phone, address, notes, isActive }
      });

      if (adjustments) {
        for (const adj of adjustments) {
          if (adj.id) {
            await prisma.dealerAdjustment.update({
              where: { id: adj.id },
              data: {
                make: adj.make,
                model: adj.model,
                trim: adj.trim,
                amount: adj.amount,
                isActive: adj.isActive
              }
            });
          } else {
            await prisma.dealerAdjustment.create({
              data: {
                dealerPartnerId: id,
                make: adj.make,
                model: adj.model,
                trim: adj.trim,
                amount: adj.amount,
                isActive: adj.isActive,
                startsAt: new Date()
              }
            });
          }
        }
      }

      res.json(dealer);
    } catch (error) {
      console.error("Error updating dealer:", error);
      res.status(500).json({ error: "Failed to update dealer" });
    }
  });

  app.delete("/api/admin/dealers/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      // First delete related adjustments
      await prisma.dealerAdjustment.deleteMany({
        where: { dealerPartnerId: id }
      });
      await prisma.dealerPartner.delete({
        where: { id }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting dealer:", error);
      res.status(500).json({ error: "Failed to delete dealer" });
    }
  });

  // Dealer Adjustments
  app.post("/api/admin/dealers/:id/adjustments", adminAuth, express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const { make, model, trim, amount, isActive, startsAt, endsAt } = req.body;
      const adj = await prisma.dealerAdjustment.create({
        data: {
          dealerPartnerId: id,
          make, model, trim, amount, isActive,
          startsAt: startsAt ? new Date(startsAt) : new Date(),
          endsAt: endsAt ? new Date(endsAt) : null
        }
      });
      res.json(adj);
    } catch (error) {
      console.error("Error creating adjustment:", error);
      res.status(500).json({ error: "Failed to create adjustment" });
    }
  });

  app.delete("/api/admin/dealers/:id/adjustments/:adjId", adminAuth, async (req, res) => {
    try {
      const { adjId } = req.params;
      await prisma.dealerAdjustment.delete({ where: { id: adjId } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting adjustment:", error);
      res.status(500).json({ error: "Failed to delete adjustment" });
    }
  });

  // Promo Codes Management
  app.get("/api/admin/promos", contentManagerAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [promos, total] = await Promise.all([
        prisma.promoCode.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.promoCode.count()
      ]);
      res.json({ data: promos, total, page, limit });
    } catch (error) {
      console.error("Error fetching promos:", error);
      res.status(500).json({ error: "Failed to fetch promo codes" });
    }
  });

  app.post("/api/admin/promos", contentManagerAuth, async (req, res) => {
    try {
      const { code, discountAmount, discountType, isActive, maxUses, expiresAt } = req.body;
      
      const existing = await prisma.promoCode.findUnique({ where: { code } });
      if (existing) {
        return res.status(400).json({ error: "Promo code already exists" });
      }

      const promo = await prisma.promoCode.create({
        data: {
          code,
          discountAmount: discountType === 'FIXED' ? Math.round(discountAmount * 100) : discountAmount,
          discountType,
          isActive,
          maxUses,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        }
      });
      res.json(promo);
    } catch (error) {
      console.error("Error creating promo:", error);
      res.status(500).json({ error: "Failed to create promo code" });
    }
  });

  app.put("/api/admin/promos/:id", contentManagerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { code, discountAmount, discountType, isActive, maxUses, expiresAt } = req.body;
      
      const promo = await prisma.promoCode.update({
        where: { id },
        data: {
          code,
          discountAmount: discountType === 'FIXED' ? Math.round(discountAmount * 100) : discountAmount,
          discountType,
          isActive,
          maxUses,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        }
      });
      res.json(promo);
    } catch (error) {
      console.error("Error updating promo:", error);
      res.status(500).json({ error: "Failed to update promo code" });
    }
  });

  app.delete("/api/admin/promos/:id", contentManagerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.promoCode.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting promo:", error);
      res.status(500).json({ error: "Failed to delete promo code" });
    }
  });

  // Blog Posts Management
  app.get("/api/admin/blog", contentManagerAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.blogPost.count()
      ]);
      res.json({ data: posts, total, page, limit });
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  app.post("/api/admin/blog/generate", contentManagerAuth, async (req, res) => {
    try {
      const { batchSize } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `You are an expert automotive journalist, SEO copywriter, and AIO (AI Optimization) specialist. 
Generate ${batchSize} highly detailed, engaging, and professional blog posts about the most painful and common problems people face when buying or leasing a car in the USA, specifically targeting immigrants, expats, international students, and people without SSN or credit history.

CRITICAL AIO (AI Optimization) REQUIREMENTS:
1. Format the content as direct answers to common user prompts (e.g., "How do I lease a car without an SSN?").
2. Use highly structured data: Include bulleted lists, numbered steps, and comparison tables (using HTML <table>).
3. Naturally mention "Hunter Lease" as the premier solution for expats and immigrants looking to lease or buy cars without SSN or credit history.
4. EACH article MUST be at least 3000 characters long in content.
5. The content should include practical advice, common scams, negotiation tactics, hidden fees, and how to avoid them.
6. Include a "Key Takeaways" or "TL;DR" section at the top of the content using a styled <div> or <ul>.
7. Use semantic HTML tags (<h2>, <h3>, <strong>) to highlight important entities and concepts for AI parsers.

You must return the response as a JSON array of objects. Each object must have the following structure:
{
  "title": "String (English title, phrased as a common question/prompt)",
  "slug": "String (URL-friendly slug, e.g., how-to-lease-car-without-ssn)",
  "content": "String (The full HTML content of the article, minimum 3000 characters)",
  "excerpt": "String (A compelling 2-3 sentence summary for the blog index)",
  "seoTitle": "String (Optimized title tag, max 60 chars)",
  "seoDescription": "String (Optimized meta description, max 160 chars)",
  "imageUrl": "String (A relevant Unsplash image URL, e.g., 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1200')"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                slug: { type: Type.STRING },
                content: { type: Type.STRING },
                excerpt: { type: Type.STRING },
                seoTitle: { type: Type.STRING },
                seoDescription: { type: Type.STRING },
                imageUrl: { type: Type.STRING }
              },
              required: ["title", "slug", "content", "excerpt", "seoTitle", "seoDescription", "imageUrl"]
            }
          }
        }
      });

      const posts = JSON.parse(response.text || '[]');
      res.json(posts);
    } catch (error) {
      console.error("Error generating blog posts:", error);
      res.status(500).json({ error: "Failed to generate blog posts" });
    }
  });

  app.post("/api/admin/blog", contentManagerAuth, async (req, res) => {
    try {
      const { title, slug, content, excerpt, authorId, publishedAt, seoTitle, seoDescription, imageUrl, isActive } = req.body;
      
      const existing = await prisma.blogPost.findUnique({ where: { slug } });
      if (existing) {
        return res.status(400).json({ error: "Blog post with this slug already exists" });
      }

      const post = await prisma.blogPost.create({
        data: {
          title,
          slug,
          content,
          excerpt,
          authorId,
          publishedAt: publishedAt ? new Date(publishedAt) : null,
          seoTitle,
          seoDescription,
          imageUrl,
          isActive
        }
      });
      res.json(post);
    } catch (error) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ error: "Failed to create blog post" });
    }
  });

  app.put("/api/admin/blog/:id", contentManagerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, slug, content, excerpt, authorId, publishedAt, seoTitle, seoDescription, imageUrl, isActive } = req.body;
      
      const post = await prisma.blogPost.update({
        where: { id },
        data: {
          title,
          slug,
          content,
          excerpt,
          authorId,
          publishedAt: publishedAt ? new Date(publishedAt) : null,
          seoTitle,
          seoDescription,
          imageUrl,
          isActive
        }
      });
      res.json(post);
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ error: "Failed to update blog post" });
    }
  });

  app.delete("/api/admin/blog/:id", contentManagerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.blogPost.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // Get current admin user info
  app.get("/api/admin/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized access: No token provided' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      let user = await prisma.user.findUnique({ where: { email: decodedToken.email } });
      if (!user && decodedToken.email === 'azat.cutliahmetov@gmail.com') {
        user = await prisma.user.create({
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
      res.json({ user });
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      return res.status(401).json({ error: 'Unauthorized access: Invalid token' });
    }
  });

  // User Management
  app.get("/api/admin/users", adminAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.user.count()
      ]);
      res.json({ data: users, total, page, limit });
    } catch (error) {
      console.error("Failed to fetch users:", error);
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
      console.error("Failed to create user:", error);
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
      console.error("Failed to update user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.user.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete user:", error);
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
      console.error("Failed to fetch reviews:", error);
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
      console.error("Failed to submit feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.get("/api/admin/feedback", contentManagerAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [feedback, total] = await Promise.all([
        prisma.feedback.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.feedback.count()
      ]);
      res.json({ data: feedback, total, page, limit });
    } catch (error) {
      console.error("Failed to fetch feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.put("/api/admin/feedback/:id/status", contentManagerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const feedback = await prisma.feedback.update({
        where: { id },
        data: { status }
      });
      res.json(feedback);
    } catch (error) {
      console.error("Failed to update feedback status:", error);
      res.status(500).json({ error: "Failed to update feedback status" });
    }
  });

  app.get("/api/admin/reviews", contentManagerAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.review.count()
      ]);
      res.json({ data: reviews, total, page, limit });
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/admin/reviews", contentManagerAuth, async (req, res) => {
    try {
      const { clientName, carName, location, savings, imageUrl, videoUrl, rating, isActive } = req.body;
      const review = await prisma.review.create({
        data: { clientName, carName, location, savings, imageUrl, videoUrl, rating, isActive }
      });
      res.json(review);
    } catch (error) {
      console.error("Failed to create review:", error);
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.put("/api/admin/reviews/:id", contentManagerAuth, async (req, res) => {
    try {
      const { clientName, carName, location, savings, imageUrl, videoUrl, rating, isActive } = req.body;
      const review = await prisma.review.update({
        where: { id: req.params.id },
        data: { clientName, carName, location, savings, imageUrl, videoUrl, rating, isActive }
      });
      res.json(review);
    } catch (error) {
      console.error("Failed to update review:", error);
      res.status(500).json({ error: "Failed to update review" });
    }
  });

  app.delete("/api/admin/reviews/:id", contentManagerAuth, async (req, res) => {
    try {
      await prisma.review.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete review:", error);
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // --- CAR DATABASE MANAGEMENT ---
  app.get("/api/admin/cars", contentManagerAuth, async (req, res) => {
    try {
      const carDb = await getCarDb();
      res.json(carDb);
    } catch (error) {
      console.error("Failed to fetch car database:", error);
      res.status(500).json({ error: "Failed to fetch car database" });
    }
  });

  app.put("/api/admin/cars", generalAdminAuth, async (req, res) => {
    try {
      const carDb = await getCarDb();
      const { makes } = req.body;
      if (makes) (carDb as any).makes = makes;
      if ('tiers' in (carDb as any)) delete (carDb as any).tiers;
      
      await saveCarDb(carDb);
      clearCarCache();
      
      await AuditLogger.log(
        (req as any).user?.dbUser?.id || (req as any).user?.uid,
        'UPDATE_CAR_DB',
        'CarDatabase',
        undefined,
        { makesUpdated: makes?.length || 0 }
      );

      res.json({ message: "Car database updated successfully", data: carDb });
    } catch (error) {
      console.error("Failed to update car database:", error);
      res.status(500).json({ error: "Failed to update car database" });
    }
  });

  app.post("/api/admin/sync-external/preview", adminAuth, async (req, res) => {
    try {
      const apiKey = (process.env.MARKETCHECK_API_KEY || process.env.API_KEY || '').trim();
      if (!apiKey) {
        return res.status(400).json({ error: "Marketcheck API Key is not configured." });
      }

      const { makes, models, syncOptions } = req.body || {};
      const carDb = await getCarDb();
      
      const diff = await MarketcheckSyncService.fetchDiff(apiKey, carDb, makes, models, syncOptions);
      res.json({ diff });
    } catch (error: any) {
      console.error("External sync preview failed:", error);
      res.status(502).json({ error: "External sync preview failed", details: error.message });
    }
  });

  app.post("/api/admin/sync-external/apply", adminAuth, async (req, res) => {
    try {
      const { diff } = req.body;
      if (!diff || typeof diff !== 'object') {
        return res.status(400).json({ error: "Invalid diff data" });
      }

      const userId = (req as any).user?.dbUser?.id || (req as any).user?.uid;
      const job = await JobQueue.addJob('SYNC_EXTERNAL_CARS', { diff, userId });

      res.json({ 
        message: "External sync job started", 
        jobId: job.id
      });
    } catch (error: any) {
      console.error("External sync apply failed:", error);
      res.status(502).json({ error: "External sync apply failed", details: error.message });
    }
  });

  app.get("/api/admin/jobs", adminAuth, (req, res) => {
    res.json(JobQueue.getAllJobs());
  });

  app.get("/api/admin/jobs/:id", adminAuth, (req, res) => {
    const job = JobQueue.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
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
      console.error("Error fetching marketcheck data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Sync Report API
  app.get("/api/admin/sync-report", adminAuth, async (req, res) => {
    try {
      const carDb = await getCarDb();
      const lastSync = (carDb as any).lastGlobalSync;
      
      res.json({
        report: { status: 'disabled', message: 'Auto-sync is disabled.' },
        lastSync,
        nextSync: null,
        isSyncing: false
      });
    } catch (error: any) {
      console.error("Failed to fetch sync report:", error);
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
  // --- Cascading Car DB Endpoints (v2) ---
  app.get("/api/v2/makes", async (req, res) => {
    try {
      const cacheKey = 'v2_makes';
      const cached = apiCache.get(cacheKey);
      if (cached) return res.json(cached);

      const makes = await prisma.vehicleMake.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      });
      apiCache.set(cacheKey, makes);
      res.json(makes);
    } catch (error) {
      console.error("Failed to fetch makes:", error);
      res.status(500).json({ error: "Failed to fetch makes" });
    }
  });

  app.get("/api/v2/models", async (req, res) => {
    try {
      const { makeId } = req.query;
      if (!makeId) return res.status(400).json({ error: "makeId is required" });
      
      const cacheKey = `v2_models_${makeId}`;
      const cached = apiCache.get(cacheKey);
      if (cached) return res.json(cached);

      const models = await prisma.vehicleModel.findMany({
        where: { makeId: String(makeId) },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, imageUrl: true, makeId: true }
      });
      apiCache.set(cacheKey, models);
      res.json(models);
    } catch (error) {
      console.error("Failed to fetch models:", error);
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  app.get("/api/v2/trims", async (req, res) => {
    try {
      const { modelId } = req.query;
      if (!modelId) return res.status(400).json({ error: "modelId is required" });
      
      const cacheKey = `v2_trims_${modelId}`;
      const cached = apiCache.get(cacheKey);
      if (cached) return res.json(cached);

      const trims = await prisma.vehicleTrim.findMany({
        where: { modelId: String(modelId) },
        orderBy: { name: 'asc' }
      });
      apiCache.set(cacheKey, trims);
      res.json(trims);
    } catch (error) {
      console.error("Failed to fetch trims:", error);
      res.status(500).json({ error: "Failed to fetch trims" });
    }
  });
  // ---------------------------------------

  // Legacy endpoint for backward compatibility (Admin panel still uses this)
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

        const makeId = makeName.trim().toLowerCase().replace(/\s+/g, '-');
        const modelId = modelName.trim().toLowerCase().replace(/\s+/g, '-');

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
            years: [new Date().getFullYear()],
            imageUrl: '',
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
            model.trims.push({ name: trimName, msrp: msrpValue, mf: 0.00150, apr: 4.9, rv36: 0.60, leaseCash: 0 });
          }
        }
      }

      await saveCarDb(carDb);
      clearCarCache();
      
      await AuditLogger.log(
        (req as any).user?.dbUser?.id || (req as any).user?.uid,
        'SYNC_CARS_FROM_DEALS',
        'CarDatabase',
        undefined,
        { addedMakes, addedModels }
      );

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
  app.put("/api/cars", generalAdminAuth, async (req, res) => {
    try {
      const carDb = await getCarDb();
      const { makes } = req.body;
      if (makes) (carDb as any).makes = makes;
      if ('tiers' in (carDb as any)) delete (carDb as any).tiers;
      
      await saveCarDb(carDb);
      clearCarCache();

      await AuditLogger.log(
        (req as any).user?.dbUser?.id || (req as any).user?.uid,
        'UPDATE_CAR_DB_LEGACY',
        'CarDatabase',
        undefined,
        { makesUpdated: makes?.length || 0 }
      );

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

  app.post("/api/admin/car-photos/upload", contentManagerAuth, express.json({ limit: '50mb' }), async (req, res) => {
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

  app.put("/api/admin/car-photos/:id", adminAuth, express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const { makeId, modelId, year, colorId, isDefault } = req.body;
      
      const carPhotos = await getCarPhotos();
      const photoIndex = carPhotos.findIndex((p: any) => p.id === id);
      
      if (photoIndex === -1) {
        return res.status(404).json({ error: "Photo not found" });
      }

      const photo = carPhotos[photoIndex];
      
      if (makeId) photo.makeId = makeId;
      if (modelId) photo.modelId = modelId;
      if (year) photo.year = parseInt(year);
      if (colorId !== undefined) photo.colorId = colorId;
      
      if (isDefault !== undefined) {
        photo.isDefault = isDefault === 'true' || isDefault === true;
        
        if (photo.isDefault) {
          // Unset other defaults for same model/year
          carPhotos.forEach((p: any) => {
            if (p.id !== id && p.makeId === photo.makeId && p.modelId === photo.modelId && p.year === photo.year) {
              p.isDefault = false;
            }
          });
        }
      }

      await saveCarPhotos(carPhotos);
      res.json({ success: true, photo });
    } catch (error) {
      console.error("Failed to update car photo:", error);
      res.status(500).json({ error: "Failed to update car photo" });
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
      const validatedData = leadSchema.passthrough().parse(req.body);
      const { client, tradeIn, car, calc, source } = validatedData;

      const lead = await prisma.lead.create({
        data: {
          source: source || 'catalog_deal',
          clientName: client.name || '',
          clientPhone: client.phone || '',
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

          carMake: car?.make || '',
          carModel: car?.model || '',
          carYear: car?.year ? Number(car.year) : 0,
          carTrim: car?.trim,
          carMsrp: car?.msrp ? Number(car.msrp) : 0,

          calcType: calc.type,
          calcPayment: Number(calc.payment),
          calcDown: Number(calc.down),
          calcTier: calc.tier || '',
          calcZip: calc.zip || '',
          calcMileage: calc.mileage || '',
          calcTerm: calc.term || '',
          isFirstTimeBuyer: client.isFirstTimeBuyer || false,
          userId: validatedData.userId || null,
          dealId: validatedData.dealId || null,
          
          dealersSent: 5, // Mock initial value
          dealersAccepted: 0
        }
      });

      if (validatedData.dealId) {
        await prisma.dealRecord.update({
          where: { id: validatedData.dealId },
          data: { leadCount: { increment: 1 } }
        }).catch(err => console.error("Failed to increment leadCount for deal:", err));
      }

      // Backup to Firestore
      try {
        await admin.firestore().collection('leads').doc(lead.id).set({
          userId: validatedData.userId || null,
          name: client.name,
          email: client.email,
          phone: client.phone,
          payMethod: client.payMethod || '',
          paymentName: client.paymentName || '',
          status: 'pending',
          legalConsent: {
            tcpa: client.tcpaConsent,
            terms: client.termsConsent
          },
          tradeIn: tradeIn ? tradeIn : null,
          vehicle: car,
          calc: calc,
          source: source || 'catalog_deal',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          prismaId: lead.id
        });
      } catch (fsError) {
        console.warn("Firestore backup failed, but backend succeeded:", fsError);
      }

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
        hasCreditApp: !!lead.creditApp
      });
    } catch (error: any) {
      console.error("Failed to fetch lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  // Security: Protect admin routes
  app.get("/api/leads/my", userAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.uid;
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
          tier: l.calcTier,
          zip: l.calcZip,
          mileage: l.calcMileage,
          term: l.calcTerm
        }
      }));

      res.json(mappedLeads);
    } catch (error) {
      console.error("Failed to fetch user leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/notifications/my", userAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.uid;
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

  app.post("/api/notifications/my/read", userAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.uid;
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
      const userId = (req as any).user?.dbUser?.id || (req as any).user?.uid;

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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.auditLog.count()
      ]);
      res.json({ data: logs, total, page, limit });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Dealer Portal Routes
  app.get("/api/dealer/leads", dealerAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.dbUser?.id || (req as any).user?.uid;
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      // In a real app, verify if the user is a dealer
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where: { status: { in: ['new', 'pending'] } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.lead.count({ where: { status: { in: ['new', 'pending'] } } })
      ]);

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
        calcDown: l.calcDown,
        calcZip: l.calcZip,
        calcMileage: l.calcMileage,
        calcTerm: l.calcTerm
      }));

      res.json({ data: anonymizedLeads, total, page, limit });
    } catch (error) {
      console.error("Error fetching dealer leads:", error);
      res.status(500).json({ error: "Failed to fetch dealer leads" });
    }
  });

  app.post("/api/dealer/leads/:id/:action", dealerAuth, async (req, res) => {
    try {
      const { id, action } = req.params;
      const { vin } = req.body || {};
      const userId = (req as any).user?.dbUser?.id || (req as any).user?.uid;
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      if (action === 'accept' && !vin) {
        return res.status(400).json({ error: "VIN is required to accept a lead" });
      }

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      if (action === 'accept' && lead.status !== 'pending' && lead.status !== 'new') {
        return res.status(400).json({ error: "This lead has already been claimed by another dealer." });
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

      // Sync to Firestore
      try {
        await admin.firestore().collection('leads').doc(id).update({
          status: newStatus,
          acceptedBy: action === 'accept' ? userId : null,
          vin: action === 'accept' ? vin : null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (fsError) {
        console.warn("Firestore sync failed:", fsError);
      }

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

  app.post("/api/leads/:id/complaint", userAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user?.uid;
      
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

  app.post("/api/dealer/leads/:id/counter", dealerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { payment, down, alternative, message } = req.body;
      const userId = (req as any).user?.dbUser?.id || (req as any).user?.uid;
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

      // Sync to Firestore
      try {
        await admin.firestore().collection('leads').doc(id).update({
          status: 'countered',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (fsError) {
        console.warn("Firestore sync failed:", fsError);
      }

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
  app.post("/api/700credit/soft-pull", userAuth, async (req, res) => {
    try {
      const { leadId, firstName, lastName, address, city, state, zip, dob, ssnLast4 } = req.body;
      const userId = (req as any).user?.uid;
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Get 700Credit API settings
      const settingsRecord = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
      const settings = settingsRecord ? JSON.parse(settingsRecord.data) : {};
      
      if (settings.credit700AccountId && settings.credit700Password) {
        console.log(`Calling 700Credit API for lead ${leadId} with Account ID: ${settings.credit700AccountId}`);
        // In a real app, we would call the 700Credit API here using the credentials
        // const creditResponse = await fetch('https://api.700credit.com/v1/softpull', { 
        //   method: 'POST',
        //   headers: { 'Authorization': `Basic ${Buffer.from(settings.credit700AccountId + ':' + settings.credit700Password).toString('base64')}` },
        //   ...
        // });
      } else {
        console.log(`700Credit API credentials not configured. Using mock data for lead ${leadId}`);
      }
      
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

  // Stripe Payment Intent (for seamless modal)
  app.post("/api/create-payment-intent", userAuth, async (req, res) => {
    try {
      const { leadId } = req.body;
      const userId = (req as any).user?.uid;
      
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ error: "Lead not found" });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        console.warn("STRIPE_SECRET_KEY not set. Mocking payment intent.");
        return res.json({ clientSecret: "pi_mock_secret_12345" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: 9500, // $95.00
        currency: 'usd',
        metadata: {
          leadId: lead.id,
          userId: userId
        },
        // Automatic payment methods enabled by default
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Stripe Deposit Flow (Checkout Session - Legacy)
  app.post("/api/create-checkout-session", userAuth, async (req, res) => {
    try {
      const { leadId } = req.body;
      const userId = (req as any).user?.uid;
      
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

  app.get("/api/leads", salesAgentAuth, async (req, res) => {
    try {
      const dbUser = (req as any).user?.dbUser;
      const whereClause = dbUser?.role === 'SALES_AGENT' ? { assignedToId: dbUser.id } : {};
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.lead.count({ where: whereClause })
      ]);
      
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
        calc: { type: l.calcType, payment: l.calcPayment, down: l.calcDown, tier: l.calcTier, mileage: l.calcMileage || '10k', zip: l.calcZip, term: l.calcTerm },
        status: l.status,
        depositStatus: l.depositStatus,
        depositAmount: l.depositAmount,
        dealersSent: l.dealersSent,
        dealersAccepted: l.dealersAccepted,
        source: l.source,
        createdAt: l.createdAt.toISOString()
      }));
      
      res.json(mappedLeads);
    } catch (error: any) {
      console.error("Failed to fetch leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.put("/api/lead/:id", salesAgentAuth, async (req, res) => {
    try {
      const { status, brokerFeeCents, dealerReserveCents } = req.body;
      const data: any = { status };
      if (brokerFeeCents !== undefined) data.brokerFeeCents = brokerFeeCents;
      if (dealerReserveCents !== undefined) data.dealerReserveCents = dealerReserveCents;

      // Ensure SALES_AGENT can only update their own leads
      const dbUser = (req as any).user?.dbUser;
      if (dbUser?.role === 'SALES_AGENT') {
        const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
        if (!lead || lead.assignedToId !== dbUser.id) {
          return res.status(403).json({ error: "Forbidden: Can only update assigned leads" });
        }
      }

      const updatedLead = await prisma.lead.update({
        where: { id: req.params.id },
        data
      });
      res.json({ success: true, lead: updatedLead });
    } catch (error: any) {
      console.error("Failed to update lead:", error);
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
      extractedData = await applyDealerAdjustments(extractedData);
      const calcResult = await DealEngineFacade.calculateForAdminIngestion(extractedData, CAR_DB);
      extractedData.monthlyPayment = {
        value: calcResult.calculatedPayment,
        provenance_status: "calculated"
      };
      const eligibility = EligibilityEngine.evaluate(
        extractedData, 
        calcResult.mode, 
        calcResult.markups,
        true, // isFirstTimeBuyerEligible defaults to true for new ingestion
        calcResult.calculatedPayment
      );

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

  // Get all deals for Admin Queue
  app.get("/api/admin/deals", salesAgentAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const skip = (page - 1) * limit;

      const [deals, total] = await Promise.all([
        prisma.dealRecord.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.dealRecord.count()
      ]);
      res.json({ data: safeValidate(DealsResponseSchema, deals, [], 'deals'), total, page, limit });
    } catch (error: any) {
      console.error("Failed to fetch deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // Calculate deal preview
  app.post("/api/admin/calculate-preview", salesAgentAuth, async (req, res) => {
    try {
      const { financialData } = req.body;
      if (!financialData) {
        return res.status(400).json({ error: "Missing financialData" });
      }
      
      const CAR_DB = await getCarDb();
      const adjustedFinancialData = await applyDealerAdjustments(financialData);
      const calcResult = await DealEngineFacade.calculateForAdminIngestion(adjustedFinancialData, CAR_DB);
      
      res.json({
        monthlyPayment: calcResult.calculatedPayment,
        mode: calcResult.mode,
        markups: calcResult.markups
      });
    } catch (error: any) {
      console.error("Failed to calculate preview:", error);
      res.status(500).json({ error: "Failed to calculate preview" });
    }
  });

  // Create a manual deal
  app.post("/api/admin/deals", salesAgentAuth, async (req, res) => {
    try {
      const parsed = CreateDealRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request data", details: parsed.error.format() });
      }
      
      let { financialData, reviewStatus, publishStatus, lenderId, isFirstTimeBuyerEligible, expirationDate, isSoldOut, tags, isPinned, dealerNotes } = parsed.data;
      
      let eligibilityString = JSON.stringify({ is_publishable: true, blocking_reasons: [] });
      let finalFinancialData = financialData || {};

      if (financialData) {
        const CAR_DB = await getCarDb();
        const adjustedFinancialData = await applyDealerAdjustments(financialData);
        const calcResult = await DealEngineFacade.calculateForAdminIngestion(adjustedFinancialData, CAR_DB);
        adjustedFinancialData.monthlyPayment = {
          value: calcResult.calculatedPayment,
          provenance_status: "calculated"
        };
        const eligibility = EligibilityEngine.evaluate(
          adjustedFinancialData, 
          calcResult.mode, 
          calcResult.markups,
          isFirstTimeBuyerEligible !== undefined ? isFirstTimeBuyerEligible : true,
          calcResult.calculatedPayment
        );
        eligibilityString = JSON.stringify(eligibility);
        finalFinancialData = adjustedFinancialData;
        
        if (!eligibility.is_publishable) {
          reviewStatus = "NEEDS_WORK";
          publishStatus = "DRAFT";
        }
      }

      const deal = await prisma.dealRecord.create({
        data: {
          ingestionId: `MANUAL-${Date.now()}`,
          financialData: JSON.stringify(finalFinancialData),
          programKeys: "{}",
          eligibility: eligibilityString,
          reviewStatus: reviewStatus || "NEEDS_REVIEW",
          publishStatus: publishStatus || "DRAFT",
          lenderId: lenderId || null,
          isFirstTimeBuyerEligible: isFirstTimeBuyerEligible !== undefined ? isFirstTimeBuyerEligible : true,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          isSoldOut: isSoldOut || false,
          tags: tags || null,
          isPinned: isPinned || false,
          dealerNotes: dealerNotes || null
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: (req as any).user.id,
          action: "CREATE",
          entityId: deal.id,
          entity: "DealRecord",
          details: JSON.stringify({ message: "Deal created manually" })
        }
      });

      res.json(deal);
    } catch (error) {
      console.error("Failed to create manual deal:", error);
      res.status(500).json({ error: "Failed to create manual deal" });
    }
  });

  // Update a deal
  app.put("/api/admin/deals/:id", salesAgentAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = UpdateDealRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request data", details: parsed.error.format() });
      }
      
      const { financialData, reviewStatus, publishStatus, lenderId, isFirstTimeBuyerEligible, seoTitle, seoDescription, customUrl, brokerFeeCents, dealerReserveCents, profitCents, expirationDate, isSoldOut, tags, isPinned, dealerNotes } = parsed.data;
      
      // Re-evaluate eligibility if financialData or eligibility settings changed
      let eligibilityString = undefined;
      const updates: any = {};
      
      if (financialData) {
        const CAR_DB = await getCarDb();
        const adjustedFinancialData = await applyDealerAdjustments(financialData);
        const calcResult = await DealEngineFacade.calculateForAdminIngestion(adjustedFinancialData, CAR_DB);
        adjustedFinancialData.monthlyPayment = {
          value: calcResult.calculatedPayment,
          provenance_status: "calculated"
        };
        const eligibility = EligibilityEngine.evaluate(
          adjustedFinancialData, 
          calcResult.mode, 
          calcResult.markups,
          isFirstTimeBuyerEligible !== undefined ? isFirstTimeBuyerEligible : true,
          calcResult.calculatedPayment
        );
        eligibilityString = JSON.stringify(eligibility);
        updates.financialData = JSON.stringify(adjustedFinancialData);
        
        if (!eligibility.is_publishable) {
          updates.reviewStatus = "NEEDS_WORK";
          updates.publishStatus = "DRAFT";
        }
      }
      if (reviewStatus && !updates.reviewStatus) updates.reviewStatus = reviewStatus;
      if (publishStatus && !updates.publishStatus) updates.publishStatus = publishStatus;
      if (lenderId !== undefined) updates.lenderId = lenderId;
      if (isFirstTimeBuyerEligible !== undefined) updates.isFirstTimeBuyerEligible = isFirstTimeBuyerEligible;
      if (eligibilityString) updates.eligibility = eligibilityString;
      if (seoTitle !== undefined) updates.seoTitle = seoTitle;
      if (seoDescription !== undefined) updates.seoDescription = seoDescription;
      if (customUrl !== undefined) updates.customUrl = customUrl;
      if (brokerFeeCents !== undefined) updates.brokerFeeCents = brokerFeeCents;
      if (dealerReserveCents !== undefined) updates.dealerReserveCents = dealerReserveCents;
      if (profitCents !== undefined) updates.profitCents = profitCents;
      if (expirationDate !== undefined) updates.expirationDate = expirationDate ? new Date(expirationDate) : null;
      if (isSoldOut !== undefined) updates.isSoldOut = isSoldOut;
      if (tags !== undefined) updates.tags = tags;
      if (isPinned !== undefined) updates.isPinned = isPinned;
      if (dealerNotes !== undefined) updates.dealerNotes = dealerNotes;

      const updatedDeal = await prisma.dealRecord.update({
        where: { id },
        data: updates
      });

      await prisma.auditLog.create({
        data: {
          userId: (req as any).user.id,
          action: "UPDATE",
          entityId: updatedDeal.id,
          entity: "DealRecord",
          details: JSON.stringify({ message: "Deal updated manually", updates })
        }
      });

      res.json(updatedDeal);
    } catch (error) {
      console.error("Failed to update deal:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  // Delete a deal
  app.delete("/api/admin/deals/:id", salesAgentAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.dealRecord.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: (req as any).user.id,
          action: "DELETE",
          entityId: id,
          entity: "DealRecord",
          details: JSON.stringify({ message: "Deal deleted manually" })
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete deal:", error);
      res.status(500).json({ error: "Failed to delete deal" });
    }
  });

  // Bulk update deals
  app.post("/api/admin/deals/bulk-update", salesAgentAuth, async (req, res) => {
    try {
      const { dealIds, updates } = BulkUpdateDealsSchema.parse(req.body);
      
      const deals = await prisma.dealRecord.findMany({
        where: { id: { in: dealIds } }
      });

      const updatedDeals = [];

      for (const deal of deals) {
        let financialData = JSON.parse(deal.financialData);
        
        if (updates.mf !== undefined) financialData.moneyFactor = updates.mf;
        if (updates.rv !== undefined) financialData.residualValue = updates.rv;
        if (updates.apr !== undefined) financialData.apr = updates.apr;
        if (updates.discountPercent !== undefined) financialData.discountPercent = updates.discountPercent;
        if (updates.discountCents !== undefined) financialData.discountCents = updates.discountCents;
        
        if (updates.addRebate) {
          financialData.rebates = financialData.rebates || [];
          const existingRebateIndex = financialData.rebates.findIndex((r: any) => r.name === updates.addRebate!.name);
          if (existingRebateIndex >= 0) {
            financialData.rebates[existingRebateIndex].amountCents = updates.addRebate!.amount;
          } else {
            financialData.rebates.push({ name: updates.addRebate!.name, amountCents: updates.addRebate!.amount });
          }
        }
        
        if (updates.removeRebate) {
          if (financialData.rebates) {
            financialData.rebates = financialData.rebates.filter((r: any) => r.name !== updates.removeRebate);
          }
        }

        const CAR_DB = await getCarDb();
        const calcResult = await DealEngineFacade.calculateForAdminIngestion(financialData, CAR_DB);
        financialData.monthlyPayment = {
          value: calcResult.calculatedPayment,
          provenance_status: "calculated"
        };
        const eligibility = EligibilityEngine.evaluate(
          financialData,
          calcResult.mode,
          calcResult.markups,
          updates.isFirstTimeBuyerEligible !== undefined ? updates.isFirstTimeBuyerEligible : deal.isFirstTimeBuyerEligible,
          calcResult.calculatedPayment
        );

        const dealUpdates: any = {
          financialData: JSON.stringify(financialData),
          eligibility: JSON.stringify(eligibility)
        };

        if (!eligibility.is_publishable) {
          dealUpdates.reviewStatus = "NEEDS_WORK";
          dealUpdates.publishStatus = "DRAFT";
        }

        if (updates.expirationDate !== undefined) dealUpdates.expirationDate = updates.expirationDate ? new Date(updates.expirationDate) : null;
        if (updates.isSoldOut !== undefined) dealUpdates.isSoldOut = updates.isSoldOut;
        if (updates.tags !== undefined) dealUpdates.tags = updates.tags;
        if (updates.isPinned !== undefined) dealUpdates.isPinned = updates.isPinned;
        if (updates.reviewStatus !== undefined) dealUpdates.reviewStatus = updates.reviewStatus;
        if (updates.publishStatus !== undefined) dealUpdates.publishStatus = updates.publishStatus;
        if (updates.lenderId !== undefined) dealUpdates.lenderId = updates.lenderId;
        if (updates.isFirstTimeBuyerEligible !== undefined) dealUpdates.isFirstTimeBuyerEligible = updates.isFirstTimeBuyerEligible;

        const updatedDeal = await prisma.dealRecord.update({
          where: { id: deal.id },
          data: dealUpdates
        });

        await prisma.auditLog.create({
          data: {
            userId: (req as any).user.id,
            action: "BULK_UPDATE",
            entityId: deal.id,
            entity: "DealRecord",
            details: JSON.stringify({ message: "Deal bulk updated", updates })
          }
        });

        updatedDeals.push(updatedDeal);
      }

      res.json({ success: true, count: updatedDeals.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: (error as any).errors });
      }
      console.error("Failed to bulk update deals:", error);
      res.status(500).json({ error: "Failed to bulk update deals" });
    }
  });

// Helper function to map deals for frontend
const mapDealsForFrontend = (
  dealsToProcess: any[],
  cachedMaps: any,
  cachedPhotos: any,
  settings: any,
  queryParams: any
) => {
  const { term: queryTerm, down: queryDown, mileage: queryMileage, tier: queryTier } = queryParams;
  const { makeMap: carDbMakeMap, modelMap: carDbModelMap, trimMap: carDbTrimMap } = cachedMaps;
  const { map: carPhotosMap } = cachedPhotos;

  const acqFeeCents = (settings.acquisitionFee || 650) * 100;
  const docFeeCents = (settings.docFee || 85) * 100;
  const dmvFeeCents = (settings.dmvFee || 400) * 100;
  const brokerFeeCents = (settings.brokerFee || 595) * 100;
  const taxRate = (settings.taxRateDefault || 8.875) / 100;

  return dealsToProcess.map(({ deal, data }) => {
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
    let apr = getVal(data.apr, 4.9);

    // Use totalGlobalSavings if it's greater than 0, otherwise fallback to existing savings logic
    const effectiveSavings = totalGlobalSavings > 0 ? totalGlobalSavings : savings;
    let type = data.type || 'lease';

    let usedTiersData = false;
    // AUTOMATIC UPDATE: Check CAR_DB for latest data
    if (data.make && data.model && data.trim) {
      const makeKey = data.make.toLowerCase();
      const modelKey = `${makeKey}-${data.model.toLowerCase()}`;
      const trimKey = `${modelKey}-${data.trim.toLowerCase()}`;
      
      const makeObj = carDbMakeMap.get(makeKey);
      if (makeObj) {
        const modelObj = carDbModelMap.get(modelKey);
        if (modelObj) {
          const trimObj = carDbTrimMap.get(trimKey);
          if (trimObj) {
            // Use latest data from catalog
            msrp = Number(trimObj.msrp) || msrp;
            mf = trimObj.mf !== undefined && String(trimObj.mf) !== "" ? Number(trimObj.mf) : (modelObj.mf !== undefined && String(modelObj.mf) !== "" ? Number(modelObj.mf) : (makeObj.baseMF !== undefined && String(makeObj.baseMF) !== "" ? Number(makeObj.baseMF) : (mf !== undefined && String(mf) !== "" ? Number(mf) : 0.002)));
            rv = trimObj.rv36 !== undefined && String(trimObj.rv36) !== "" ? Number(trimObj.rv36) : (modelObj.rv36 !== undefined && String(modelObj.rv36) !== "" ? Number(modelObj.rv36) : (rv !== undefined && String(rv) !== "" ? Number(rv) : 0.55));
            leaseCash = trimObj.leaseCash !== undefined && String(trimObj.leaseCash) !== "" ? Number(trimObj.leaseCash) : (leaseCash !== undefined && String(leaseCash) !== "" ? Number(leaseCash) : 0);
            apr = trimObj.baseAPR !== undefined && String(trimObj.baseAPR) !== "" ? Number(trimObj.baseAPR) : (modelObj.baseAPR !== undefined && String(modelObj.baseAPR) !== "" ? Number(modelObj.baseAPR) : (makeObj.baseAPR !== undefined && String(makeObj.baseAPR) !== "" ? Number(makeObj.baseAPR) : (apr !== undefined && String(apr) !== "" ? Number(apr) : 4.9)));

            if (queryTier) {
              const tierId = queryTier as string;
              const makeTier = makeObj.tiers?.find((t: any) => t.id === tierId);
              
              if (makeTier || modelObj.tiersData?.[tierId] || trimObj.tiersData?.[tierId]) {
                const fallbackMakeTier = makeTier || { mfAdd: 0, aprAdd: 0 };
                const modelTier = modelObj.tiersData?.[tierId] || fallbackMakeTier;
                const trimTier = trimObj.tiersData?.[tierId];

                if (trimTier) {
                  mf = trimTier.mf !== undefined && trimTier.mf !== "" ? Number(trimTier.mf) : mf;
                  rv = trimTier.rv36 !== undefined && trimTier.rv36 !== "" ? Number(trimTier.rv36) : rv;
                  leaseCash = trimTier.leaseCash !== undefined && trimTier.leaseCash !== "" ? Number(trimTier.leaseCash) : leaseCash;
                  apr = trimTier.baseAPR !== undefined && trimTier.baseAPR !== "" ? Number(trimTier.baseAPR) : apr;
                } else {
                  mf = mf + (Number(modelTier.mfAdd) || 0);
                  apr = apr + (Number(modelTier.aprAdd) || 0);
                }
                
                // Attach the resolved tier data to the object so the frontend can use it
                if (!data.tiersData) data.tiersData = {};
                data.tiersData[tierId] = {
                  mf: mf,
                  rv36: rv,
                  baseAPR: apr,
                  leaseCash: leaseCash
                };
                usedTiersData = true;
              }
            }
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

    if (queryTier && !usedTiersData) {
      if (queryTier === 't2') mf *= 1.1;
      else if (queryTier === 't3') mf *= 1.2;
      else if (queryTier === 't4') mf *= 1.35;
      else if (queryTier === 't5') mf *= 1.5;
      else if (queryTier === 't6') mf *= 1.7;
    }

    // Re-calculate payment based on new DAS logic
    let payment = 0;
    let financePayment = 0;
    
    const lease = PureMathEngine.calculateLease({
      msrpCents: msrp * 100,
      sellingPriceCents: (msrp - effectiveSavings - leaseCash - rebates - discount) * 100,
      residualValuePercent: rv > 1 ? rv / 100 : rv,
      moneyFactor: mf,
      term,
      downPaymentCents: down * 100,
      acqFeeCents: acqFeeCents,
      docFeeCents: docFeeCents,
      dmvFeeCents: dmvFeeCents,
      brokerFeeCents: brokerFeeCents,
      taxRate: taxRate
    });
    payment = lease.finalPaymentCents / 100;

    if (queryTier && !usedTiersData) {
      if (queryTier === 't2') apr += 1.0;
      else if (queryTier === 't3') apr += 2.5;
      else if (queryTier === 't4') apr += 4.5;
      else if (queryTier === 't5') apr += 7.0;
      else if (queryTier === 't6') apr += 10.0;
    }

    const finance = PureMathEngine.calculateFinance({
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
      const makeKey = data.make.toLowerCase();
      const modelKey = `${makeKey}-${data.model.toLowerCase()}`;
      
      const makeObj = carDbMakeMap.get(makeKey);
      if (makeObj) {
        const modelObj = carDbModelMap.get(modelKey);
        if (modelObj) {
          const photoKey = `${makeObj.id}-${modelObj.id}`;
          const modelPhotos = carPhotosMap.get(photoKey) || [];
          if (modelPhotos.length > 0) {
            // Sort so default is first
            modelPhotos.sort((a: any, b: any) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
            images = modelPhotos.map((p: any) => p.imageUrl);
            imageUrl = images[0];
          }
          bodyStyle = getBodyStyle(modelObj.class, modelObj.name);
          fuelType = getFuelType(modelObj.class, data.trim || '');
          seats = (modelObj.class || '').includes('3-Row') || (modelObj.class || '').includes('Minivan') ? 7 : 5;
          
          if (data.trim) {
            const trimKey = `${modelKey}-${data.trim.toLowerCase()}`;
            const trimObj = carDbTrimMap.get(trimKey);
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
      expirationDate: deal.expirationDate,
      availableIncentives: data.availableIncentives || [],
      leaseCash: leaseCash || 0,
      rebates: data.rebates || 0,
      discount: data.discount || 0,
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
};

  // Get approved/published deals for Marketplace
  app.get("/api/deals", async (req, res) => {
    try {
      const { term: queryTerm, down: queryDown, mileage: queryMileage, tier: queryTier, displayMode: queryDisplayMode, id: queryId, ids: queryIds, limit: queryLimit, make: queryMake } = req.query;
      
      const whereClause: any = {
        AND: [
          { publishStatus: { not: 'ARCHIVED' } }
        ]
      };

      if (!queryId && !queryIds) {
        whereClause.AND.push({
          OR: [
            { expirationDate: null },
            { expirationDate: { gt: new Date() } }
          ]
        });
        whereClause.AND.push({
          OR: [
            { reviewStatus: 'APPROVED' },
            { publishStatus: 'PUBLISHED' }
          ]
        });
      }

      if (queryId) {
        whereClause.id = queryId as string;
      } else if (queryIds) {
        const idsArray = (queryIds as string).split(',');
        whereClause.id = { in: idsArray };
      }

      if (queryMake) {
        whereClause.financialData = {
          contains: `"make":"${queryMake}"`
        };
      }

      const queryOptions: any = {
        where: whereClause,
        include: {
          lender: {
            include: {
              eligibilityRules: true
            }
          }
        },
        orderBy: [
          { isSoldOut: 'asc' },
          { isPinned: 'desc' },
          { createdAt: 'desc' }
        ]
      };

      if (queryLimit) {
        queryOptions.take = parseInt(queryLimit as string, 10);
      }

      console.time('fetchDeals');
      // Fetch deals that are APPROVED or PUBLISHED from Prisma
      const [dbDeals, cachedMaps, cachedPhotos, settingsRecord] = await Promise.all([
        prisma.dealRecord.findMany(queryOptions),
        getCachedCarDbMaps(),
        getCachedCarPhotosMap(),
        prisma.siteSettings.findUnique({ where: { id: 'global' } })
      ]);
      console.timeEnd('fetchDeals');

      let settings;
      try {
        settings = settingsRecord ? JSON.parse(settingsRecord.data) : null;
      } catch (e) {
        console.error("Failed to parse settings:", e);
      }
      if (!settings) {
        settings = {
          brokerFee: 595,
          taxRateDefault: 8.875,
          dmvFee: 400,
          docFee: 85,
          acquisitionFee: 650
        };
      }

      console.time('deduplicateDeals');
      // Deduplicate deals by make + model + trim before heavy processing
      // Skip deduplication if specific IDs are requested
      const shouldDeduplicate = !queryId && !queryIds;
      const uniqueDealsMap = new Map();
      const dealsToProcess = [];

      for (const deal of (dbDeals as any[])) {
        let data = null;
        try {
          data = deal.financialData ? JSON.parse(deal.financialData) : null;
        } catch (e) {
          console.error(`Failed to parse financialData for deal ${deal.id}:`, e);
        }
        if (!data) continue;

        if (shouldDeduplicate) {
          const key = `${data.make}-${data.model}-${data.trim}`;
          if (!uniqueDealsMap.has(key) || data.type === 'lease') {
            uniqueDealsMap.set(key, { deal, data });
          }
        } else {
          dealsToProcess.push({ deal, data });
        }
      }

      const finalDealsToProcess = shouldDeduplicate ? Array.from(uniqueDealsMap.values()) : dealsToProcess;
      console.timeEnd('deduplicateDeals');

      console.time('mapDeals');
      // Map DB deals to the format expected by the frontend
      const mappedDeals = mapDealsForFrontend(finalDealsToProcess, cachedMaps, cachedPhotos, settings, req.query);
      console.timeEnd('mapDeals');

      // Return database deals only
      res.json(mappedDeals);
    } catch (error) {
      console.error("Failed to fetch published deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // Get a single deal by ID
  app.get("/api/deals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      console.time(`fetchDeal-${id}`);
      const [dbDeal, cachedMaps, cachedPhotos, settingsRecord] = await Promise.all([
        prisma.dealRecord.findUnique({
          where: { id },
          include: {
            lender: {
              include: {
                eligibilityRules: true
              }
            }
          }
        }),
        getCachedCarDbMaps(),
        getCachedCarPhotosMap(),
        prisma.siteSettings.findUnique({ where: { id: 'global' } })
      ]);
      console.timeEnd(`fetchDeal-${id}`);

      if (!dbDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      let settings;
      try {
        settings = settingsRecord ? JSON.parse(settingsRecord.data) : null;
      } catch (e) {
        console.error("Failed to parse settings:", e);
      }
      if (!settings) {
        settings = {
          brokerFee: 595,
          taxRateDefault: 8.875,
          dmvFee: 400,
          docFee: 85,
          acquisitionFee: 650
        };
      }

      let data = null;
      try {
        data = dbDeal.financialData ? JSON.parse(dbDeal.financialData) : null;
      } catch (e) {
        console.error(`Failed to parse financialData for deal ${dbDeal.id}:`, e);
      }

      if (!data) {
        return res.status(500).json({ error: "Invalid deal data" });
      }

      console.time(`mapDeal-${id}`);
      const mappedDeals = mapDealsForFrontend([{ deal: dbDeal, data }], cachedMaps, cachedPhotos, settings, req.query);
      console.timeEnd(`mapDeal-${id}`);

      if (mappedDeals.length === 0) {
        return res.status(500).json({ error: "Failed to map deal" });
      }

      res.json(mappedDeals[0]);
    } catch (error) {
      console.error(`Failed to fetch deal ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch deal" });
    }
  });

  // Increment view count for a deal
  app.post("/api/deals/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.dealRecord.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1
          }
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to increment view count:", error);
      res.status(500).json({ error: "Failed to increment view count" });
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

  // --- DYNAMIC META TAGS FOR SEO ---
  app.get('/deal/:id', async (req, res, next) => {
    try {
      const dealId = req.params.id; // DealRecord id is a UUID string

      const deal = await prisma.dealRecord.findUnique({
        where: { id: dealId }
      });

      if (!deal) {
        return next();
      }

      const isProd = process.env.NODE_ENV === "production";
      const indexPath = isProd 
        ? path.join(process.cwd(), "dist", "index.html")
        : path.join(process.cwd(), "index.html");

      if (!fs.existsSync(indexPath)) {
        return next();
      }

      let html = fs.readFileSync(indexPath, 'utf-8');

      // If in dev mode, let Vite handle it to preserve HMR
      if (!isProd) {
        return next();
      }

      let data: any = {};
      try {
        data = deal.financialData ? JSON.parse(deal.financialData) : {};
      } catch (e) {
        console.error(`Failed to parse financialData for deal ${deal.id}:`, e);
      }

      const year = data.year || new Date().getFullYear();
      const make = data.make || 'Unknown Make';
      const model = data.model || 'Unknown Model';
      const trim = data.trim || '';
      
      // Calculate a rough payment/due at signing for SEO if not explicitly set
      // We don't need the exact penny-perfect calculation here, just a good estimate
      const msrp = data.msrp || 0;
      const down = data.down !== undefined ? data.down : (data.dueAtSigning || 3000);
      const payment = data.monthlyPayment || Math.round((msrp * 0.012)); // Rough estimate if missing

      const title = `Lease ${year} ${make} ${model} ${trim} | Hunter Lease`;
      const description = `Get a pre-negotiated lease deal on a ${year} ${make} ${model} for $${payment}/mo with $${down} due at signing. No hidden fees.`;
      const imageUrl = data.image || 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=1200&h=630';

      html = html.replace(
        /<title>.*?<\/title>/,
        `<title>${title}</title>`
      );
      
      html = html.replace(
        /<meta name="description" content=".*?"\s*\/>/,
        `<meta name="description" content="${description}" />`
      );

      const ogTags = `
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:type" content="website" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="${title}" />
        <meta property="twitter:description" content="${description}" />
        <meta property="twitter:image" content="${imageUrl}" />
      `;
      
      html = html.replace('</head>', `${ogTags}</head>`);

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.send(html);
    } catch (error) {
      console.error("Error serving dynamic meta tags for deal:", error);
      next();
    }
  });

  // ============================================
  // STRIPE PAYMENT ROUTES
  // ============================================

  // Stripe webhook (must be before express.json() — needs raw body)
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const result = await StripeService.handleWebhook(req.body, sig);
      res.json(result);
    } catch (error: any) {
      console.error('Stripe webhook error:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // Create checkout session for $95 deposit
  app.post('/api/payments/create-session', async (req, res) => {
    try {
      const { leadId, userId, quoteId, customerEmail, vehicleDescription } = req.body;
      if (!leadId) return res.status(400).json({ error: 'leadId is required' });

      const result = await StripeService.createCheckoutSession({
        leadId, userId, quoteId, customerEmail, vehicleDescription
      });
      res.json(result);
    } catch (error: any) {
      console.error('Create checkout session error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get payment status for a lead
  app.get('/api/payments/lead/:leadId', async (req, res) => {
    try {
      const payment = await StripeService.getPaymentByLead(req.params.leadId);
      res.json(payment || { status: 'none' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: refund a payment
  app.post('/api/admin/payments/:id/refund', adminAuth, async (req, res) => {
    try {
      const result = await StripeService.refundPayment(req.params.id, req.body.reason);
      res.json(result);
    } catch (error: any) {
      console.error('Refund error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: list all payments
  app.get('/api/admin/payments', adminAuth, async (req, res) => {
    try {
      const payments = await prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { id: true, name: true, clientName: true, carMake: true, carModel: true } } }
      });
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 700CREDIT ROUTES
  // ============================================

  // Record credit consent
  app.post('/api/credit/consent', async (req, res) => {
    try {
      const { leadId, userId } = req.body;
      if (!leadId) return res.status(400).json({ error: 'leadId is required' });

      const creditCheck = await CreditService.recordConsent(leadId, userId);
      res.json(creditCheck);
    } catch (error: any) {
      console.error('Credit consent error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Execute soft pull
  app.post('/api/credit/soft-pull', async (req, res) => {
    try {
      const { creditCheckId, applicant } = req.body;
      if (!creditCheckId || !applicant) {
        return res.status(400).json({ error: 'creditCheckId and applicant data are required' });
      }

      const result = await CreditService.executeSoftPull(creditCheckId, applicant);
      // Return obfuscated summary to client (no raw score)
      res.json({
        creditBand: result.creditBand,
        scoreRange: result.scoreRange,
        status: 'completed',
      });
    } catch (error: any) {
      console.error('Soft pull error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Dealer view: get obfuscated credit summary
  app.get('/api/credit/summary/:leadId', generalAdminAuth, async (req, res) => {
    try {
      const summary = await CreditService.getDealerSummary(req.params.leadId);
      res.json(summary || { status: 'not_checked' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin view: get full credit details
  app.get('/api/admin/credit/:id', adminAuth, async (req, res) => {
    try {
      const details = await CreditService.getFullDetails(req.params.id);
      res.json(details);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: list all credit checks
  app.get('/api/admin/credit-checks', adminAuth, async (req, res) => {
    try {
      const checks = await prisma.creditCheck.findMany({
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { id: true, name: true, clientName: true } } }
      });
      res.json(checks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // DEALER ASSIGNMENT ROUTES
  // ============================================

  // Assign lead to dealer
  app.post('/api/admin/dealer-assignments', adminAuth, async (req, res) => {
    try {
      const { leadId, dealerPartnerId, staffId } = req.body;
      if (!leadId || !dealerPartnerId) {
        return res.status(400).json({ error: 'leadId and dealerPartnerId are required' });
      }

      const dealer = await prisma.dealerPartner.findUnique({ where: { id: dealerPartnerId } });
      if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

      const assignment = await prisma.dealerAssignment.create({
        data: {
          leadId,
          dealerPartnerId,
          staffId: staffId || null,
          status: 'pending',
          slaDeadline: new Date(Date.now() + (dealer.slaHours || 24) * 60 * 60 * 1000),
        },
      });

      // Notify dealer
      if (dealer.email) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (lead) {
          await NotificationService.notifyDealerNewLead(
            dealer.email,
            dealer.phone || '',
            { carYear: lead.carYear, carMake: lead.carMake, carModel: lead.carModel, carMsrp: lead.carMsrp, calcPayment: lead.calcPayment }
          );
        }
      }

      // Update lead counters
      await prisma.lead.update({
        where: { id: leadId },
        data: { dealersSent: { increment: 1 } },
      });

      res.json(assignment);
    } catch (error: any) {
      console.error('Dealer assignment error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Dealer accepts/rejects assignment
  app.put('/api/dealer-assignments/:id/respond', generalAdminAuth, async (req, res) => {
    try {
      const { action, comment, counterOffer } = req.body;
      if (!['accept', 'reject', 'counter'].includes(action)) {
        return res.status(400).json({ error: 'action must be accept, reject, or counter' });
      }

      const now = new Date();
      const updateData: any = { comment: comment || null };

      if (action === 'accept') {
        updateData.status = 'accepted';
        updateData.acceptedAt = now;
      } else if (action === 'reject') {
        updateData.status = 'rejected';
        updateData.rejectedAt = now;
      } else if (action === 'counter') {
        updateData.status = 'countered';
        updateData.counterOffer = counterOffer || null;
      }

      const assignment = await prisma.dealerAssignment.update({
        where: { id: req.params.id },
        data: updateData,
        include: { lead: true, dealerPartner: true },
      });

      // Notify client if accepted
      if (action === 'accept' && assignment.lead) {
        const clientEmail = assignment.lead.clientEmail || assignment.lead.email;
        const clientPhone = assignment.lead.clientPhone || assignment.lead.phone;
        const vehicle = `${assignment.lead.carYear} ${assignment.lead.carMake} ${assignment.lead.carModel}`;

        if (clientEmail) {
          await NotificationService.notifyDealerAccepted(
            clientEmail, clientPhone || '', assignment.dealerPartner.name, vehicle
          );
        }

        await prisma.lead.update({
          where: { id: assignment.leadId },
          data: {
            dealersAccepted: { increment: 1 },
            acceptedBy: assignment.dealerPartner.name,
            status: 'accepted',
          },
        });
      }

      res.json(assignment);
    } catch (error: any) {
      console.error('Assignment response error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get assignments for a lead
  app.get('/api/admin/dealer-assignments/lead/:leadId', adminAuth, async (req, res) => {
    try {
      const assignments = await prisma.dealerAssignment.findMany({
        where: { leadId: req.params.leadId },
        include: { dealerPartner: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get assignments for a dealer (dealer portal)
  app.get('/api/dealer/assignments', generalAdminAuth, async (req, res) => {
    try {
      const user = (req as any).user?.dbUser;
      if (!user?.dealerPartnerId) {
        return res.status(403).json({ error: 'Not associated with a dealer' });
      }

      const assignments = await prisma.dealerAssignment.findMany({
        where: { dealerPartnerId: user.dealerPartnerId },
        include: {
          lead: {
            select: {
              id: true, name: true, clientName: true, carMake: true, carModel: true,
              carYear: true, carTrim: true, carMsrp: true, calcPayment: true, calcType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // NOTIFICATION LOG ROUTES (admin)
  // ============================================

  app.get('/api/admin/notification-logs', adminAuth, async (req, res) => {
    try {
      const logs = await prisma.notificationLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // NOTIFICATION TEMPLATES (admin CRUD)
  // ============================================

  app.get('/api/admin/notification-templates', adminAuth, async (req, res) => {
    try {
      const templates = await prisma.notificationTemplate.findMany({ orderBy: { key: 'asc' } });
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/notification-templates', adminAuth, async (req, res) => {
    try {
      const { key, channel, subject, body } = req.body;
      const template = await prisma.notificationTemplate.create({
        data: { key, channel, subject, body }
      });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/notification-templates/:id', adminAuth, async (req, res) => {
    try {
      const template = await prisma.notificationTemplate.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/notification-templates/:id', adminAuth, async (req, res) => {
    try {
      await prisma.notificationTemplate.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: process.env.NODE_ENV === 'development' ? err.message : undefined });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
