import { config } from "dotenv";

config({ path: ".env.test" });

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "ERROR";
  process.env.ENABLE_OTEL = "false";
});

afterAll(() => {
  jest.clearAllTimers();
});