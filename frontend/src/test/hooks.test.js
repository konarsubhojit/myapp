import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useItemForm } from '../features/items/useItemForm';
import { useImageProcessing } from '../lib/hooks/useImageProcessing';

describe('useItemForm', () => {
  it('should initialize with empty values', () => {
    const { result } = renderHook(() => useItemForm());
    
    expect(result.current.name).toBe('');
    expect(result.current.price).toBe('');
    expect(result.current.fabric).toBe('');
    expect(result.current.specialFeatures).toBe('');
    expect(result.current.copiedFrom).toBeNull();
    expect(result.current.error).toBe('');
  });

  it('should validate form with missing required fields', () => {
    const { result } = renderHook(() => useItemForm());
    
    const validation = result.current.validateForm();
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('Please fill in name and price');
  });

  it('should validate form with invalid price', () => {
    const { result } = renderHook(() => useItemForm());
    
    act(() => {
      result.current.setName('Test Item');
      result.current.setPrice('invalid');
    });
    
    const validation = result.current.validateForm();
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('Please enter a valid price');
  });

  it('should validate form with negative price', () => {
    const { result } = renderHook(() => useItemForm());
    
    act(() => {
      result.current.setName('Test Item');
      result.current.setPrice('-10');
    });
    
    const validation = result.current.validateForm();
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('Please enter a valid price');
  });

  it('should validate form with valid data', () => {
    const { result } = renderHook(() => useItemForm());
    
    act(() => {
      result.current.setName('Test Item');
      result.current.setPrice('10.99');
    });
    
    const validation = result.current.validateForm();
    expect(validation.valid).toBe(true);
    expect(validation.priceNum).toBe(10.99);
  });

  it('should reset form to initial state', () => {
    const { result } = renderHook(() => useItemForm());
    
    act(() => {
      result.current.setName('Test Item');
      result.current.setPrice('10.99');
      result.current.setFabric('Cotton');
      result.current.setSpecialFeatures('Handmade');
    });
    
    act(() => {
      result.current.resetForm();
    });
    
    expect(result.current.name).toBe('');
    expect(result.current.price).toBe('');
    expect(result.current.fabric).toBe('');
    expect(result.current.specialFeatures).toBe('');
  });

  it('should set form from item', () => {
    const { result } = renderHook(() => useItemForm());
    
    const item = {
      name: 'Test Item',
      price: 10.99,
      fabric: 'Cotton',
      specialFeatures: 'Handmade'
    };
    
    act(() => {
      result.current.setFormFromItem(item);
    });
    
    expect(result.current.name).toBe('Test Item');
    expect(result.current.price).toBe('10.99');
    expect(result.current.fabric).toBe('Cotton');
    expect(result.current.specialFeatures).toBe('Handmade');
    expect(result.current.copiedFrom).toBe('Test Item');
  });

  it('should get form data', () => {
    const { result } = renderHook(() => useItemForm());
    
    act(() => {
      result.current.setName('Test Item');
      result.current.setPrice('10.99');
      result.current.setFabric('Cotton');
      result.current.setSpecialFeatures('Handmade');
    });
    
    const formData = result.current.getFormData(10.99, 'base64image');
    
    expect(formData).toEqual({
      name: 'Test Item',
      price: 10.99,
      fabric: 'Cotton',
      specialFeatures: 'Handmade',
      image: 'base64image'
    });
  });
});

describe('useImageProcessing', () => {
  it('should initialize with empty values', () => {
    const { result } = renderHook(() => useImageProcessing());
    
    expect(result.current.image).toBe('');
    expect(result.current.imagePreview).toBe('');
    expect(result.current.imageProcessing).toBe(false);
    expect(result.current.imageError).toBe('');
  });

  it('should clear image', () => {
    const { result } = renderHook(() => useImageProcessing());
    
    act(() => {
      result.current.setImage('base64image');
      result.current.setImagePreview('base64image');
    });
    
    expect(result.current.image).toBe('base64image');
    expect(result.current.imagePreview).toBe('base64image');
    
    act(() => {
      result.current.clearImage();
    });
    
    expect(result.current.image).toBe('');
    expect(result.current.imagePreview).toBe('');
    expect(result.current.imageError).toBe('');
  });

  it('should reset image', () => {
    const { result } = renderHook(() => useImageProcessing());
    
    act(() => {
      result.current.setImage('base64image');
      result.current.setImagePreview('base64image');
    });
    
    act(() => {
      result.current.resetImage();
    });
    
    expect(result.current.image).toBe('');
    expect(result.current.imagePreview).toBe('');
    expect(result.current.imageProcessing).toBe(false);
    expect(result.current.imageError).toBe('');
  });
});
