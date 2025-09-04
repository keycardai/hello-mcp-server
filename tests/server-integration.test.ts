import request from "supertest";
import { createApp } from "../src/server";

describe("Hello MCP Server Integration Tests", () => {
  let app: any;
  let singleTenantApp: any;
  let multiTenantApp: any;

  beforeAll(() => {
    // Single-tenant setup
    process.env.KEYCARD_STS_ISSUER_URL = "http://test.example.com";
    delete process.env.ISSUER_BASE_DOMAIN;
    delete process.env.MCP_BASE_DOMAIN;
    singleTenantApp = createApp();
    
    // Multi-tenant setup
    process.env.ISSUER_BASE_DOMAIN = "sts.example.com";
    process.env.MCP_BASE_DOMAIN = "mcp.example.com";
    delete process.env.KEYCARD_STS_ISSUER_URL;
    multiTenantApp = createApp();
    
    // Default app for legacy tests
    app = singleTenantApp;
  });

  describe("OAuth metadata - Single Tenant", () => {
    it("should provide OAuth discovery endpoint", async () => {
      const response = await request(singleTenantApp)
        .get("/.well-known/oauth-authorization-server")
        .expect(200);

      expect(response.body).toMatchObject({
        issuer: expect.any(String),
      });
    });
    
    it("should provide path-based protected resource metadata", async () => {
      const response = await request(singleTenantApp)
        .get("/.well-known/oauth-protected-resource/hello")
        .set('Host', 'hello-mcp.example.com')
        .expect(200);

      expect(response.body).toMatchObject({
        resource: 'http://hello-mcp.example.com/hello',
        authorization_servers: expect.arrayContaining([expect.any(String)]),
        scopes_supported: ['mcp:tools'],
        resource_name: 'Hello MCP Server'
      });
    });
  });
  
  describe("OAuth metadata - Multi Tenant", () => {
    it("should resolve issuer dynamically based on Host header", async () => {
      const response = await request(multiTenantApp)
        .get("/.well-known/oauth-protected-resource/hello")
        .set('Host', 'z123.dev.local')
        .expect(200);

      expect(response.body).toMatchObject({
        resource: 'http://z123.dev.local/hello',
        authorization_servers: ['https://z123.sts.example.com'],
        scopes_supported: ['mcp:tools'],
        resource_name: 'Hello MCP Server'
      });
    });
    
    it("should handle different zone IDs from Host header", async () => {
      const response = await request(multiTenantApp)
        .get("/.well-known/oauth-protected-resource/hello")
        .set('Host', 'z456.dev.local')
        .expect(200);

      expect(response.body).toMatchObject({
        resource: 'http://z456.dev.local/hello',
        authorization_servers: ['https://z456.sts.example.com'],
        scopes_supported: ['mcp:tools'],
        resource_name: 'Hello MCP Server'
      });
    });
    
    it("should use default zone for missing Host header", async () => {
      const response = await request(multiTenantApp)
        .get("/.well-known/oauth-protected-resource/hello")
        .expect(200);

      expect(response.body).toMatchObject({
        authorization_servers: ['https://default.sts.example.com']
      });
    });
  });

  describe("MCP endpoint", () => {
    it("should return 401 for unauthenticated requests to /hello/mcp", async () => {
      await request(app)
        .post("/hello/mcp")
        .send({ invalid: "request" })
        .expect(401);
    });
    
    it("should reject requests to old /mcp endpoint", async () => {
      await request(app)
        .post("/mcp")
        .send({ invalid: "request" })
        .expect(404);
    });
  });
});