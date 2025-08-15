import request from "supertest";
import { createApp } from "../src/server";

describe("Hello MCP Server Integration Tests", () => {
  let app: any;

  beforeAll(() => {
    process.env.KEYCARD_STS_ISSUER_URL = "http://test.example.com";
    app = createApp();
  });

  describe("OAuth metadata", () => {
    it("should provide OAuth discovery endpoint", async () => {
      const response = await request(app)
        .get("/.well-known/oauth-authorization-server")
        .expect(200);

      expect(response.body).toMatchObject({
        issuer: expect.any(String),
      });
    });
  });

  describe("MCP endpoint", () => {
    it("should return 400 for invalid requests", async () => {
      await request(app)
        .post("/mcp")
        .send({ invalid: "request" })
        .expect(400);
    });
  });
});