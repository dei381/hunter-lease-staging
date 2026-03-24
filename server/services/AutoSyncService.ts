import fs from 'fs';
import path from 'path';
import { FinancialSyncService } from "./FinancialSyncService";
import db from "../lib/db";

const prisma = db;

export class AutoSyncService {
  private static isSyncing = false;

  /**
   * Checks if a sync is needed (more than 15 days since last sync)
   * and triggers it if necessary.
   */
  static async checkAndSync(force = false) {
    if (this.isSyncing) return { status: 'already_syncing' };

    try {
      const record = await prisma.siteSettings.findUnique({ where: { id: 'car_db' } });
      let carDb = record ? JSON.parse(record.data || '{}') : {};
      
      console.log(`AutoSyncService: record exists: ${!!record}, carDb.makes exists: ${!!carDb.makes}, carDb.makes.length: ${carDb.makes?.length}`);

      // Seed from cars.json if database is empty or missing makes
      if (!carDb.makes || carDb.makes.length === 0) {
        console.log("AutoSyncService: Database is empty. Seeding from cars.json...");
        try {
          const carsPath = path.join(process.cwd(), 'server/data/cars.json');
          carDb = JSON.parse(fs.readFileSync(carsPath, 'utf-8'));
          console.log(`AutoSyncService: Loaded ${carDb.makes.length} makes from cars.json`);
        } catch (err) {
          console.error("AutoSyncService: Failed to read cars.json:", err);
          return { status: 'error', message: 'Failed to seed database from cars.json' };
        }
        
        // Save the seeded data immediately
        await prisma.siteSettings.upsert({
          where: { id: 'car_db' },
          update: { data: JSON.stringify(carDb) },
          create: { id: 'car_db', data: JSON.stringify(carDb) }
        });
      }

      const lastSync = carDb.lastGlobalSync ? new Date(carDb.lastGlobalSync) : new Date(0);
      
      const now = new Date();
      const diffInDays = (now.getTime() - lastSync.getTime()) / (1000 * 3600 * 24);
      
      // Sync every 1 day to spread out API requests
      if (diffInDays >= 1 || force) {
        console.log(`AutoSyncService: ${force ? 'Forced sync' : 'Last sync was ' + diffInDays.toFixed(1) + ' days ago'}. Starting sync...`);
        return await this.runSync(carDb);
      } else {
        console.log(`AutoSyncService: Last sync was ${diffInDays.toFixed(1)} days ago. No sync needed.`);
        return { status: 'no_sync_needed', diffInDays };
      }
    } catch (error: any) {
      console.error("AutoSyncService: Error checking sync status:", error);
      return { status: 'error', error: error.message };
    }
  }

  private static async runSync(carDb: any) {
    this.isSyncing = true;
    const apiKey = (process.env.MARKETCHECK_API_KEY || process.env.API_KEY || '').trim();
    
    if (!apiKey) {
      console.error("AutoSyncService: No API key found. Cannot sync.");
      const report = {
        status: 'error',
        message: 'Marketcheck API Key is not configured. Please set MARKETCHECK_API_KEY in Secrets.',
        timestamp: new Date().toISOString()
      };
      await this.saveReport(report);
      this.isSyncing = false;
      return report;
    }

    try {
      // Initial progress report
      await this.saveReport({
        status: 'syncing',
        message: 'Sync in progress...',
        timestamp: new Date().toISOString()
      });

      const result = await FinancialSyncService.syncFromExternalAPI(apiKey, carDb);
      
      // Update the carDb object
      Object.assign(carDb, result.updatedDb);
      
      // Persist to database
      await prisma.siteSettings.upsert({
        where: { id: 'car_db' },
        update: { data: JSON.stringify(carDb) },
        create: { id: 'car_db', data: JSON.stringify(carDb) }
      });

      const report = {
        status: result.stats.quotaExhausted ? 'partial_success' : 'success',
        message: result.stats.quotaExhausted ? 'Auto-sync stopped early due to API quota limit' : 'Auto-sync completed successfully',
        stats: result.stats,
        timestamp: new Date().toISOString()
      };
      await this.saveReport(report);

      console.log("AutoSyncService: Auto-sync completed successfully.");
      return report;
    } catch (error: any) {
      console.error("AutoSyncService: Auto-sync failed:", error);
      const report = {
        status: 'error',
        message: error.message || 'Unknown error during auto-sync',
        timestamp: new Date().toISOString()
      };
      await this.saveReport(report);
      return report;
    } finally {
      this.isSyncing = false;
    }
  }

  private static async saveReport(report: any) {
    try {
      await prisma.siteSettings.upsert({
        where: { id: 'sync_report' },
        update: { data: JSON.stringify(report) },
        create: { id: 'sync_report', data: JSON.stringify(report) }
      });
    } catch (error) {
      console.error("AutoSyncService: Failed to save sync report:", error);
    }
  }

  static async getReport() {
    try {
      const record = await prisma.siteSettings.findUnique({ where: { id: 'sync_report' } });
      return record ? JSON.parse(record.data || '{}') : null;
    } catch (error) {
      console.error("AutoSyncService: Failed to get sync report:", error);
      return null;
    }
  }
}
