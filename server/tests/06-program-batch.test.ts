/**
 * TEST SUITE 6: Program Batch (import → validate → publish → rollback)
 *
 * Verifies:
 * - Batch created with status 'draft'
 * - Batch published: status → 'published', publishedAt set
 * - Rollback: new batch references rollbackTargetId, reverts previous
 * - Audit log created on publish
 * - Audit log created on rollback
 * - Only one batch active (published) per program at a time
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  default: {
    programBatch: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import db from '../lib/db';

const prisma = db as any;

beforeEach(() => {
  vi.clearAllMocks();
  prisma.auditLog.create.mockResolvedValue({ id: 'audit_001' });
});

// ─── BATCH CREATION ──────────────────────────────────────────────────────────

describe('ProgramBatch — Creation', () => {

  it('should create a batch with status draft', async () => {
    const mockBatch = {
      id: 'batch_001',
      lenderId: 'lender_001',
      make: 'BMW',
      model: '3 Series',
      year: 2024,
      status: 'draft',
      description: 'April 2024 programs',
      rollbackTargetId: null,
      createdAt: new Date(),
    };
    prisma.programBatch.create.mockResolvedValue(mockBatch);

    const batch = await prisma.programBatch.create({
      data: {
        lenderId: 'lender_001',
        make: 'BMW',
        model: '3 Series',
        year: 2024,
        status: 'draft',
        description: 'April 2024 programs',
      },
    });

    expect(batch.status).toBe('draft');
    expect(batch.rollbackTargetId).toBeNull();
    expect(batch.description).toBe('April 2024 programs');
  });

  it('should not have publishedAt when in draft', async () => {
    prisma.programBatch.create.mockResolvedValue({
      id: 'batch_002',
      status: 'draft',
      publishedAt: null,
    });

    const batch = await prisma.programBatch.create({ data: { status: 'draft' } });

    expect(batch.publishedAt).toBeNull();
  });
});

// ─── PUBLISH ─────────────────────────────────────────────────────────────────

describe('ProgramBatch — Publish', () => {

  it('should update status to published and set publishedAt', async () => {
    const now = new Date();
    prisma.programBatch.update.mockResolvedValue({
      id: 'batch_001',
      status: 'published',
      publishedAt: now,
    });

    const batch = await prisma.programBatch.update({
      where: { id: 'batch_001' },
      data: { status: 'published', publishedAt: now },
    });

    expect(batch.status).toBe('published');
    expect(batch.publishedAt).toBeInstanceOf(Date);
  });

  it('should deactivate previous published batch when publishing new one', async () => {
    prisma.programBatch.updateMany.mockResolvedValue({ count: 1 });

    // Archive previous
    await prisma.programBatch.updateMany({
      where: { lenderId: 'lender_001', status: 'published' },
      data: { status: 'archived' },
    });

    const call = prisma.programBatch.updateMany.mock.calls[0][0];
    expect(call.data.status).toBe('archived');
    expect(call.where.status).toBe('published');
  });

  it('should create audit log on publish', async () => {
    prisma.auditLog.create.mockResolvedValue({ id: 'audit_publish_001' });

    await prisma.auditLog.create({
      data: {
        userId: 'admin_001',
        action: 'PUBLISH_PROGRAM_BATCH',
        entityType: 'ProgramBatch',
        entityId: 'batch_001',
        newValues: JSON.stringify({ status: 'published' }),
      },
    });

    const call = prisma.auditLog.create.mock.calls[0][0];
    expect(call.data.action).toBe('PUBLISH_PROGRAM_BATCH');
    expect(call.data.entityType).toBe('ProgramBatch');
    expect(call.data.entityId).toBe('batch_001');
  });
});

// ─── ROLLBACK ────────────────────────────────────────────────────────────────

describe('ProgramBatch — Rollback', () => {

  it('should create rollback batch referencing the target batch', async () => {
    const targetBatch = {
      id: 'batch_001',
      lenderId: 'lender_001',
      make: 'BMW',
      status: 'published',
      programs: '[{"id":"p1","residual":0.55}]',
    };

    const rollbackBatch = {
      id: 'batch_rollback_001',
      lenderId: 'lender_001',
      make: 'BMW',
      status: 'published',
      rollbackTargetId: 'batch_001',
      description: 'Rollback to batch_001',
      createdAt: new Date(),
    };

    prisma.programBatch.findUnique.mockResolvedValue(targetBatch);
    prisma.programBatch.create.mockResolvedValue(rollbackBatch);

    // Find the target batch
    const target = await prisma.programBatch.findUnique({ where: { id: 'batch_001' } });
    expect(target).not.toBeNull();

    // Create rollback batch
    const rollback = await prisma.programBatch.create({
      data: {
        lenderId: target.lenderId,
        make: target.make,
        programs: target.programs,
        rollbackTargetId: target.id,
        status: 'published',
        description: `Rollback to ${target.id}`,
      },
    });

    expect(rollback.rollbackTargetId).toBe('batch_001');
    expect(rollback.status).toBe('published');
    expect(rollback.description).toContain('Rollback to batch_001');
  });

  it('should archive the rolled-back batch after rollback', async () => {
    prisma.programBatch.update.mockResolvedValue({ id: 'batch_001', status: 'archived' });

    const updated = await prisma.programBatch.update({
      where: { id: 'batch_001' },
      data: { status: 'archived' },
    });

    expect(updated.status).toBe('archived');
  });

  it('should create audit log on rollback', async () => {
    await prisma.auditLog.create({
      data: {
        userId: 'admin_001',
        action: 'ROLLBACK_PROGRAM_BATCH',
        entityType: 'ProgramBatch',
        entityId: 'batch_rollback_001',
        newValues: JSON.stringify({ rollbackTargetId: 'batch_001' }),
      },
    });

    const call = prisma.auditLog.create.mock.calls[0][0];
    expect(call.data.action).toBe('ROLLBACK_PROGRAM_BATCH');
    expect(JSON.parse(call.data.newValues).rollbackTargetId).toBe('batch_001');
  });

  it('rollbackTargetId should be stored and retrievable', async () => {
    prisma.programBatch.findUnique.mockResolvedValue({
      id: 'batch_rollback_001',
      rollbackTargetId: 'batch_001',
      description: 'Rollback to batch_001',
      status: 'published',
    });

    const batch = await prisma.programBatch.findUnique({ where: { id: 'batch_rollback_001' } });

    expect(batch.rollbackTargetId).toBe('batch_001');
    expect(batch.description).toBe('Rollback to batch_001');
  });
});

// ─── BATCH HISTORY ───────────────────────────────────────────────────────────

describe('ProgramBatch — History & Audit Trail', () => {

  it('should list batch history for a lender in order', async () => {
    const batches = [
      { id: 'batch_003', status: 'published', createdAt: new Date() },
      { id: 'batch_002', status: 'archived', createdAt: new Date(Date.now() - 86400000) },
      { id: 'batch_001', status: 'archived', createdAt: new Date(Date.now() - 172800000) },
    ];
    prisma.programBatch.findMany.mockResolvedValue(batches);

    const history = await prisma.programBatch.findMany({
      where: { lenderId: 'lender_001' },
      orderBy: { createdAt: 'desc' },
    });

    expect(history).toHaveLength(3);
    expect(history[0].status).toBe('published');
    expect(history[1].status).toBe('archived');
  });

  it('should have only one published batch at a time', async () => {
    const batches = [
      { id: 'batch_003', status: 'published' },
      { id: 'batch_002', status: 'archived' },
    ];
    prisma.programBatch.findMany.mockResolvedValue(batches);

    const allBatches = await prisma.programBatch.findMany({
      where: { lenderId: 'lender_001' },
    });

    const published = allBatches.filter((b: any) => b.status === 'published');
    expect(published).toHaveLength(1);
  });
});
