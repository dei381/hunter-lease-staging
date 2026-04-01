import express from 'express';
import { adminAuth } from '../middleware/auth';
import db from '../lib/db';

import { CalculatorAuditService } from '../services/engine/CalculatorAuditService';
import { Validator } from '../services/engine/Validator';

const router = express.Router();

// --- Calculator Audit ---
router.post('/audit', adminAuth, async (req, res) => {
  try {
    const context = Validator.parseAdminRequest(req.body);
    const trace = await CalculatorAuditService.generateTrace(context);
    res.json(trace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Bulk Updates ---
router.post('/bulk-update', adminAuth, async (req, res) => {
  try {
    const { filters, updates } = req.body;
    
    let updatedProgramsCount = 0;

    // 1. Update Bank Programs (RV and MF)
    if (updates.rvAdjustment || updates.mfAdjustment) {
      const activeBatch = await db.programBatch.findFirst({
        where: { status: 'ACTIVE' }
      });

      if (activeBatch) {
        const whereClause: any = { batchId: activeBatch.id };
        if (filters.make) whereClause.make = filters.make;
        if (filters.model) whereClause.model = filters.model;
        if (filters.year) whereClause.year = filters.year;
        if (filters.trim) whereClause.trim = filters.trim;

        const programsToUpdate = await db.bankProgram.findMany({ where: whereClause });
        
        for (const prog of programsToUpdate) {
          const dataToUpdate: any = {};
          if (updates.rvAdjustment && prog.rv !== null) {
            dataToUpdate.rv = prog.rv + (updates.rvAdjustment / 100);
          }
          if (updates.mfAdjustment && prog.mf !== null) {
            dataToUpdate.mf = prog.mf + updates.mfAdjustment;
          }
          
          if (Object.keys(dataToUpdate).length > 0) {
            await db.bankProgram.update({
              where: { id: prog.id },
              data: dataToUpdate
            });
            updatedProgramsCount++;
          }
        }
      }
    }

    // 2. Add Incentive
    if (updates.addIncentive) {
      await db.oemIncentiveProgram.create({
        data: {
          name: updates.addIncentive.name,
          amountCents: updates.addIncentive.amountCents,
          type: updates.addIncentive.type,
          dealApplicability: 'ALL',
          make: filters.make || 'ALL',
          model: filters.model || null,
        }
      });
      updatedProgramsCount++; // Just count as an action
    }

    // 3. Add Dealer Discount
    if (updates.dealerDiscount) {
      await db.dealerAdjustment.create({
        data: {
          make: filters.make || null,
          model: filters.model || null,
          trim: filters.trim || null,
          amount: -Math.abs(updates.dealerDiscount * 100),
        }
      });
      updatedProgramsCount++;
    }

    res.json({ success: true, updatedProgramsCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Lenders ---
router.get('/lenders', adminAuth, async (req, res) => {
  try {
    const lenders = await db.lender.findMany({
      include: {
        tierMappings: true,
        feePolicies: true,
      }
    });
    res.json(lenders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/lenders', adminAuth, async (req, res) => {
  try {
    const { name, isCaptive } = req.body;
    const lender = await db.lender.create({
      data: { name, isCaptive }
    });
    res.json(lender);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/lenders/:id', adminAuth, async (req, res) => {
  try {
    const { name, isCaptive } = req.body;
    const lender = await db.lender.update({
      where: { id: req.params.id },
      data: { name, isCaptive }
    });
    res.json(lender);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/lenders/:id', adminAuth, async (req, res) => {
  try {
    await db.lender.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Lease Programs ---
router.get('/programs/lease', adminAuth, async (req, res) => {
  try {
    const programs = await db.leaseProgram.findMany({
      include: { lender: true }
    });
    res.json(programs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/programs/lease', adminAuth, async (req, res) => {
  try {
    const program = await db.leaseProgram.create({
      data: req.body
    });
    res.json(program);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/programs/lease/:id', adminAuth, async (req, res) => {
  try {
    const program = await db.leaseProgram.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(program);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Finance Programs ---
router.get('/programs/finance', adminAuth, async (req, res) => {
  try {
    const programs = await db.financeProgram.findMany({
      include: { lender: true }
    });
    res.json(programs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/programs/finance', adminAuth, async (req, res) => {
  try {
    const program = await db.financeProgram.create({
      data: req.body
    });
    res.json(program);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/programs/finance/:id', adminAuth, async (req, res) => {
  try {
    const program = await db.financeProgram.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(program);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generic delete for programs
router.delete('/programs/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // Try lease first
    try {
      await db.leaseProgram.delete({ where: { id } });
      return res.json({ success: true });
    } catch (e) {
      // Try finance
      await db.financeProgram.delete({ where: { id } });
      return res.json({ success: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Fee Policies ---
router.get('/policies', adminAuth, async (req, res) => {
  try {
    const policies = await db.lenderFeePolicy.findMany({
      include: { lender: true, rollabilityRules: true }
    });
    res.json(policies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/policies', adminAuth, async (req, res) => {
  try {
    const { rollabilityRules, ...policyData } = req.body;
    const policy = await db.lenderFeePolicy.create({
      data: {
        ...policyData,
        rollabilityRules: {
          create: rollabilityRules || []
        }
      },
      include: { rollabilityRules: true }
    });
    res.json(policy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/policies/:id', adminAuth, async (req, res) => {
  try {
    const { rollabilityRules, ...policyData } = req.body;
    
    // Simple update: delete old rules and create new ones if provided
    if (rollabilityRules) {
      await db.feeRollabilityRule.deleteMany({
        where: { lenderFeePolicyId: req.params.id }
      });
    }

    const policy = await db.lenderFeePolicy.update({
      where: { id: req.params.id },
      data: {
        ...policyData,
        rollabilityRules: rollabilityRules ? {
          create: rollabilityRules
        } : undefined
      },
      include: { rollabilityRules: true }
    });
    res.json(policy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/policies/:id', adminAuth, async (req, res) => {
  try {
    await db.lenderFeePolicy.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Regional Taxes ---
router.get('/taxes', adminAuth, async (req, res) => {
  try {
    const taxes = await db.regionalTaxFeeCache.findMany();
    res.json(taxes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/taxes/:zipCode', adminAuth, async (req, res) => {
  try {
    const { zipCode } = req.params;
    const tax = await db.regionalTaxFeeCache.upsert({
      where: { zipCode },
      update: req.body,
      create: { ...req.body, zipCode }
    });
    res.json(tax);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/taxes/:id', adminAuth, async (req, res) => {
  try {
    await db.regionalTaxFeeCache.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Incentives ---
router.get('/incentives', adminAuth, async (req, res) => {
  try {
    const incentives = await db.oemIncentiveProgram.findMany({
      orderBy: [
        { make: 'asc' },
        { model: 'asc' },
        { trim: 'asc' },
        { amountCents: 'desc' }
      ]
    });
    res.json(incentives);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dealer-adjustments', adminAuth, async (req, res) => {
  try {
    const adjustments = await db.dealerAdjustment.findMany({
      orderBy: [
        { make: 'asc' },
        { model: 'asc' },
        { trim: 'asc' },
        { amount: 'desc' }
      ]
    });
    res.json(adjustments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/dealer-adjustments', adminAuth, async (req, res) => {
  try {
    const adjustment = await db.dealerAdjustment.create({
      data: req.body
    });
    res.json(adjustment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/dealer-adjustments/:id', adminAuth, async (req, res) => {
  try {
    const adjustment = await db.dealerAdjustment.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(adjustment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/dealer-adjustments/:id', adminAuth, async (req, res) => {
  try {
    await db.dealerAdjustment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Program Overrides ---

router.get('/program-overrides', adminAuth, async (req, res) => {
  try {
    const overrides = await db.programOverride.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(overrides);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/program-overrides', adminAuth, async (req, res) => {
  try {
    const override = await db.programOverride.create({
      data: req.body
    });
    res.json(override);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/program-overrides/:id', adminAuth, async (req, res) => {
  try {
    const override = await db.programOverride.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(override);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/program-overrides/:id', adminAuth, async (req, res) => {
  try {
    await db.programOverride.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/incentives', adminAuth, async (req, res) => {
  try {
    const incentive = await db.oemIncentiveProgram.create({
      data: req.body
    });
    res.json(incentive);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/incentives/:id', adminAuth, async (req, res) => {
  try {
    const incentive = await db.oemIncentiveProgram.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(incentive);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/incentives/:id', adminAuth, async (req, res) => {
  try {
    await db.oemIncentiveProgram.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- MVP Financial Layer (Program Batches) ---

// 1. Import Service
router.post('/batches/import', adminAuth, async (req, res) => {
  try {
    const { programs } = req.body;
    if (!Array.isArray(programs) || programs.length === 0) {
      return res.status(400).json({ error: 'Programs array is required and cannot be empty' });
    }

    const batch = await db.programBatch.create({
      data: {
        status: 'DRAFT',
      }
    });

    const programsData = programs.map((p: any) => ({
      batchId: batch.id,
      programType: p.programType,
      make: p.make,
      model: p.model,
      trim: p.trim,
      year: p.year,
      term: p.term,
      mileage: p.mileage || null,
      rv: p.rv || null,
      mf: p.mf || null,
      apr: p.apr || null,
      rebates: p.rebates || 0,
    }));

    await db.$transaction(
      programsData.map((data: any) => db.bankProgram.create({ data }))
    );

    res.json({ success: true, batchId: batch.id, count: programsData.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Validation Service
router.post('/batches/:id/validate', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await db.programBatch.findUnique({
      where: { id },
      include: { programs: true }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const errors: string[] = [];
    
    if (batch.programs.length === 0) {
      errors.push('Batch is empty');
    }

    const seen = new Set<string>();

    for (const p of batch.programs) {
      if (p.programType === 'LEASE') {
        if (p.rv === null) errors.push(`Program ${p.id} (LEASE) is missing rv`);
        if (p.mf === null) errors.push(`Program ${p.id} (LEASE) is missing mf`);
      } else if (p.programType === 'FINANCE') {
        if (p.apr === null) errors.push(`Program ${p.id} (FINANCE) is missing apr`);
      }

      const key = `${p.programType}-${p.make}-${p.model}-${p.trim}-${p.year}-${p.term}-${p.mileage}`;
      if (seen.has(key)) {
        errors.push(`Duplicate scenario found: ${key}`);
      }
      seen.add(key);
    }

    const isValid = errors.length === 0;

    const updatedBatch = await db.programBatch.update({
      where: { id },
      data: {
        isValid,
        validationErrors: errors.length > 0 ? JSON.stringify(errors) : null
      }
    });

    res.json(updatedBatch);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Publish Service
router.post('/batches/:id/publish', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await db.programBatch.findUnique({ where: { id } });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (!batch.isValid) {
      return res.status(400).json({ error: 'Cannot publish an invalid batch' });
    }

    await db.$transaction([
      db.programBatch.updateMany({
        where: { status: 'ACTIVE' },
        data: { status: 'SUPERSEDED' }
      }),
      db.programBatch.update({
        where: { id },
        data: { status: 'ACTIVE', publishedAt: new Date() }
      })
    ]);

    res.json({ success: true, batchId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all batches
router.get('/batches', adminAuth, async (req, res) => {
  try {
    const batches = await db.programBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { programs: true }
        }
      }
    });
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get programs for a batch
router.get('/batches/:id/programs', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const programs = await db.bankProgram.findMany({
      where: { batchId: id },
      take: 100 // Limit for MVP UI
    });
    res.json(programs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
