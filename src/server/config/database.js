import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1', '8.8.8.8']);
import bcrypt from 'bcryptjs';
import env from './env.js';
import logger from './logger.js';
import Admin from '../modules/admin/admin.model.js';
import { PayrollConfig } from '../modules/payroll/payroll.model.js';
import SystemSettings from '../modules/settings/settings.model.js';

export let isDatabaseConnected = false;

// Register connection lifecycle event listeners at module level so they are always active
mongoose.connection.on('error', (err) => {
  logger.error(`Database runtime connection error: ${err}`);
});

mongoose.connection.on('connected', () => {
  logger.info('Database connection established.');
  isDatabaseConnected = true;
});

mongoose.connection.on('reconnected', () => {
  logger.info('Database reconnected.');
  isDatabaseConnected = true;
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Database connection lost.');
  isDatabaseConnected = false;
});

export const database = {
  /**
   * Establishes a connection to MongoDB
   */
  connect: async () => {
    if (env.nodeEnv === 'test') {
      logger.info('Database connection skipped in test environment.');
      return;
    }

    try {
      logger.info(`Attempting database connection to: ${env.dbUri.replace(/:([^:@]+)@/, ':****@')}`);

      // Serverless (Vercel) runs many short-lived instances against Atlas' connection limit
      // (500 on the shared tier). Measured: one burst of 25 API requests used 100+ connections
      // and kept them, so Atlas started refusing connections (TLS alert 80 → HTTP 500/503).
      //  - autoIndex: each cold start re-ran index checks for every model, inflating the pool.
      //    Indexes already exist; the long-running server (server.js) still maintains them.
      //  - small pool + idle timeout so each instance holds only a few connections, briefly.
      const isServerless = process.env.OMS_SERVERLESS === 'true';
      const mongooseOpts = {
        autoIndex: !isServerless,
        // Same for autoCreate (a createCollection call per model on every cold start);
        // MongoDB still creates a missing collection automatically on first insert.
        autoCreate: !isServerless,
        serverSelectionTimeoutMS: 15000, // Allow enough time for Atlas DNS resolution on local network
        ...(isServerless
          ? {
              maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '5', 10),
              minPoolSize: 0,
              maxIdleTimeMS: 10000
            }
          : {})
      };

      await mongoose.connect(env.dbUri, mongooseOpts);
      logger.info('Successfully established database connection.');
      isDatabaseConnected = true;

      // First-run seeding (default Super Admin, payroll config, system settings) is done by the
      // long-running server. Serverless instances start often and skip it: these records already
      // exist, and the three checks added a database round trip each to every cold start.
      if (isServerless) return;

      // Ensure at least one primary Super Admin account exists in the admins collection
      const adminCount = await Admin.countDocuments();
      if (adminCount === 0) {
        logger.info('Admins collection is empty. Initializing primary Super Admin account...');
        
        // Manually generate secure bcrypt hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password', salt);

        await Admin.create({
          id: 'EMP-2026-001',
          name: 'Super Admin',
          email: 'superadmin@saas.com',
          role: 'Super Admin',
          roleId: 'super_admin',
          status: 'Active',
          companyId: null,
          password: hashedPassword
        });
        logger.info('Primary Super Admin created successfully.');
      }

      // Initialize clean empty GLOBAL_CONFIG if it doesn't exist
      const existingConfig = await PayrollConfig.findOne({ id: 'GLOBAL_CONFIG' });
      if (!existingConfig) {
        await PayrollConfig.create({
          id: 'GLOBAL_CONFIG',
          leaveDeductionRate: 2000,
          lateArrivalPenalty: 300,
          overtimeHourlyRate: 500,
          taxProfiles: {},
          salaryStructures: {},
          attendanceDaysMap: {}
        });
        logger.info('Clean Payroll configuration initialized.');
      }

      // Initialize clean SystemSettings if not present
      const systemSettingsCount = await SystemSettings.countDocuments();
      if (systemSettingsCount === 0) {
        logger.info('system_settings collection is empty. Seeding default global settings...');
        await SystemSettings.create({ key: 'global', companyId: 'COMP-DEFAULT' });
        logger.info('Global system settings seeded successfully.');
      }

    } catch (error) {
      isDatabaseConnected = false;
      logger.warn(`[Offline Mode] MongoDB is offline or blocked (Error: ${error.message}). Gracefully falling back to secure in-memory execution...`);
    }
  },

  /**
   * Closes active database connection
   */
  disconnect: async () => {
    if (!isDatabaseConnected) return;
    try {
      await mongoose.disconnect();
      logger.info('Successfully terminated database connection.');
      isDatabaseConnected = false;
    } catch (error) {
      logger.error('Database disconnect error:', error);
    }
  }
};

export default database;
