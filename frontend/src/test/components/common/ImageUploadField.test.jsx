import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUploadField from '../../../components/common/ImageUploadField';

describe('ImageUploadField', () => {
  const mockOnImageChange = vi.fn();
  const mockOnClearImage = vi.fn();

  it('should render upload button', () => {
    render(
      <ImageUploadField
        id="test-image"
        imagePreview=""
        imageProcessing={false}
        onImageChange={mockOnImageChange}
        onClearImage={mockOnClearImage}
      />
    );

    expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument();
  });

  it('should show processing state', () => {
    render(
      <ImageUploadField
        id="test-image"
        imagePreview=""
        imageProcessing={true}
        onImageChange={mockOnImageChange}
        onClearImage={mockOnClearImage}
      />
    );

    const button = screen.getByRole('button', { name: /processing/i });
    expect(button).toBeInTheDocument();
    // Button is a label wrapping file input, check aria-disabled
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('should display image preview when provided', () => {
    render(
      <ImageUploadField
        id="test-image"
        imagePreview="data:image/png;base64,test"
        imageProcessing={false}
        onImageChange={mockOnImageChange}
        onClearImage={mockOnClearImage}
      />
    );

    const image = screen.getByAltText('Preview');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'data:image/png;base64,test');
  });

  it('should call onClearImage when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ImageUploadField
        id="test-image"
        imagePreview="data:image/png;base64,test"
        imageProcessing={false}
        onImageChange={mockOnImageChange}
        onClearImage={mockOnClearImage}
      />
    );

    const removeButton = screen.getByRole('button', { name: /remove image/i });
    await user.click(removeButton);
    
    expect(mockOnClearImage).toHaveBeenCalled();
  });

  it('should render custom label', () => {
    render(
      <ImageUploadField
        id="test-image"
        imagePreview=""
        imageProcessing={false}
        onImageChange={mockOnImageChange}
        onClearImage={mockOnClearImage}
        label="Custom label text"
      />
    );

    expect(screen.getByText('Custom label text')).toBeInTheDocument();
  });

  it('should not show remove button when no preview', () => {
    render(
      <ImageUploadField
        id="test-image"
        imagePreview=""
        imageProcessing={false}
        onImageChange={mockOnImageChange}
        onClearImage={mockOnClearImage}
      />
    );

    expect(screen.queryByRole('button', { name: /remove image/i })).not.toBeInTheDocument();
  });
});
