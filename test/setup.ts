// test/setup.ts
import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables
config({ path: join(__dirname, '..', '.env.test') });

// Set default test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Any global setup logic
});

afterAll(async () => {
  // Global cleanup
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 1000);
  });
});
