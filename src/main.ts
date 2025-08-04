// src/main.ts
import * as log from "jsr:@std/log";
import { Database } from "./database.ts";
import { ApiClient } from "./api-client.ts";
import { MetricsCollector } from "./metrics.ts";
import { getConfig } from "./config.ts";

class MisskeyMetricsExporter {
  private database: Database;
  private apiClient: ApiClient;
  private metrics: MetricsCollector;
  private config = getConfig();
  private isUpdating = false;
  private updateTimer?: number;

  constructor() {
    this.database = new Database(this.config.database);
    this.apiClient = new ApiClient(this.config.misskeyUrl);
    this.metrics = new MetricsCollector();
  }

  async start(): Promise<void> {
    await this.setupLogging();

    log.info("Starting Misskey Metrics Exporter...");
    log.info(`Configuration: ${JSON.stringify(this.config, null, 2)}`);

    try {
      await this.database.connect();
      await this.startPeriodicUpdates();
      this.startWebServer();
    } catch (error) {
      log.error("Failed to start exporter:", error);
      Deno.exit(1);
    }
  }

  private async setupLogging(): Promise<void> {
    await log.setup({
      handlers: {
        console: new log.ConsoleHandler("DEBUG", {
          formatter: (logRecord) => `${logRecord.datetime} ${logRecord.levelName} ${logRecord.msg}`,
        }),
      },
      loggers: {
        default: {
          level: "INFO",
          handlers: ["console"],
        },
      },
    });
  }

  private async updateMetrics(): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      log.info("Updating metrics...");

      // Database metrics
      await this.updateDatabaseMetrics();

      // API metrics
      await this.updateApiMetrics();

      log.info("Metrics updated successfully");
    } catch (error) {
      log.error("Failed to update metrics:", error);
      this.metrics.recordScrapeError("general");
    } finally {
      this.isUpdating = false;
    }
  }

  private async updateDatabaseMetrics(): Promise<void> {
    const startTime = performance.now();

    try {
      const data = await this.database.getAllMetrics();
      this.metrics.updateDatabaseMetrics(data);

      const duration = (performance.now() - startTime) / 1000;
      this.metrics.recordScrapeDuration("database", duration);
    } catch (error) {
      log.error(`Database metrics update failed:`);
      const err = error as Error;
      log.error(`Error type: ${err.constructor?.name || 'Unknown'}`);
      log.error(`Error message: ${err.message || String(error)}`);
      log.error(`Database config: ${JSON.stringify({
        host: this.config.database.host,
        port: this.config.database.port,
        database: this.config.database.database,
        user: this.config.database.user,
        passwordSet: !!this.config.database.password
      })}`);
      if (err.stack) {
        log.error(`Stack trace: ${err.stack}`);
      }
      this.metrics.recordScrapeError("database");
      throw error;
    }
  }

  private async updateApiMetrics(): Promise<void> {
    const startTime = performance.now();

    try {
      const [stats, meta] = await Promise.all([
        this.apiClient.getServerStats(),
        this.apiClient.getInstanceMeta(),
      ]);

      this.metrics.updateApiMetrics(stats, meta);

      const duration = (performance.now() - startTime) / 1000;
      this.metrics.recordScrapeDuration("api", duration);
    } catch (error) {
      log.error("API metrics update failed:", error);
      this.metrics.recordScrapeError("api");
      // Don't throw - API might be temporarily unavailable
    }
  }

  private async startPeriodicUpdates(): Promise<void> {
    // Initial update
    await this.updateMetrics();

    // Schedule periodic updates
    this.updateTimer = setInterval(async () => {
      await this.updateMetrics();
    }, this.config.updateInterval);
  }

  private startWebServer(): void {
    const handler = async (request: Request): Promise<Response> => {
      const url = new URL(request.url);

      if (url.pathname === "/metrics") {
        try {
          const metrics = await this.metrics.getMetrics();
          return new Response(metrics, {
            headers: {
              "Content-Type": this.metrics.getContentType(),
            },
          });
        } catch (error) {
          log.error("Failed to generate metrics:", error);
          return new Response("Internal Server Error", { status: 500 });
        }
      }

      if (url.pathname === "/health") {
        const isHealthy = await this.checkHealth();
        const status = isHealthy ? 200 : 503;

        return new Response(JSON.stringify({
          status: isHealthy ? "healthy" : "unhealthy",
          timestamp: new Date().toISOString(),
          isUpdating: this.isUpdating,
        }), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404 });
    };

    log.info(`Starting web server on port ${this.config.port}`);
    Deno.serve({ port: this.config.port }, handler);
  }

  private async checkHealth(): Promise<boolean> {
    try {
      // Check database connection
      await this.database.getUserCount();

      // Check API connectivity (optional)
      const apiHealthy = await this.apiClient.ping();

      return true; // Database is more critical than API
    } catch {
      return false;
    }
  }

  async shutdown(): Promise<void> {
    log.info("Shutting down exporter...");

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    await this.database.disconnect();
    log.info("Exporter shutdown complete");
  }
}

// Handle graceful shutdown
const exporter = new MisskeyMetricsExporter();

Deno.addSignalListener("SIGINT", async () => {
  await exporter.shutdown();
  Deno.exit(0);
});

Deno.addSignalListener("SIGTERM", async () => {
  await exporter.shutdown();
  Deno.exit(0);
});

// Start the exporter
if (import.meta.main) {
  await exporter.start();
}
