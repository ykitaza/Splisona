import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    fileParallelism: false,
    env: {
      DYNAMODB_ENDPOINT: "http://localhost:8000",
      TABLE_NAME: "chorus-main-test",
    },
  },
});
