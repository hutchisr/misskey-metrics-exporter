import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { register } from "npm:prom-client";
import { MetricsCollector } from "../src/metrics.ts";
import { MetricsData, MisskeyApiResponse, MisskeyMeta } from "../src/types.ts";

Deno.test("MetricsCollector updateDatabaseMetrics sets gauges", async () => {
  register.clear();
  const collector = new MetricsCollector();
  
  const testData: MetricsData = {
    totalUsers: 100,
    activeUsers: {
      daily: 10,
      weekly: 25,
      monthly: 50,
    },
    totalNotes: 1000,
    recentNotes: {
      daily: 50,
    },
    federation: {
      instances: 5,
      remoteUsers: 200,
    },
    database: {
      connections: 10,
      size: 1024000,
    },
  };

  collector.updateDatabaseMetrics(testData);
  
  const metrics = await collector.getMetrics();
  assertStringIncludes(metrics, "misskey_users_total 100");
  assertStringIncludes(metrics, "misskey_active_users{period=\"daily\"} 10");
  assertStringIncludes(metrics, "misskey_notes_total 1000");
  assertStringIncludes(metrics, "misskey_federation_instances_total 5");
});

Deno.test("MetricsCollector updateApiMetrics handles null values", async () => {
  register.clear();
  const collector = new MetricsCollector();
  
  collector.updateApiMetrics(null, null);
  
  const metrics = await collector.getMetrics();
  assertEquals(typeof metrics, "string");
});

Deno.test("MetricsCollector updateApiMetrics sets server stats", async () => {
  register.clear();
  const collector = new MetricsCollector();
  
  const stats: MisskeyApiResponse = {
    notesCount: 500,
    usersCount: 50,
    instancesCount: 3,
  };

  const meta: MisskeyMeta = {
    name: "Test Instance",
    version: "1.0.0",
    nodeVersion: "18.0.0",
  };

  collector.updateApiMetrics(stats, meta);
  
  const metrics = await collector.getMetrics();
  assertStringIncludes(metrics, "misskey_server_stats{type=\"notes\"} 500");
  assertStringIncludes(metrics, "misskey_instance_info{name=\"Test Instance\",version=\"1.0.0\",node_version=\"18.0.0\"} 1");
});

Deno.test("MetricsCollector recordScrapeDuration updates histogram", async () => {
  register.clear();
  const collector = new MetricsCollector();
  
  collector.recordScrapeDuration("api", 1.5);
  
  const metrics = await collector.getMetrics();
  assertStringIncludes(metrics, "misskey_exporter_scrape_duration_seconds");
});

Deno.test("MetricsCollector recordScrapeError increments counter", async () => {
  register.clear();
  const collector = new MetricsCollector();
  
  collector.recordScrapeError("database");
  
  const metrics = await collector.getMetrics();
  assertStringIncludes(metrics, "misskey_exporter_scrape_errors_total");
});

Deno.test("MetricsCollector getContentType returns prometheus content type", () => {
  register.clear();
  const collector = new MetricsCollector();
  
  const contentType = collector.getContentType();
  assertStringIncludes(contentType, "text/plain");
});