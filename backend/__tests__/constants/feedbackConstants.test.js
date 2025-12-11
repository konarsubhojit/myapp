import {
  MIN_RATING,
  MAX_RATING,
  MAX_COMMENT_LENGTH,
  MAX_RESPONSE_LENGTH,
  RATING_LABELS
} from '../../constants/feedbackConstants.ts';

describe('Feedback Constants', () => {
  describe('Rating boundaries', () => {
    it('should have MIN_RATING defined as 1', () => {
      expect(MIN_RATING).toBe(1);
    });

    it('should have MAX_RATING defined as 5', () => {
      expect(MAX_RATING).toBe(5);
    });
  });

  describe('Length boundaries', () => {
    it('should have MAX_COMMENT_LENGTH defined as 1000', () => {
      expect(MAX_COMMENT_LENGTH).toBe(1000);
    });

    it('should have MAX_RESPONSE_LENGTH defined as 1000', () => {
      expect(MAX_RESPONSE_LENGTH).toBe(1000);
    });
  });

  describe('RATING_LABELS', () => {
    it('should have labels for all rating values', () => {
      expect(RATING_LABELS).toEqual({
        1: 'Very Poor',
        2: 'Poor',
        3: 'Average',
        4: 'Good',
        5: 'Excellent'
      });
    });

    it('should have labels for MIN_RATING to MAX_RATING', () => {
      for (let i = MIN_RATING; i <= MAX_RATING; i++) {
        expect(RATING_LABELS[i]).toBeDefined();
        expect(typeof RATING_LABELS[i]).toBe('string');
      }
    });
  });
});
