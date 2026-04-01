import { QuoteContext, PaymentBreakdown } from './types';
import { DataResolver } from './DataResolver';
import { ModifierEngine } from './ModifierEngine';
import { PureMathEngine } from './PureMathEngine';
import { IncentiveResolver } from '../IncentiveResolver';
import prisma from '../../lib/db';

export interface AuditVariable {
  name: string;
  value: any;
  source: string;
  sourceTable: string;
  sourceField: string;
  isCalculated: boolean;
  isFallback: boolean;
  includedInCalculation?: boolean;
  includedInCapCost?: boolean;
  includedUpfront?: boolean;
  metadata?: any;
}

export interface AuditStep {
  description: string;
  formula: string;
  rawResult: number;
  roundedResult: number;
  roundingMode: string;
  displayResult: string;
}

export interface IntegrityCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AuditTrace {
  formulaVersion: string;
  lastModified: string;
  variables: AuditVariable[];
  steps: AuditStep[];
  warnings: string[];
  errors: string[];
  integrityChecks: IntegrityCheck[];
  status: 'TRUSTED' | 'WARNING' | 'INVALID';
  finalPayment: number;
}

export class CalculatorAuditService {
  static async generateTrace(context: QuoteContext): Promise<AuditTrace> {
    const trace: AuditTrace = {
      formulaVersion: 'v2.3.0',
      lastModified: new Date().toISOString(),
      variables: [],
      steps: [],
      warnings: [],
      errors: [],
      integrityChecks: [],
      status: 'TRUSTED',
      finalPayment: 0
    };

    const addVar = (v: AuditVariable) => trace.variables.push(v);
    const addStep = (desc: string, formula: string, raw: number, display: string, roundingMode: string = 'round') => {
      trace.steps.push({
        description: desc,
        formula: formula,
        rawResult: raw,
        roundedResult: roundingMode === 'round' ? Math.round(raw * 100) / 100 : roundingMode === 'floor' ? Math.floor(raw * 100) / 100 : Math.ceil(raw * 100) / 100,
        roundingMode,
        displayResult: display
      });
    };
    const addWarn = (w: string) => {
      trace.warnings.push(w);
      if (trace.status === 'TRUSTED') trace.status = 'WARNING';
    };
    const addErr = (e: string) => {
      trace.errors.push(e);
      trace.status = 'INVALID';
    };
    const addCheck = (name: string, status: 'PASS' | 'FAIL' | 'WARN', severity: 'HIGH' | 'MEDIUM' | 'LOW', details?: string) => {
      trace.integrityChecks.push({ name, status, details, severity });
      if (status === 'FAIL') {
        if (severity === 'HIGH') trace.status = 'INVALID';
        else if (severity === 'MEDIUM' && trace.status !== 'INVALID') trace.status = 'WARNING';
      } else if (status === 'WARN') {
        if (severity === 'HIGH' && trace.status !== 'INVALID') trace.status = 'WARNING';
        else if (severity === 'MEDIUM' && trace.status === 'TRUSTED') trace.status = 'WARNING';
      }
    };

    try {
      // 1. Resolve Data
      const vehicle = await DataResolver.resolveVehicle(context);
      
      addVar({
        name: 'MSRP',
        value: vehicle.msrpCents ? vehicle.msrpCents / 100 : null,
        source: vehicle.msrpCents ? 'Admin Catalog' : 'Missing',
        sourceTable: 'BrandCatalog / VehicleTrimCatalog',
        sourceField: 'msrp',
        isCalculated: false,
        isFallback: !vehicle.msrpCents,
        includedInCalculation: true,
        metadata: {
          verifiedByAdmin: vehicle.verifiedByAdmin,
          verifiedAt: vehicle.verifiedAt,
          modelYear: vehicle.year,
          trimMatchStatus: vehicle.trim === context.trim ? 'MATCH' : 'MISMATCH'
        }
      });

      if (!vehicle.msrpCents) {
        addErr('ERROR: Missing MSRP. Calculation cannot be trusted.');
        addCheck('MSRP Admin Source Check', 'FAIL', 'HIGH', 'MSRP is missing or 0');
        return trace;
      } else {
        if (context.adminOverrides?.msrpCents && context.adminOverrides.msrpCents !== vehicle.msrpCents) {
          addCheck('MSRP Admin Source Check', 'WARN', 'MEDIUM', `MSRP overridden by admin. DB: $${vehicle.msrpCents / 100}, Override: $${context.adminOverrides.msrpCents / 100}`);
        } else {
          addCheck('MSRP Admin Source Check', 'PASS', 'LOW', `MSRP matches admin catalog: $${vehicle.msrpCents / 100}`);
        }
        
        if (vehicle.trim !== context.trim || vehicle.year !== context.year) {
          addCheck('MSRP Trim/Year Match', 'WARN', 'MEDIUM', `Mismatch. Requested: ${context.year} ${context.trim}, Found: ${vehicle.year} ${vehicle.trim}`);
        } else {
          addCheck('MSRP Trim/Year Match', 'PASS', 'LOW', `Trim/Year matches: ${vehicle.year} ${vehicle.trim}`);
        }
      }

      const settings = await DataResolver.resolveSettings();
      
      addVar({
        name: 'Acquisition Fee',
        value: settings.acqFeeCents / 100,
        source: 'Database',
        sourceTable: 'SiteSettings',
        sourceField: 'acqFeeCents',
        isCalculated: false,
        isFallback: false,
        includedInCalculation: true,
        includedInCapCost: true,
        includedUpfront: false
      });
      addVar({
        name: 'Dealer Doc Fee',
        value: settings.docFeeCents / 100,
        source: 'Database',
        sourceTable: 'SiteSettings',
        sourceField: 'docFeeCents',
        isCalculated: false,
        isFallback: false,
        includedInCalculation: true,
        includedInCapCost: false,
        includedUpfront: true
      });
      addVar({
        name: 'DMV Fee',
        value: settings.dmvFeeCents / 100,
        source: 'Database',
        sourceTable: 'SiteSettings',
        sourceField: 'dmvFeeCents',
        isCalculated: false,
        isFallback: false,
        includedInCalculation: true,
        includedInCapCost: false,
        includedUpfront: true
      });
      addVar({
        name: 'Tax Rate',
        value: settings.taxRate,
        source: 'Database',
        sourceTable: 'SiteSettings',
        sourceField: 'taxRate',
        isCalculated: false,
        isFallback: false,
        includedInCalculation: true
      });

      const programs = await DataResolver.resolvePrograms(context, vehicle);
      if (programs.length === 0) {
        addErr('ERROR: No valid programs found for this vehicle. Missing residual_value or money_factor.');
        addCheck('Program Validation', 'FAIL', 'HIGH', 'No matching programs found for the given parameters.');
        return trace;
      }

      const program = programs[0] as any; // Take the first one for audit trace
      
      const bankName = program.lender?.name || 'Unknown';
      if (bankName === 'Unknown') {
        addCheck('Bank Identity', 'WARN', 'HIGH', 'Bank is unknown or missing.');
      } else {
        addCheck('Bank Identity', 'PASS', 'LOW', `Bank identified: ${bankName}`);
      }

      if (program.batch?.createdAt) {
        const daysOld = Math.floor((new Date().getTime() - new Date(program.batch.createdAt).getTime()) / (1000 * 3600 * 24));
        if (daysOld > 30) {
          addCheck('Program Freshness', 'WARN', 'MEDIUM', `Program is ${daysOld} days old (batch created > 30 days ago).`);
        } else {
          addCheck('Program Freshness', 'PASS', 'LOW', `Program is fresh (${daysOld} days old).`);
        }
      } else {
        addCheck('Program Freshness', 'WARN', 'MEDIUM', 'Program creation date unknown.');
      }
      
      const termMatch = program.term === context.term;
      const mileageMatch = program.mileage === context.mileage || context.quoteType !== 'LEASE';
      
      if (termMatch && mileageMatch) {
         addCheck('Program Validation', 'PASS', 'LOW', `Matched Term: ${program.term}, Mileage: ${program.mileage}`);
      } else {
         addCheck('Program Validation', 'WARN', 'MEDIUM', `Mismatch! Requested: ${context.term}mo/${context.mileage}mi. Found: ${program.term}mo/${program.mileage}mi.`);
      }
      
      addVar({
        name: 'Residual %',
        value: program.rv || null,
        source: program.rv ? 'Database' : 'Missing',
        sourceTable: 'BankProgram',
        sourceField: 'rv',
        isCalculated: false,
        isFallback: !program.rv,
        includedInCalculation: true,
        metadata: {
          programId: program.id,
          bank: program.lender?.name || 'Unknown',
          batchId: program.batchId,
          termBucket: program.term,
          mileageBucket: program.mileage,
          tier: context.creditTier
        }
      });
      
      addVar({
        name: 'Money Factor',
        value: program.mf || null,
        source: program._overrideApplied ? 'ProgramOverride' : (program.mf ? 'Database' : 'Missing'),
        sourceTable: program._overrideApplied ? 'ProgramOverride' : 'BankProgram',
        sourceField: 'mf',
        isCalculated: false,
        isFallback: !program.mf,
        includedInCalculation: true,
        metadata: {
          programId: program.id,
          bank: program.lender?.name || 'Unknown',
          batchId: program.batchId,
          termBucket: program.term,
          mileageBucket: program.mileage,
          tier: context.creditTier,
          overrideApplied: program._overrideApplied
        }
      });

      addVar({
        name: 'APR',
        value: program.apr || null,
        source: program._overrideApplied ? 'ProgramOverride' : (program.apr ? 'Database' : 'Missing'),
        sourceTable: program._overrideApplied ? 'ProgramOverride' : 'BankProgram',
        sourceField: 'apr',
        isCalculated: false,
        isFallback: !program.apr,
        includedInCalculation: true,
        metadata: {
          programId: program.id,
          bank: program.lender?.name || 'Unknown',
          batchId: program.batchId,
          termBucket: program.term,
          mileageBucket: program.mileage,
          tier: context.creditTier,
          overrideApplied: program._overrideApplied
        }
      });

      if (!program.rv) {
        addErr('ERROR: Missing residual_value. Calculation cannot be trusted.');
        addCheck('Residual Value Check', 'FAIL', 'HIGH', 'Residual value is missing from the program.');
      } else {
        addCheck('Residual Value Check', 'PASS', 'LOW', 'Residual value found.');
      }
      
      if (!program.mf && context.quoteType === 'LEASE') {
        addErr('ERROR: Missing money factor. Calculation cannot be trusted.');
        addCheck('Money Factor Check', 'FAIL', 'HIGH', 'Money factor is missing from the program.');
      } else if (context.quoteType === 'LEASE') {
        addCheck('Money Factor Check', 'PASS', 'LOW', 'Money factor found.');
      }

      const dealerDiscountCents = await DataResolver.resolveDealerDiscount(context, vehicle);
      addVar({
        name: 'Dealer Discount',
        value: dealerDiscountCents / 100,
        source: 'Database',
        sourceTable: 'DealerAdjustment',
        sourceField: 'amount',
        isCalculated: false,
        isFallback: false,
        includedInCalculation: true
      });

      const resolvedIncentives = IncentiveResolver.resolve(
        vehicle.availableIncentives || [], 
        context.selectedIncentiveIds, 
        'customer', 
        context.isFirstTimeBuyer,
        context,
        vehicle
      );
      const totalIncentivesCents = resolvedIncentives.totalRebateCents;
      
      if (!vehicle.availableIncentives || vehicle.availableIncentives.length === 0) {
        addCheck('Incentive Admin Source Check', 'WARN', 'MEDIUM', 'No incentives available for this vehicle.');
      } else {
        const unverifiedIncentives = vehicle.availableIncentives.filter((inc: any) => !inc.verifiedByAdmin);
        if (unverifiedIncentives.length > 0) {
          addCheck('Incentive Admin Source Check', 'WARN', 'HIGH', `${unverifiedIncentives.length} incentives are not verified by Admin.`);
        } else {
          addCheck('Incentive Admin Source Check', 'PASS', 'LOW', `Found ${vehicle.availableIncentives.length} verified available incentives.`);
        }
      }

      if (resolvedIncentives.evaluatedIncentives.length > 0) {
        const rejected = resolvedIncentives.evaluatedIncentives.filter((i: any) => i.status === 'REJECTED');
        if (rejected.length > 0) {
           addCheck('Incentive Eligibility Check', 'WARN', 'LOW', `${rejected.length} incentives rejected due to eligibility rules.`);
        } else {
           addCheck('Incentive Eligibility Check', 'PASS', 'LOW', `All ${resolvedIncentives.appliedIncentives.length} evaluated incentives applied successfully.`);
        }
      } else {
        addCheck('Incentive Eligibility Check', 'PASS', 'LOW', 'No incentives to evaluate.');
      }
      
      addVar({
        name: 'Total Rebates',
        value: totalIncentivesCents / 100,
        source: 'Admin Incentive Catalog',
        sourceTable: 'OemIncentiveProgram',
        sourceField: 'amountCents',
        isCalculated: true,
        isFallback: false,
        includedInCalculation: true,
        metadata: {
          appliedIncentives: resolvedIncentives.appliedIncentives,
          evaluatedIncentives: resolvedIncentives.evaluatedIncentives,
          allAvailableIncentives: vehicle.availableIncentives || [],
          totalRulesFound: vehicle.availableIncentives?.length || 0,
          appliedCount: resolvedIncentives.appliedIncentives.length,
          rejectedCount: resolvedIncentives.evaluatedIncentives.filter((i: any) => i.status === 'REJECTED').length
        }
      });

      addVar({
        name: 'Term',
        value: context.term,
        source: 'Request Payload',
        sourceTable: 'QuoteRequest',
        sourceField: 'term',
        isCalculated: false,
        isFallback: false,
        includedInCalculation: true
      });

      addVar({
        name: 'Mileage',
        value: context.mileage,
        source: 'Request Payload',
        sourceTable: 'QuoteRequest',
        sourceField: 'mileage',
        isCalculated: false,
        isFallback: false,
        includedInCalculation: true
      });

      addVar({
        name: 'Down Payment',
        value: context.downPaymentCents / 100,
        source: 'Request Payload',
        sourceTable: 'QuoteRequest',
        sourceField: 'downPaymentCents',
        isCalculated: false,
        isFallback: false,
        includedInCalculation: true,
        includedInCapCost: true
      });

      addVar({
        name: 'Trade-In Equity',
        value: context.tradeInEquityCents / 100,
        source: 'Request Payload',
        sourceTable: 'QuoteRequest',
        sourceField: 'tradeInEquityCents',
        isCalculated: false,
        isFallback: false,
        includedInCalculation: true,
        includedInCapCost: true
      });

      if (trace.errors.length > 0) {
        return trace;
      }

      // 3. Apply Modifiers
      let appliedMf = program.mf || 0;
      let appliedApr = program.apr || 0;
      let appliedRvPercent = program.rv || 0; 

      if (context.quoteType === 'LEASE') {
        const originalMf = appliedMf;
        appliedMf = ModifierEngine.applyMsd(appliedMf, context.msdCount);
        if (originalMf !== appliedMf) {
          addStep(
            'Apply MSD to Money Factor',
            `${originalMf} - (${context.msdCount} * 0.00005)`,
            appliedMf,
            appliedMf.toString(),
            'none'
          );
        }

        const originalRv = appliedRvPercent;
        appliedRvPercent = ModifierEngine.applyMileageAdjustment(appliedRvPercent, context.mileage);
        if (originalRv !== appliedRvPercent) {
          addStep(
            'Apply Mileage Adjustment to Residual %',
            `${originalRv * 100}% + adjustment`,
            appliedRvPercent,
            `${(appliedRvPercent * 100).toFixed(2)}%`,
            'none'
          );
        }
      }
      
      const tierAdjusted = ModifierEngine.applyTierAdjustment(appliedMf, appliedApr, context.creditTier);
      if (appliedMf !== tierAdjusted.mf) {
        addStep(
          'Apply Credit Tier Adjustment to Money Factor',
          `${appliedMf} + tier_markup`,
          tierAdjusted.mf,
          tierAdjusted.mf.toString(),
          'none'
        );
      }
      appliedMf = tierAdjusted.mf;
      appliedApr = tierAdjusted.apr;

      // 4. Pure Math
      const msrp = vehicle.msrpCents / 100;
      const dealerDiscount = dealerDiscountCents / 100;
      const rebates = totalIncentivesCents / 100;
      const sellingPrice = msrp - dealerDiscount;
      
      addStep(
        'Calculate Selling Price',
        `MSRP (${msrp}) - Dealer Discount (${dealerDiscount})`,
        sellingPrice,
        `$${sellingPrice.toFixed(2)}`,
        'round'
      );

      const grossCapCost = sellingPrice + (settings.acqFeeCents / 100);
      addStep(
        'Calculate Gross Cap Cost',
        `Selling Price (${sellingPrice}) + Capitalized Fees (Acq Fee: ${settings.acqFeeCents / 100})`,
        grossCapCost,
        `$${grossCapCost.toFixed(2)}`,
        'round'
      );

      const capCostReduction = (context.downPaymentCents / 100) + (context.tradeInEquityCents / 100) + rebates;
      addStep(
        'Calculate Cap Cost Reduction',
        `Down Payment (${context.downPaymentCents / 100}) + Trade-In Equity (${context.tradeInEquityCents / 100}) + Rebates (${rebates})`,
        capCostReduction,
        `$${capCostReduction.toFixed(2)}`,
        'round'
      );

      if (context.quoteType === 'LEASE') {
        const residualValue = Math.round(vehicle.msrpCents * appliedRvPercent) / 100;
        addStep(
          'Calculate Residual Value',
          `MSRP (${msrp}) * Residual % (${(appliedRvPercent * 100).toFixed(2)}%)`,
          residualValue,
          `$${residualValue.toFixed(2)}`,
          'round'
        );

        const capCost = grossCapCost - capCostReduction;
        
        addStep(
          'Calculate Adjusted Cap Cost',
          `Gross Cap Cost (${grossCapCost}) - Cap Cost Reduction (${capCostReduction})`,
          capCost,
          `$${capCost.toFixed(2)}`,
          'round'
        );

        const depreciationFee = (capCost - residualValue) / context.term;
        addStep(
          'Calculate Depreciation Fee',
          `(Adjusted Cap Cost (${capCost}) - Residual Value (${residualValue})) / Term (${context.term})`,
          depreciationFee,
          `$${depreciationFee.toFixed(2)}`,
          'round'
        );

        const financeFee = (capCost + residualValue) * appliedMf;
        addStep(
          'Calculate Finance Fee',
          `(Adjusted Cap Cost (${capCost}) + Residual Value (${residualValue})) * Money Factor (${appliedMf})`,
          financeFee,
          `$${financeFee.toFixed(2)}`,
          'round'
        );

        const basePayment = depreciationFee + financeFee;
        addStep(
          'Calculate Base Payment',
          `Depreciation Fee (${depreciationFee.toFixed(2)}) + Finance Fee (${financeFee.toFixed(2)})`,
          basePayment,
          `$${basePayment.toFixed(2)}`,
          'round'
        );

        const tax = basePayment * settings.taxRate;
        addStep(
          'Calculate Tax',
          `Base Payment (${basePayment.toFixed(2)}) * Tax Rate (${settings.taxRate})`,
          tax,
          `$${tax.toFixed(2)}`,
          'round'
        );
        addCheck('Tax Breakdown', 'PASS', 'LOW', 'Tax applied only to Base Payment (monthly tax). Upfront taxes not calculated in this step.');

        const finalPayment = basePayment + tax;
        addStep(
          'Calculate Final Payment',
          `Base Payment (${basePayment.toFixed(2)}) + Tax (${tax.toFixed(2)})`,
          finalPayment,
          `$${finalPayment.toFixed(2)}`,
          'round'
        );

        trace.finalPayment = Math.round(finalPayment * 100) / 100;

        // Sanity Checks
        const paymentRatio = (trace.finalPayment / msrp) * 100;
        if (paymentRatio > 2.5 || paymentRatio < 0.5) {
          addCheck('Sanity Check: Payment / MSRP', 'WARN', 'MEDIUM', `Payment is ${paymentRatio.toFixed(2)}% of MSRP. Normal range is 0.5% - 2.5%.`);
        } else {
          addCheck('Sanity Check: Payment / MSRP', 'PASS', 'LOW', `Payment is ${paymentRatio.toFixed(2)}% of MSRP.`);
        }

        const apr = appliedMf * 2400;
        if (apr > 15 || apr < 0) {
          addCheck('Sanity Check: MF -> APR', 'WARN', 'MEDIUM', `MF ${appliedMf} = ${apr.toFixed(2)}% APR. This is unusually high or low.`);
        } else {
          addCheck('Sanity Check: MF -> APR', 'PASS', 'LOW', `MF ${appliedMf} = ${apr.toFixed(2)}% APR.`);
        }

        if (appliedRvPercent < 0.30 || appliedRvPercent > 0.85) {
          addCheck('Sanity Check: Residual Range', 'WARN', 'MEDIUM', `Residual ${Math.round(appliedRvPercent * 100)}% is outside normal range (30% - 85%).`);
        } else {
          addCheck('Sanity Check: Residual Range', 'PASS', 'LOW', `Residual ${Math.round(appliedRvPercent * 100)}% is within normal range.`);
        }

      } else {
        // Finance logic if needed
      }

      // Final Check for Fallbacks
      const hasFallbacks = trace.variables.some(v => v.isFallback);
      if (hasFallbacks) {
        addCheck('Data Integrity', 'WARN', 'MEDIUM', 'One or more variables are using fallback values.');
      } else {
        addCheck('Data Integrity', 'PASS', 'LOW', 'No fallback values used. All data sourced correctly.');
      }

    } catch (error: any) {
      addErr(`Exception during calculation: ${error.message}`);
    }

    return trace;
  }
}
