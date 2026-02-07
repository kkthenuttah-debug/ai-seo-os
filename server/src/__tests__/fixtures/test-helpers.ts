/**
 * Test helpers: common utilities for tests.
 */

/**
 * Wait for a number of milliseconds (e.g. for async boundaries).
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
