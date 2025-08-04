// src/metrics.ts
import {
  register,
  Gauge,
  Histogram,
  Counter,
} from "npm:prom-client";
import { MetricsData, MisskeyApiResponse, MisskeyMeta } from "./types.ts";

export class MetricsCollector {
  // User metrics
  private usersTotal = new Gauge({
    name: "misskey_users_total",
    help: "Total number of local users",
  });

  private activeUsers = new Gauge({
    name: "misskey_active_users",
    help: "Number of active users by period",
    labelNames: ["period"],
  });

  // Content metrics
  private notesTotal = new Gauge({
    name: "misskey_notes_total",
    help: "Total number of notes",
  });

  private notesCreated = new Gauge({
    name: "misskey_notes_created",
    help: "Number of notes created by period",
    labelNames: ["period"],
  });

  // Federation metrics
  private federationInstances = new Gauge({
    name: "misskey_federation_instances_total",
    help: "Number of federated instances",
  });

  private federationRemoteUsers = new Gauge({
    name: "misskey_federation_remote_users_total",
    help: "Number of remote users",
  });

  // Database metrics
  private databaseConnections = new Gauge({
    name: "misskey_database_connections",
    help: "Number of database connections",
  });

  private databaseSize = new Gauge({
    name: "misskey_database_size_bytes",
    help: "Database size in bytes",
  });

  // API metrics
  private serverStats = new Gauge({
    name: "misskey_server_stats",
    help: "Server statistics from Misskey API",
    labelNames: ["type"],
  });

  private instanceInfo = new Gauge({
    name: "misskey_instance_info",
    help: "Instance information",
    labelNames: ["name", "version", "node_version"],
  });

  // Exporter metrics
  private scrapeDuration = new Histogram({
    name: "misskey_exporter_scrape_duration_seconds",
    help: "Time spent scraping metrics",
    labelNames: ["source"],
    buckets: [0.1, 0.5, 1, 2, 5],
  });

  private scrapeErrors = new Counter({
    name: "misskey_exporter_scrape_errors_total",
    help: "Total number of scrape errors",
    labelNames: ["source"],
  });

  updateDatabaseMetrics(data: MetricsData): void {
    this.usersTotal.set(data.totalUsers);

    this.activeUsers.labels("daily").set(data.activeUsers.daily);
    this.activeUsers.labels("weekly").set(data.activeUsers.weekly);
    this.activeUsers.labels("monthly").set(data.activeUsers.monthly);

    this.notesTotal.set(data.totalNotes);
    this.notesCreated.labels("daily").set(data.recentNotes.daily);

    this.federationInstances.set(data.federation.instances);
    this.federationRemoteUsers.set(data.federation.remoteUsers);

    this.databaseConnections.set(data.database.connections);
    this.databaseSize.set(data.database.size);
  }

  updateApiMetrics(stats: MisskeyApiResponse | null, meta: MisskeyMeta | null): void {
    if (stats) {
      this.serverStats.labels("notes").set(stats.notesCount || 0);
      this.serverStats.labels("users").set(stats.usersCount || 0);
      this.serverStats.labels("instances").set(stats.instancesCount || 0);
    }

    if (meta) {
      this.instanceInfo
        .labels(
          meta.name || "unknown",
          meta.version || "unknown",
          meta.nodeVersion || "unknown"
        )
        .set(1);
    }
  }

  recordScrapeDuration(source: string, duration: number): void {
    this.scrapeDuration.labels(source).observe(duration);
  }

  recordScrapeError(source: string): void {
    this.scrapeErrors.labels(source).inc();
  }

  async getMetrics(): Promise<string> {
    return await register.metrics();
  }

  getContentType(): string {
    return register.contentType;
  }
}
