import { useState } from 'react';
import imageCompression from 'browser-image-compression';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB max upload size
const TARGET_IMAGE_SIZE = 2 * 1024 * 1024; // Compress to 2MB max

// Image compression options
const compressionOptions = {
  maxSizeMB: TARGET_IMAGE_SIZE / (1024 * 1024), // Convert bytes to MB
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
};

// Helper to convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Compress image if needed
const compressImage = async (file) => {
  // If file is already small enough, just convert to base64
  if (file.size <= TARGET_IMAGE_SIZE) {
    return fileToBase64(file);
  }

  // Compress the image
  const compressedFile = await imageCompression(file, compressionOptions);
  return fileToBase64(compressedFile);
};

/**
 * Validates an image file for size and type
 * @param {File} file - The file to validate
 * @returns {Object} - Returns {valid: true} or {valid: false, error: string}
 */
const validateImageFile = (file) => {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select a valid image file' };
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return { valid: false, error: 'Image size should be less than 5MB' };
  }

  return { valid: true };
};

/**
 * Custom hook for handling image processing, validation, and compression
 * @param {Function} showSuccess - Optional callback to show success notification
 * @returns {Object} - Image processing state and handlers
 */
export const useImageProcessing = (showSuccess) => {
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageError, setImageError] = useState('');

  const handleImageChange = async (file) => {
    if (!file) {
      setImage('');
      setImagePreview('');
      return;
    }

    setImageProcessing(true);
    setImageError('');
    
    try {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const base64Image = await compressImage(file);
      const wasCompressed = file.size > TARGET_IMAGE_SIZE;
      
      if (wasCompressed && showSuccess) {
        showSuccess('Image was compressed for optimal upload');
      }
      
      setImage(base64Image);
      setImagePreview(base64Image);
    } catch (err) {
      setImageError(err.message || 'Failed to process image. Please try a different file.');
      console.error('Image compression error:', err);
    } finally {
      setImageProcessing(false);
    }
  };

  const clearImage = () => {
    setImage('');
    setImagePreview('');
    setImageError('');
  };

  const resetImage = () => {
    setImage('');
    setImagePreview('');
    setImageError('');
    setImageProcessing(false);
  };

  return {
    image,
    imagePreview,
    imageProcessing,
    imageError,
    setImage,
    setImagePreview,
    handleImageChange,
    clearImage,
    resetImage,
  };
};
