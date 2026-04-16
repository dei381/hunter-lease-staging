import { QuoteContextSchema, QuoteContext } from './types';

export class Validator {
  static parseConsumerRequest(body: any): QuoteContext {
    // Strip adminOverrides if present in consumer request to prevent manipulation
    // EXCEPT if it's a Marketcheck request where we might need some overrides
    const safeBody = { ...body };
    
    // If it's not a marketcheck request, delete adminOverrides
    if (!safeBody.marketcheckData) {
      delete safeBody.adminOverrides;
    }
    
    // Map frontend fields to backend schema
    if (safeBody.type && !safeBody.quoteType) {
      safeBody.quoteType = safeBody.type.toUpperCase();
    }
    if (safeBody.tier && !safeBody.creditTier) {
      safeBody.creditTier = safeBody.tier;
    }
    if (typeof safeBody.mileage === 'string') {
      safeBody.mileage = parseInt(safeBody.mileage, 10);
    }
    if (typeof safeBody.term === 'string') {
      safeBody.term = parseInt(safeBody.term, 10);
    }
    if (typeof safeBody.year === 'string') {
      safeBody.year = parseInt(safeBody.year, 10);
    }
    if (safeBody.selectedIncentives && !safeBody.selectedIncentiveIds) {
      safeBody.selectedIncentiveIds = safeBody.selectedIncentives;
    }
    
    return QuoteContextSchema.parse(safeBody);
  }

  static parseAdminRequest(body: any): QuoteContext {
    const safeBody = { ...body };
    if (safeBody.type && !safeBody.quoteType) {
      safeBody.quoteType = safeBody.type.toUpperCase();
    }
    if (safeBody.tier && !safeBody.creditTier) {
      safeBody.creditTier = safeBody.tier;
    }
    if (typeof safeBody.mileage === 'string') {
      safeBody.mileage = parseInt(safeBody.mileage, 10);
    }
    if (typeof safeBody.term === 'string') {
      safeBody.term = parseInt(safeBody.term, 10);
    }
    if (typeof safeBody.year === 'string') {
      safeBody.year = parseInt(safeBody.year, 10);
    }
    if (safeBody.selectedIncentives && !safeBody.selectedIncentiveIds) {
      safeBody.selectedIncentiveIds = safeBody.selectedIncentives;
    }
    return QuoteContextSchema.parse(safeBody);
  }
}
