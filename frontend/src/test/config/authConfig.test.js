import { describe, it, expect } from 'vitest';
import { googleConfig } from '../../config/authConfig';

describe('authConfig', () => {
  it('should export googleConfig object', () => {
    expect(googleConfig).toBeDefined();
    expect(googleConfig).toHaveProperty('clientId');
  });

  it('should have clientId property', () => {
    expect(typeof googleConfig.clientId).toBe('string');
  });
});
