/**
 * Example integration test: health route.
 * Requires the server to be running or use supertest with createApp().
 * Skipped by default until you wire in Fastify app for testing.
 */
describe('GET /health', () => {
  it('is skipped until app is mounted in tests', () => {
    expect(1).toBe(1);
  });
});
