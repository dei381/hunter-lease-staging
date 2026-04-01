import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditLogger {
  static async log(
    userId: string | undefined | null,
    action: string,
    entity: string,
    entityId?: string,
    details?: any
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: userId || 'system',
          action,
          entity,
          entityId,
          details: details ? JSON.stringify(details) : null,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}
