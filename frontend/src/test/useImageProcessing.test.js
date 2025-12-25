import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useImageProcessing } from '../lib/hooks/useImageProcessing';

describe('useImageProcessing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty values', () => {
      const { result } = renderHook(() => useImageProcessing());

      expect(result.current.image).toBe('');
      expect(result.current.imagePreview).toBe('');
      expect(result.current.imageProcessing).toBe(false);
      expect(result.current.imageError).toBe('');
    });
  });

  describe('handleImageChange', () => {
    it('should handle null/undefined file by clearing image', async () => {
      const { result } = renderHook(() => useImageProcessing());

      act(() => {
        result.current.setImage('existing-image');
        result.current.setImagePreview('existing-preview');
      });

      await act(async () => {
        await result.current.handleImageChange(null);
      });

      expect(result.current.image).toBe('');
      expect(result.current.imagePreview).toBe('');
    });

    it('should validate image type and reject non-image files', async () => {
      const { result } = renderHook(() => useImageProcessing());

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      await act(async () => {
        await result.current.handleImageChange(file);
      });

      await waitFor(() => {
        expect(result.current.imageError).toBe('Please select a valid image file');
        expect(result.current.imageProcessing).toBe(false);
      });
    });

    it('should validate file size and reject files larger than 10MB', async () => {
      const { result } = renderHook(() => useImageProcessing());

      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

      await act(async () => {
        await result.current.handleImageChange(largeFile);
      });

      await waitFor(() => {
        expect(result.current.imageError).toBe('Image size should be less than 10MB');
        expect(result.current.imageProcessing).toBe(false);
      });
    });
  });

  describe('clearImage', () => {
    it('should clear image, preview, and error', () => {
      const { result } = renderHook(() => useImageProcessing());

      act(() => {
        result.current.setImage('test-image');
        result.current.setImagePreview('test-preview');
      });

      act(() => {
        result.current.clearImage();
      });

      expect(result.current.image).toBe('');
      expect(result.current.imagePreview).toBe('');
      expect(result.current.imageError).toBe('');
    });
  });

  describe('resetImage', () => {
    it('should reset all image state including processing flag', () => {
      const { result } = renderHook(() => useImageProcessing());

      act(() => {
        result.current.setImage('test-image');
        result.current.setImagePreview('test-preview');
      });

      act(() => {
        result.current.resetImage();
      });

      expect(result.current.image).toBe('');
      expect(result.current.imagePreview).toBe('');
      expect(result.current.imageError).toBe('');
      expect(result.current.imageProcessing).toBe(false);
    });
  });

  describe('Direct State Setters', () => {
    it('should allow direct setting of image', () => {
      const { result } = renderHook(() => useImageProcessing());

      act(() => {
        result.current.setImage('new-image-data');
      });

      expect(result.current.image).toBe('new-image-data');
    });

    it('should allow direct setting of imagePreview', () => {
      const { result } = renderHook(() => useImageProcessing());

      act(() => {
        result.current.setImagePreview('new-preview-data');
      });

      expect(result.current.imagePreview).toBe('new-preview-data');
    });
  });
});
