import { MisskeyApiResponse, MisskeyMeta } from "./types.ts";
import * as log from "jsr:@std/log";

export class ApiClient {
  constructor(private baseUrl: string) {}

  private async makeRequest<T>(endpoint: string, body: Record<string, unknown> = {}): Promise<T | null> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      log.error(`Failed to call ${endpoint}:`, error);
      return null;
    }
  }

  async getServerStats(): Promise<MisskeyApiResponse | null> {
    return await this.makeRequest<MisskeyApiResponse>("/api/stats");
  }

  async getInstanceMeta(): Promise<MisskeyMeta | null> {
    return await this.makeRequest<MisskeyMeta>("/api/meta", { detail: false });
  }

  async getFederationStats(): Promise<unknown> {
    return await this.makeRequest("/api/federation/stats");
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ping`, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
