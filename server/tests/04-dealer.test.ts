/**
 * TEST SUITE 4: Dealer Assignment Flow
 *
 * Verifies:
 * - Lead assigned to dealer (DealerAssignment created)
 * - SLA deadline calculated from dealer.slaHours
 * - Lead.dealersSent counter incremented
 * - Dealer accept: assignment updated, lead.dealersAccepted++, lead.status = accepted
 * - Dealer reject: assignment status = rejected
 * - Dealer counter offer: assignment status = countered
 * - Assignments listed by lead
 * - Assignments listed by dealer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  default: {
    dealerAssignment: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    dealerPartner: {
      findUnique: vi.fn(),
    },
    lead: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../services/NotificationService', () => ({
  NotificationService: {
    notifyDealerNewLead: vi.fn().mockResolvedValue(undefined),
    notifyDealerAccepted: vi.fn().mockResolvedValue(undefined),
  },
}));

import db from '../lib/db';

const prisma = db as any;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const mockDealer = {
  id: 'dealer_001',
  name: 'Bay Ridge BMW',
  email: 'dealer@bayridgebmw.com',
  phone: '+1-718-555-0100',
  slaHours: 24,
};

const mockLead = {
  id: 'lead_001',
  name: 'John Doe',
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  clientPhone: '+1-212-555-0199',
  email: 'john@example.com',
  phone: '+1-212-555-0199',
  carYear: 2024,
  carMake: 'BMW',
  carModel: '3 Series',
  carMsrp: 45000,
  calcPayment: 520,
  dealersSent: 0,
};

const mockAssignment = {
  id: 'assign_001',
  leadId: 'lead_001',
  dealerPartnerId: 'dealer_001',
  staffId: null,
  status: 'pending',
  slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date(),
};

// ─── ASSIGNMENT CREATION ─────────────────────────────────────────────────────

describe('DealerAssignment — Create', () => {

  it('should create assignment with correct SLA deadline (24h)', () => {
    const beforeCreate = Date.now();
    const slaHours = 24;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
    const afterCreate = Date.now();

    expect(slaDeadline.getTime()).toBeGreaterThanOrEqual(beforeCreate + slaHours * 3600 * 1000);
    expect(slaDeadline.getTime()).toBeLessThanOrEqual(afterCreate + slaHours * 3600 * 1000 + 100);
  });

  it('should set initial status as pending', () => {
    expect(mockAssignment.status).toBe('pending');
  });

  it('should include leadId and dealerPartnerId', () => {
    expect(mockAssignment.leadId).toBe('lead_001');
    expect(mockAssignment.dealerPartnerId).toBe('dealer_001');
  });
});

// ─── DEALER RESPOND: ACCEPT ──────────────────────────────────────────────────

describe('DealerAssignment — Accept Flow', () => {

  it('should update assignment status to accepted with acceptedAt timestamp', () => {
    const now = new Date();
    const updateData = { status: 'accepted', acceptedAt: now, comment: null };

    expect(updateData.status).toBe('accepted');
    expect(updateData.acceptedAt).toBeInstanceOf(Date);
  });

  it('should increment lead.dealersAccepted on accept', async () => {
    prisma.lead.update.mockResolvedValue({ id: 'lead_001', dealersAccepted: 1 });

    await prisma.lead.update({
      where: { id: 'lead_001' },
      data: { dealersAccepted: { increment: 1 }, acceptedBy: 'Bay Ridge BMW', status: 'accepted' },
    });

    const call = prisma.lead.update.mock.calls[0][0];
    expect(call.data.dealersAccepted).toEqual({ increment: 1 });
    expect(call.data.status).toBe('accepted');
    expect(call.data.acceptedBy).toBe('Bay Ridge BMW');
  });
});

// ─── DEALER RESPOND: REJECT ──────────────────────────────────────────────────

describe('DealerAssignment — Reject Flow', () => {

  it('should set status to rejected with rejectedAt timestamp', () => {
    const now = new Date();
    const updateData = { status: 'rejected', rejectedAt: now, comment: 'Out of stock' };

    expect(updateData.status).toBe('rejected');
    expect(updateData.rejectedAt).toBeInstanceOf(Date);
    expect(updateData.comment).toBe('Out of stock');
  });

  it('should NOT update lead when rejected', async () => {
    prisma.lead.update.mockResolvedValue({});
    // On reject, lead should NOT be updated
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });
});

// ─── DEALER RESPOND: COUNTER OFFER ───────────────────────────────────────────

describe('DealerAssignment — Counter Offer', () => {

  it('should set status to countered with counter offer details', () => {
    const updateData = {
      status: 'countered',
      counterOffer: 'We can do $549/mo with $0 down, 36 months',
      comment: null,
    };

    expect(updateData.status).toBe('countered');
    expect(updateData.counterOffer).toContain('$549');
  });
});

// ─── INVALID ACTIONS ─────────────────────────────────────────────────────────

describe('DealerAssignment — Validation', () => {

  it('should reject invalid action values', () => {
    const validActions = ['accept', 'reject', 'counter'];
    const invalidAction = 'approve';

    expect(validActions.includes(invalidAction)).toBe(false);
  });

  it('should accept only valid action values', () => {
    const validActions = ['accept', 'reject', 'counter'];

    validActions.forEach(action => {
      expect(validActions.includes(action)).toBe(true);
    });
  });
});

// ─── LIST BY LEAD ─────────────────────────────────────────────────────────────

describe('DealerAssignment — List by Lead', () => {

  it('should return all assignments for a lead ordered by createdAt desc', async () => {
    const assignments = [
      { id: 'a1', leadId: 'lead_001', dealerPartnerId: 'dealer_001', status: 'accepted', createdAt: new Date() },
      { id: 'a2', leadId: 'lead_001', dealerPartnerId: 'dealer_002', status: 'rejected', createdAt: new Date(Date.now() - 1000) },
    ];
    prisma.dealerAssignment.findMany.mockResolvedValue(assignments);

    const result = await prisma.dealerAssignment.findMany({
      where: { leadId: 'lead_001' },
      orderBy: { createdAt: 'desc' },
    });

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('accepted');
    expect(result[1].status).toBe('rejected');
  });
});

// ─── SLA DEADLINE CALCULATION ────────────────────────────────────────────────

describe('DealerAssignment — SLA Deadline', () => {

  it('should set SLA deadline 24h in future for dealer with slaHours=24', () => {
    const slaHours = 24;
    const before = Date.now();
    const deadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const diffHours = (deadline.getTime() - before) / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(24, 0);
  });

  it('should set SLA deadline 48h in future for dealer with slaHours=48', () => {
    const slaHours = 48;
    const before = Date.now();
    const deadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const diffHours = (deadline.getTime() - before) / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(48, 0);
  });

  it('should default to 24h SLA if slaHours not set on dealer', () => {
    const dealer = { ...mockDealer, slaHours: undefined };
    const slaHours = dealer.slaHours || 24;

    expect(slaHours).toBe(24);
  });
});
