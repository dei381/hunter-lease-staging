import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma client instance for the MVP calculator.
 * This ensures we reuse the connection pool across the application.
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;

/**
 * Minimal connection health check for the Phase 1 MVP.
 */
export async function checkDbConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified for MVP Calculator.');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
