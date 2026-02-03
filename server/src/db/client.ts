import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import type { Database } from '../types/database.js';

class DatabaseClient {
  private client: any;
  private retryAttempts = 3;
  private retryDelay = 1000;

  constructor() {
    this.client = createClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      }
    );
    logger.info('Database client initialized');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        logger.warn({ error }, 'Database health check failed');
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, 'Database health check error');
      return false;
    }
  }

  async query(sql: string, params?: any[]) {
    let lastError: Error | null = null;

    for (let i = 0; i < this.retryAttempts; i++) {
      try {
        const { data, error } = await this.client.rpc('execute_sql', {
          sql,
          params: params || [],
        });

        if (error) throw error;
        return data;
      } catch (error) {
        lastError = error as Error;

        if (i < this.retryAttempts - 1) {
          const delay = this.retryDelay * Math.pow(2, i);
          logger.warn({ attempt: i + 1, totalAttempts: this.retryAttempts, delay }, 'Query retry attempt');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  async transaction<T>(callback: (db: any) => Promise<T>): Promise<T> {
    try {
      // Begin transaction
      const result = await callback(this.client);
      return result;
    } catch (error) {
      logger.error({ error }, 'Transaction failed');
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  // Helper methods for common operations
  async select(table: string, filters?: Record<string, any>) {
    let query = this.client.from(table).select('*');

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async insert(table: string, data: any) {
    const { data: inserted, error } = await this.client
      .from(table)
      .insert([data])
      .select();

    if (error) throw error;
    return inserted;
  }

  async update(table: string, data: any, filters: Record<string, any>) {
    let query = this.client.from(table).update(data);

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data: updated, error } = await query.select();
    if (error) throw error;
    return updated;
  }

  async delete(table: string, filters: Record<string, any>) {
    let query = this.client.from(table);

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { error } = await query.delete();
    if (error) throw error;
  }
}

export const db = new DatabaseClient();
