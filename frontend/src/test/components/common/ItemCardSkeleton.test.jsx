import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ItemCardSkeleton from '../../../components/common/ItemCardSkeleton';

describe('ItemCardSkeleton', () => {
  const renderSkeleton = () => {
    return render(<ItemCardSkeleton />);
  };

  it('should render a card component', () => {
    const { container } = renderSkeleton();
    const card = container.querySelector('.MuiCard-root');
    expect(card).toBeInTheDocument();
  });

  it('should render image placeholder with correct height', () => {
    const { container } = renderSkeleton();
    const imageSkeletons = container.querySelectorAll('.MuiSkeleton-rectangular');
    // Should have exactly 1 rectangular skeleton for the image
    expect(imageSkeletons).toHaveLength(1);
    // Image should be 140px height to match ItemCard
    expect(imageSkeletons[0]).toHaveStyle({ height: '140px' });
  });

  it('should render card content section', () => {
    const { container } = renderSkeleton();
    const cardContent = container.querySelector('.MuiCardContent-root');
    expect(cardContent).toBeInTheDocument();
  });

  it('should render card actions section with icon button skeletons', () => {
    const { container } = renderSkeleton();
    const cardActions = container.querySelector('.MuiCardActions-root');
    expect(cardActions).toBeInTheDocument();
    
    // Should have 3 circular skeletons for Copy, Edit, and Delete buttons
    const circularSkeletons = cardActions.querySelectorAll('.MuiSkeleton-circular');
    expect(circularSkeletons).toHaveLength(3);
  });

  it('should render item name skeleton', () => {
    const { container } = renderSkeleton();
    const cardContent = container.querySelector('.MuiCardContent-root');
    const textSkeletons = cardContent.querySelectorAll('.MuiSkeleton-text');
    // Should have at least 2 text skeletons (name and price)
    expect(textSkeletons.length).toBeGreaterThanOrEqual(2);
  });

  it('should render chip skeletons for color and fabric', () => {
    const { container } = renderSkeleton();
    const cardContent = container.querySelector('.MuiCardContent-root');
    const roundedSkeletons = cardContent.querySelectorAll('.MuiSkeleton-rounded');
    // Should have 2 rounded skeletons for color and fabric chips
    expect(roundedSkeletons).toHaveLength(2);
  });

  it('should use Stack component for chips layout', () => {
    const { container } = renderSkeleton();
    const stack = container.querySelector('.MuiStack-root');
    expect(stack).toBeInTheDocument();
  });

  it('should have card with flex column layout', () => {
    const { container } = renderSkeleton();
    const card = container.querySelector('.MuiCard-root');
    const styles = window.getComputedStyle(card);
    expect(styles.display).toBe('flex');
    expect(styles.flexDirection).toBe('column');
  });
});
