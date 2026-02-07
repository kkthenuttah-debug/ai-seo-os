/**
 * Shared mock data for tests.
 */

export const mockProjectId = '660e8400-e29b-41d4-a716-446655440001';
export const mockUserId = '550e8400-e29b-41d4-a716-446655440001';

export const mockProject = {
  id: mockProjectId,
  user_id: mockUserId,
  name: 'Test Project',
  domain: 'test.example.com',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
