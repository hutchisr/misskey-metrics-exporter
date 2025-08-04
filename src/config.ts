import { ExporterConfig } from "./types.ts";

export function getConfig(): ExporterConfig {
  return {
    port: parseInt(Deno.env.get("PORT") ?? "9090"),
    updateInterval: parseInt(Deno.env.get("UPDATE_INTERVAL") ?? "60000"),
    enableLogParsing: Deno.env.get("ENABLE_LOG_PARSING") === "true",
    misskeyUrl: Deno.env.get("MISSKEY_URL") ?? "http://localhost:3000",
    database: {
      host: Deno.env.get("DB_HOST") ?? "localhost",
      port: parseInt(Deno.env.get("DB_PORT") ?? "5432"),
      database: Deno.env.get("DB_NAME") ?? "misskey",
      user: Deno.env.get("DB_USER") ?? "misskey",
      password: Deno.env.get("DB_PASSWORD") ?? "",
    },
  };
}
