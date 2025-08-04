import { Client } from "jsr:@db/postgres";
import { DatabaseConfig, MetricsData } from "./types.ts";
import * as log from "jsr:@std/log";

export class Database {
  private client: Client;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 5000; // 5 seconds

  constructor(private config: DatabaseConfig) {
    this.client = new Client({
      hostname: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      this.reconnectAttempts = 0;
      log.info("Database connected successfully");
    } catch (error) {
      log.error("Database connection failed:", error);
      throw error;
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.connected) {
      log.warn("Database connection lost, attempting to reconnect...");
      await this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error(`Failed to reconnect to database after ${this.maxReconnectAttempts} attempts`);
    }

    this.reconnectAttempts++;
    log.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    try {
      // Close existing connection if any
      if (this.connected) {
        await this.client.end();
        this.connected = false;
      }

      // Create new client
      this.client = new Client({
        hostname: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
      });

      await this.client.connect();
      this.connected = true;
      this.reconnectAttempts = 0;
      log.info("Database reconnected successfully");
    } catch (error) {
      log.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        log.info(`Waiting ${this.reconnectDelay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        await this.reconnect();
      } else {
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
    }
  }

  async getUserCount(): Promise<number> {
    await this.ensureConnection();
    try {
      const result = await this.client.queryObject<{ count: string }>(
        'SELECT COUNT(*) FROM "user" WHERE "host" IS NULL'
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async getActiveUsers(interval: string): Promise<number> {
    await this.ensureConnection();
    try {
      const query = `
        SELECT COUNT(*) FROM "user"
        WHERE "host" IS NULL
        AND "lastActiveDate" > NOW() - INTERVAL '${interval}'
      `;
      const result = await this.client.queryObject<{ count: string }>(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async getNotesCount(): Promise<number> {
    await this.ensureConnection();
    try {
      const result = await this.client.queryObject<{ count: string }>(
        'SELECT COUNT(*) FROM "note"'
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async getRecentNotes(interval: string): Promise<number> {
    await this.ensureConnection();
    try {
      // Misskey uses AID format: 8 chars of base36 timestamp + 2 chars noise
      // TIME2000 = 946684800000 (2000-01-01 00:00:00 UTC in milliseconds)
      const TIME2000 = 946684800000;

      // Calculate the timestamp for the interval ago
      const now = Date.now();
      const intervalMs = this.parseInterval(interval);
      const targetTime = now - intervalMs;

      // Convert to AID format: (timestamp - TIME2000) in base36, padded to 8 chars
      const aidTime = (targetTime - TIME2000).toString(36).padStart(8, '0');

      const query = `
        SELECT COUNT(*) FROM "note"
        WHERE "id" > $1
      `;
      const result = await this.client.queryObject<{ count: string }>(query, [aidTime + '00']);
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  private parseInterval(interval: string): number {
    // Convert interval string to milliseconds
    if (interval === '1 day') return 24 * 60 * 60 * 1000;
    if (interval === '7 days') return 7 * 24 * 60 * 60 * 1000;
    if (interval === '30 days') return 30 * 24 * 60 * 60 * 1000;

    // Parse generic format like "1 day", "7 days", etc.
    const match = interval.match(/(\d+)\s*(day|hour|minute)s?/);
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case 'day': return num * 24 * 60 * 60 * 1000;
        case 'hour': return num * 60 * 60 * 1000;
        case 'minute': return num * 60 * 1000;
      }
    }

    // Default to 1 day if parsing fails
    return 24 * 60 * 60 * 1000;
  }

  async getFederatedInstancesCount(): Promise<number> {
    await this.ensureConnection();
    try {
      const result = await this.client.queryObject<{ count: string }>(
        'SELECT COUNT(*) FROM "instance"'
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async getRemoteUsersCount(): Promise<number> {
    await this.ensureConnection();
    try {
      const result = await this.client.queryObject<{ count: string }>(
        'SELECT COUNT(*) FROM "user" WHERE "host" IS NOT NULL'
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async getConnectionCount(): Promise<number> {
    await this.ensureConnection();
    try {
      const result = await this.client.queryObject<{ count: string }>(`
        SELECT count(*)
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async getDatabaseSize(): Promise<number> {
    await this.ensureConnection();
    try {
      const result = await this.client.queryObject<{ size: string }>(`
        SELECT pg_database_size(current_database()) as size
      `);
      return parseInt(result.rows[0].size);
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async getTopHashtags(limit = 10): Promise<Array<{ tag: string; count: string }>> {
    await this.ensureConnection();
    try {
      const query = `
        SELECT "tag", COUNT(*) as count
        FROM "note_hashtag"
        JOIN "hashtag" ON "note_hashtag"."hashtagId" = "hashtag"."id"
        GROUP BY "tag"
        ORDER BY count DESC
        LIMIT ${limit}
      `;
      const result = await this.client.queryObject<{ tag: string; count: string }>(query);
      return result.rows;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async getAllMetrics(): Promise<MetricsData> {
    await this.ensureConnection();

    try {
      const [
        totalUsers,
        dailyActive,
        weeklyActive,
        monthlyActive,
        totalNotes,
        dailyNotes,
        federatedInstances,
        remoteUsers,
        connections,
        dbSize,
      ] = await Promise.all([
        this.getUserCount(),
        this.getActiveUsers("1 day"),
        this.getActiveUsers("7 days"),
        this.getActiveUsers("30 days"),
        this.getNotesCount(),
        this.getRecentNotes("1 day"),
        this.getFederatedInstancesCount(),
        this.getRemoteUsersCount(),
        this.getConnectionCount(),
        this.getDatabaseSize(),
      ]);

      return {
        totalUsers,
        activeUsers: {
          daily: dailyActive,
          weekly: weeklyActive,
          monthly: monthlyActive,
        },
        totalNotes,
        recentNotes: {
          daily: dailyNotes,
        },
        federation: {
          instances: federatedInstances,
          remoteUsers,
        },
        database: {
          connections,
          size: dbSize,
        },
      };
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }
}
