import { describe, it, expect } from 'vitest';
import theme from '../../config/theme';

describe('theme', () => {
  it('should export a valid theme object', () => {
    expect(theme).toBeDefined();
    expect(theme).toHaveProperty('palette');
    expect(theme).toHaveProperty('typography');
    expect(theme).toHaveProperty('shape');
    expect(theme).toHaveProperty('components');
  });

  it('should have correct palette colors', () => {
    expect(theme.palette.primary.main).toBe('#667eea');
    expect(theme.palette.secondary.main).toBe('#764ba2');
    expect(theme.palette.success.main).toBe('#10b981');
    expect(theme.palette.error.main).toBe('#ef4444');
  });

  it('should have typography settings', () => {
    expect(theme.typography.fontFamily).toContain('Inter');
    expect(theme.typography.button.textTransform).toBe('none');
  });

  it('should have shape configuration', () => {
    expect(theme.shape.borderRadius).toBe(10);
  });

  it('should have component overrides', () => {
    expect(theme.components.MuiButton).toBeDefined();
    expect(theme.components.MuiTextField).toBeDefined();
    expect(theme.components.MuiCard).toBeDefined();
  });
});
