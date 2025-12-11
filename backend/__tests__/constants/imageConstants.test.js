import { IMAGE_CONFIG } from '../../constants/imageConstants.ts';

describe('Image Constants', () => {
  describe('IMAGE_CONFIG', () => {
    it('should have MAX_SIZE set to 2MB in bytes', () => {
      expect(IMAGE_CONFIG.MAX_SIZE).toBe(2 * 1024 * 1024);
      expect(IMAGE_CONFIG.MAX_SIZE).toBe(2097152);
    });

    it('should have MAX_SIZE_MB set to 2', () => {
      expect(IMAGE_CONFIG.MAX_SIZE_MB).toBe(2);
    });

    it('should have all required properties', () => {
      expect(IMAGE_CONFIG).toHaveProperty('MAX_SIZE');
      expect(IMAGE_CONFIG).toHaveProperty('MAX_SIZE_MB');
    });

    it('should have consistent size values', () => {
      expect(IMAGE_CONFIG.MAX_SIZE).toBe(IMAGE_CONFIG.MAX_SIZE_MB * 1024 * 1024);
    });
  });
});
