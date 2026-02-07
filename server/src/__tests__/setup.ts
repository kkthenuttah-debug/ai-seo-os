/**
 * Jest setup: runs before each test file.
 * Set NODE_ENV so config and env don't require full .env in tests.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
