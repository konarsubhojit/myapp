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
      const mockDates = [
        new Date('2024-12-16T18:30:00.000Z'), // D+1 start (in UTC)
        new Date('2024-12-17T18:30:00.000Z'), // D+2 end
        new Date('2024-12-18T18:30:00.000Z'), // D+3 start
        new Date('2024-12-19T18:30:00.000Z'), // D+4 end
        new Date('2024-12-22T18:30:00.000Z'), // D+7 start
        new Date('2024-12-23T18:30:00.000Z')  // D+8 end
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

    it('should have buckets representing one calendar day each', () => {
      const mockDates = [
        new Date('2024-12-16T18:30:00.000Z'),
        new Date('2024-12-17T18:30:00.000Z'),
        new Date('2024-12-18T18:30:00.000Z'),
        new Date('2024-12-19T18:30:00.000Z'),
        new Date('2024-12-22T18:30:00.000Z'),
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

      // 1-day bucket should span 1 day
      const oneDayDiff = buckets['1d'].end.getTime() - buckets['1d'].start.getTime();
      expect(oneDayDiff).toBe(24 * 60 * 60 * 1000);
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
