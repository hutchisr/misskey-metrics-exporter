import { assertEquals } from "jsr:@std/assert";
import { getConfig } from "../src/config.ts";

Deno.test("getConfig returns default values when env vars not set", () => {
  const config = getConfig();
  
  assertEquals(config.port, 9090);
  assertEquals(config.updateInterval, 60000);
  assertEquals(config.enableLogParsing, false);
  assertEquals(config.misskeyUrl, "http://localhost:3000");
  assertEquals(config.database.host, "localhost");
  assertEquals(config.database.port, 5432);
  assertEquals(config.database.database, "misskey");
  assertEquals(config.database.user, "misskey");
  assertEquals(config.database.password, "");
});

Deno.test("getConfig uses environment variables when set", () => {
  Deno.env.set("PORT", "8080");
  Deno.env.set("UPDATE_INTERVAL", "30000");
  Deno.env.set("ENABLE_LOG_PARSING", "true");
  Deno.env.set("MISSKEY_URL", "https://example.com");
  Deno.env.set("DB_HOST", "db.example.com");
  Deno.env.set("DB_PORT", "3306");
  Deno.env.set("DB_NAME", "test_db");
  Deno.env.set("DB_USER", "test_user");
  Deno.env.set("DB_PASSWORD", "secret");

  const config = getConfig();
  
  assertEquals(config.port, 8080);
  assertEquals(config.updateInterval, 30000);
  assertEquals(config.enableLogParsing, true);
  assertEquals(config.misskeyUrl, "https://example.com");
  assertEquals(config.database.host, "db.example.com");
  assertEquals(config.database.port, 3306);
  assertEquals(config.database.database, "test_db");
  assertEquals(config.database.user, "test_user");
  assertEquals(config.database.password, "secret");

  Deno.env.delete("PORT");
  Deno.env.delete("UPDATE_INTERVAL");
  Deno.env.delete("ENABLE_LOG_PARSING");
  Deno.env.delete("MISSKEY_URL");
  Deno.env.delete("DB_HOST");
  Deno.env.delete("DB_PORT");
  Deno.env.delete("DB_NAME");
  Deno.env.delete("DB_USER");
  Deno.env.delete("DB_PASSWORD");
});