import { assertEquals, assertRejects } from "jsr:@std/assert";
import { ApiClient } from "../src/api-client.ts";

Deno.test("ApiClient constructor sets baseUrl", () => {
  const client = new ApiClient("https://example.com");
  assertEquals(client["baseUrl"], "https://example.com");
});

Deno.test("ApiClient ping returns false for invalid URL", async () => {
  const client = new ApiClient("http://invalid-url-that-does-not-exist");
  const result = await client.ping();
  assertEquals(result, false);
});

Deno.test({
  name: "ApiClient makeRequest handles timeout",
  fn: async () => {
    const client = new ApiClient("http://httpbin.org/delay/15");
    const result = await client.getServerStats();
    assertEquals(result, null);
  },
  sanitizeResources: false,
});

Deno.test("ApiClient getServerStats returns null on error", async () => {
  const client = new ApiClient("http://invalid-url");
  const result = await client.getServerStats();
  assertEquals(result, null);
});

Deno.test("ApiClient getInstanceMeta returns null on error", async () => {
  const client = new ApiClient("http://invalid-url");
  const result = await client.getInstanceMeta();
  assertEquals(result, null);
});

Deno.test("ApiClient getFederationStats returns null on error", async () => {
  const client = new ApiClient("http://invalid-url");
  const result = await client.getFederationStats();
  assertEquals(result, null);
});