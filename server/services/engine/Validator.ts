import { QuoteContextSchema, QuoteContext } from './types';

export class Validator {
  static parseConsumerRequest(body: any): QuoteContext {
    // Strip adminOverrides if present in consumer request to prevent manipulation
    const safeBody = { ...body };
    delete safeBody.adminOverrides;
    
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
    return QuoteContextSchema.parse(safeBody);
  }
}
