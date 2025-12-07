import { useState } from 'react';

/**
 * Custom hook for managing item form state
 * @returns {Object} - Form state and handlers
 */
export const useItemForm = () => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [color, setColor] = useState('');
  const [fabric, setFabric] = useState('');
  const [specialFeatures, setSpecialFeatures] = useState('');
  const [copiedFrom, setCopiedFrom] = useState(null);
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!name.trim() || !price) {
      return { valid: false, error: 'Please fill in name and price' };
    }

    const priceNum = Number.parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return { valid: false, error: 'Please enter a valid price' };
    }

    return { valid: true, priceNum };
  };

  const getFormData = (priceNum, image) => ({
    name: name.trim(),
    price: priceNum,
    color: color.trim(),
    fabric: fabric.trim(),
    specialFeatures: specialFeatures.trim(),
    image: image,
  });

  const resetForm = () => {
    setName('');
    setPrice('');
    setColor('');
    setFabric('');
    setSpecialFeatures('');
    setCopiedFrom(null);
    setError('');
  };

  const setFormFromItem = (item) => {
    setName(item.name);
    setPrice(String(item.price));
    setColor(item.color || '');
    setFabric(item.fabric || '');
    setSpecialFeatures(item.specialFeatures || '');
    setCopiedFrom(item.name);
    setError('');
  };

  return {
    name,
    price,
    color,
    fabric,
    specialFeatures,
    copiedFrom,
    error,
    setName,
    setPrice,
    setColor,
    setFabric,
    setSpecialFeatures,
    setCopiedFrom,
    setError,
    validateForm,
    getFormData,
    resetForm,
    setFormFromItem,
  };
};
