import { jest } from '@jest/globals';

// Mock luxon to control time in tests
jest.unstable_mockModule('luxon', () => ({
  DateTime: {
    now: jest.fn(),
    fromJSDate: jest.fn()
  }
}));

const { DateTime } = await import('luxon');
const { 
  computeDigestBuckets, 
  getTodayInKolkata, 
  getKolkataStartOfDay,
  formatDateForDigest,
  DIGEST_TIMEZONE
} = await import('../../utils/digestBuckets.js');

describe('Digest Buckets Utils', () => {
  describe('DIGEST_TIMEZONE', () => {
    it('should be Asia/Kolkata', () => {
      expect(DIGEST_TIMEZONE).toBe('Asia/Kolkata');
    });
  });

  describe('getTodayInKolkata', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const mockDateTime = {
        setZone: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnValue('2024-12-15')
      };
      DateTime.now.mockReturnValue(mockDateTime);

      const result = getTodayInKolkata();

      expect(DateTime.now).toHaveBeenCalled();
      expect(mockDateTime.setZone).toHaveBeenCalledWith('Asia/Kolkata');
      expect(mockDateTime.toFormat).toHaveBeenCalledWith('yyyy-MM-dd');
      expect(result).toBe('2024-12-15');
    });
  });

  describe('getKolkataStartOfDay', () => {
    it('should return start of day for today (daysFromToday = 0)', () => {
      const mockDate = new Date('2024-12-15T00:00:00.000Z');
      const mockDateTime = {
        setZone: jest.fn().mockReturnThis(),
        startOf: jest.fn().mockReturnThis(),
        plus: jest.fn().mockReturnThis(),
        toJSDate: jest.fn().mockReturnValue(mockDate)
      };
      DateTime.now.mockReturnValue(mockDateTime);

      const result = getKolkataStartOfDay(0);

      expect(mockDateTime.setZone).toHaveBeenCalledWith('Asia/Kolkata');
      expect(mockDateTime.startOf).toHaveBeenCalledWith('day');
      expect(mockDateTime.plus).toHaveBeenCalledWith({ days: 0 });
      expect(result).toBe(mockDate);
    });

    it('should return start of day for tomorrow (daysFromToday = 1)', () => {
      const mockDate = new Date('2024-12-16T00:00:00.000Z');
      const mockDateTime = {
        setZone: jest.fn().mockReturnThis(),
        startOf: jest.fn().mockReturnThis(),
        plus: jest.fn().mockReturnThis(),
        toJSDate: jest.fn().mockReturnValue(mockDate)
      };
      DateTime.now.mockReturnValue(mockDateTime);

      const result = getKolkataStartOfDay(1);

      expect(mockDateTime.plus).toHaveBeenCalledWith({ days: 1 });
      expect(result).toBe(mockDate);
    });

    it('should return start of day for 7 days ahead', () => {
      const mockDate = new Date('2024-12-22T00:00:00.000Z');
      const mockDateTime = {
        setZone: jest.fn().mockReturnThis(),
        startOf: jest.fn().mockReturnThis(),
        plus: jest.fn().mockReturnThis(),
        toJSDate: jest.fn().mockReturnValue(mockDate)
      };
      DateTime.now.mockReturnValue(mockDateTime);

      const result = getKolkataStartOfDay(7);

      expect(mockDateTime.plus).toHaveBeenCalledWith({ days: 7 });
      expect(result).toBe(mockDate);
    });
  });

  describe('computeDigestBuckets', () => {
    it('should return buckets for 1d, 3d, and 7d', () => {
      // Create a sequence of mock dates for the 6 calls
      // New bucket semantics: 1d=[S0, S0+2), 3d=[S0+2, S0+4), 7d=[S0+4, S0+8)
      const mockDates = [
        new Date('2024-12-15T18:30:00.000Z'), // S0 (today start)
        new Date('2024-12-17T18:30:00.000Z'), // S0+2 end
        new Date('2024-12-17T18:30:00.000Z'), // S0+2 start
        new Date('2024-12-19T18:30:00.000Z'), // S0+4 end
        new Date('2024-12-19T18:30:00.000Z'), // S0+4 start
        new Date('2024-12-23T18:30:00.000Z')  // S0+8 end
      ];
      
      let callIndex = 0;
      DateTime.now.mockImplementation(() => ({
        setZone: jest.fn().mockReturnThis(),
        startOf: jest.fn().mockReturnThis(),
        plus: jest.fn().mockReturnThis(),
        toJSDate: jest.fn().mockReturnValue(mockDates[callIndex++])
      }));

      const buckets = computeDigestBuckets();

      expect(buckets).toHaveProperty('1d');
      expect(buckets).toHaveProperty('3d');
      expect(buckets).toHaveProperty('7d');
      
      expect(buckets['1d']).toHaveProperty('start');
      expect(buckets['1d']).toHaveProperty('end');
      expect(buckets['3d']).toHaveProperty('start');
      expect(buckets['3d']).toHaveProperty('end');
      expect(buckets['7d']).toHaveProperty('start');
      expect(buckets['7d']).toHaveProperty('end');
    });

    it('should have 1d bucket spanning 2 days (today and tomorrow)', () => {
      const mockDates = [
        new Date('2024-12-15T18:30:00.000Z'), // S0
        new Date('2024-12-17T18:30:00.000Z'), // S0+2
        new Date('2024-12-17T18:30:00.000Z'),
        new Date('2024-12-19T18:30:00.000Z'),
        new Date('2024-12-19T18:30:00.000Z'),
        new Date('2024-12-23T18:30:00.000Z')
      ];
      
      let callIndex = 0;
      DateTime.now.mockImplementation(() => ({
        setZone: jest.fn().mockReturnThis(),
        startOf: jest.fn().mockReturnThis(),
        plus: jest.fn().mockReturnThis(),
        toJSDate: jest.fn().mockReturnValue(mockDates[callIndex++])
      }));

      const buckets = computeDigestBuckets();

      // 1-day bucket should span 2 days (today and tomorrow)
      const oneDayDiff = buckets['1d'].end.getTime() - buckets['1d'].start.getTime();
      expect(oneDayDiff).toBe(2 * 24 * 60 * 60 * 1000);
    });

    it('should have 3d bucket spanning 2 days (days 2-3)', () => {
      const mockDates = [
        new Date('2024-12-15T18:30:00.000Z'),
        new Date('2024-12-17T18:30:00.000Z'),
        new Date('2024-12-17T18:30:00.000Z'), // S0+2
        new Date('2024-12-19T18:30:00.000Z'), // S0+4
        new Date('2024-12-19T18:30:00.000Z'),
        new Date('2024-12-23T18:30:00.000Z')
      ];
      
      let callIndex = 0;
      DateTime.now.mockImplementation(() => ({
        setZone: jest.fn().mockReturnThis(),
        startOf: jest.fn().mockReturnThis(),
        plus: jest.fn().mockReturnThis(),
        toJSDate: jest.fn().mockReturnValue(mockDates[callIndex++])
      }));

      const buckets = computeDigestBuckets();

      // 3-day bucket should span 2 days (days 2-3)
      const threeDayDiff = buckets['3d'].end.getTime() - buckets['3d'].start.getTime();
      expect(threeDayDiff).toBe(2 * 24 * 60 * 60 * 1000);
    });

    it('should have 7d bucket spanning 4 days (days 4-7)', () => {
      const mockDates = [
        new Date('2024-12-15T18:30:00.000Z'),
        new Date('2024-12-17T18:30:00.000Z'),
        new Date('2024-12-17T18:30:00.000Z'),
        new Date('2024-12-19T18:30:00.000Z'),
        new Date('2024-12-19T18:30:00.000Z'), // S0+4
        new Date('2024-12-23T18:30:00.000Z')  // S0+8
      ];
      
      let callIndex = 0;
      DateTime.now.mockImplementation(() => ({
        setZone: jest.fn().mockReturnThis(),
        startOf: jest.fn().mockReturnThis(),
        plus: jest.fn().mockReturnThis(),
        toJSDate: jest.fn().mockReturnValue(mockDates[callIndex++])
      }));

      const buckets = computeDigestBuckets();

      // 7-day bucket should span 4 days (days 4-7)
      const sevenDayDiff = buckets['7d'].end.getTime() - buckets['7d'].start.getTime();
      expect(sevenDayDiff).toBe(4 * 24 * 60 * 60 * 1000);
    });

    it('should have non-overlapping buckets', () => {
      const mockDates = [
        new Date('2024-12-15T18:30:00.000Z'), // S0
        new Date('2024-12-17T18:30:00.000Z'), // S0+2
        new Date('2024-12-17T18:30:00.000Z'), // S0+2
        new Date('2024-12-19T18:30:00.000Z'), // S0+4
        new Date('2024-12-19T18:30:00.000Z'), // S0+4
        new Date('2024-12-23T18:30:00.000Z')  // S0+8
      ];
      
      let callIndex = 0;
      DateTime.now.mockImplementation(() => ({
        setZone: jest.fn().mockReturnThis(),
        startOf: jest.fn().mockReturnThis(),
        plus: jest.fn().mockReturnThis(),
        toJSDate: jest.fn().mockReturnValue(mockDates[callIndex++])
      }));

      const buckets = computeDigestBuckets();

      // 1d bucket ends where 3d bucket starts
      expect(buckets['1d'].end.getTime()).toBe(buckets['3d'].start.getTime());
      // 3d bucket ends where 7d bucket starts
      expect(buckets['3d'].end.getTime()).toBe(buckets['7d'].start.getTime());
    });
  });

  describe('formatDateForDigest', () => {
    it('should format Date object correctly', () => {
      const mockDate = new Date('2024-12-15T10:30:00.000Z');
      const mockDateTime = {
        setZone: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnValue('15 Dec 2024, 04:00 PM')
      };
      DateTime.fromJSDate.mockReturnValue(mockDateTime);

      const result = formatDateForDigest(mockDate);

      expect(DateTime.fromJSDate).toHaveBeenCalledWith(mockDate);
      expect(mockDateTime.setZone).toHaveBeenCalledWith('Asia/Kolkata');
      expect(result).toBe('15 Dec 2024, 04:00 PM IST');
    });

    it('should handle string date input', () => {
      const dateString = '2024-12-15T10:30:00.000Z';
      const mockDateTime = {
        setZone: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnValue('15 Dec 2024, 04:00 PM')
      };
      DateTime.fromJSDate.mockReturnValue(mockDateTime);

      const result = formatDateForDigest(dateString);

      expect(result).toBe('15 Dec 2024, 04:00 PM IST');
    });
  });
});
