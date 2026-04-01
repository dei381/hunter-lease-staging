import db from '../lib/db';

const prisma = db;

/**
 * CreditService — handles 700Credit soft-pull integration.
 * 
 * Flow:
 *   1. Client gives consent (stored with timestamp)
 *   2. Soft pull request sent to 700Credit API
 *   3. Response normalized to internal CreditProfile
 *   4. Obfuscated summary shared with dealer
 *   5. Full result available to admin/back-office only
 */
export class CreditService {

  /**
   * Record client consent for credit check.
   */
  static async recordConsent(leadId: string, userId?: string) {
    const creditCheck = await prisma.creditCheck.create({
      data: {
        leadId,
        userId: userId || null,
        consentGiven: true,
        consentTimestamp: new Date(),
        status: 'consent_given',
      },
    });

    // Also update lead-level flag
    await prisma.lead.update({
      where: { id: leadId },
      data: { creditConsent: true },
    });

    return creditCheck;
  }

  /**
   * Execute a soft credit pull via 700Credit API.
   */
  static async executeSoftPull(creditCheckId: string, applicantData: {
    firstName: string;
    lastName: string;
    ssn: string;
    dateOfBirth: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  }) {
    const creditCheck = await prisma.creditCheck.findUnique({ where: { id: creditCheckId } });
    if (!creditCheck) throw new Error('CreditCheck not found');
    if (!creditCheck.consentGiven) throw new Error('Consent not given');

    await prisma.creditCheck.update({
      where: { id: creditCheckId },
      data: { status: 'processing' },
    });

    try {
      let result;
      
      if (process.env.CREDIT_700_SANDBOX === 'true' || !process.env.CREDIT_700_API_KEY) {
        // Sandbox mode — return mock data
        result = this.getMockCreditResult();
      } else {
        result = await this.call700CreditAPI(applicantData);
      }

      const normalized = this.normalizeResponse(result);

      await prisma.creditCheck.update({
        where: { id: creditCheckId },
        data: {
          status: 'completed',
          scoreRange: normalized.scoreRange,
          creditBand: normalized.creditBand,
          rawResponse: JSON.stringify(result),
          normalizedProfile: JSON.stringify(normalized),
        },
      });

      // Update lead credit score
      if (creditCheck.leadId) {
        await prisma.lead.update({
          where: { id: creditCheck.leadId },
          data: { creditScore: normalized.score },
        });
      }

      return normalized;
    } catch (error: any) {
      await prisma.creditCheck.update({
        where: { id: creditCheckId },
        data: {
          status: 'error',
          errorMessage: error.message || 'Unknown error during credit pull',
        },
      });
      throw error;
    }
  }

  /**
   * Get obfuscated credit summary for dealer view.
   */
  static async getDealerSummary(leadId: string) {
    const check = await prisma.creditCheck.findFirst({
      where: { leadId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });

    if (!check) return null;

    return {
      creditBand: check.creditBand,
      scoreRange: check.scoreRange,
      status: check.status,
      checkedAt: check.createdAt,
    };
  }

  /**
   * Get full credit details for admin view.
   */
  static async getFullDetails(creditCheckId: string) {
    const check = await prisma.creditCheck.findUnique({ where: { id: creditCheckId } });
    if (!check) throw new Error('CreditCheck not found');

    return {
      ...check,
      normalizedProfile: check.normalizedProfile ? JSON.parse(check.normalizedProfile) : null,
    };
  }

  /**
   * Call 700Credit API (real implementation).
   */
  private static async call700CreditAPI(applicantData: any): Promise<any> {
    const apiKey = process.env.CREDIT_700_API_KEY;
    const apiUrl = process.env.CREDIT_700_API_URL || 'https://api.700credit.com/v1';

    const response = await fetch(`${apiUrl}/soft-pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        applicant: applicantData,
        product: 'soft_pull',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`700Credit API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Normalize 700Credit response to internal format.
   */
  private static normalizeResponse(raw: any) {
    const score = raw.score || raw.creditScore || 0;
    let creditBand = 'UNKNOWN';
    let scoreRange = 'Unknown';

    if (score >= 750) { creditBand = 'EXCELLENT'; scoreRange = '750+'; }
    else if (score >= 700) { creditBand = 'GOOD'; scoreRange = '700-749'; }
    else if (score >= 650) { creditBand = 'FAIR'; scoreRange = '650-699'; }
    else if (score >= 600) { creditBand = 'BELOW_AVERAGE'; scoreRange = '600-649'; }
    else if (score > 0) { creditBand = 'POOR'; scoreRange = 'Below 600'; }

    return {
      score,
      creditBand,
      scoreRange,
      tradelines: raw.tradelines || [],
      inquiries: raw.inquiries || 0,
      delinquencies: raw.delinquencies || 0,
      publicRecords: raw.publicRecords || 0,
    };
  }

  /**
   * Mock credit result for sandbox/testing.
   */
  private static getMockCreditResult() {
    return {
      score: 720,
      creditScore: 720,
      tradelines: [
        { creditor: 'Bank of America', balance: 5000, limit: 10000, status: 'Current' },
        { creditor: 'Chase', balance: 2000, limit: 8000, status: 'Current' },
      ],
      inquiries: 2,
      delinquencies: 0,
      publicRecords: 0,
    };
  }
}
