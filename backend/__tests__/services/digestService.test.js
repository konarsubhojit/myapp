import { jest } from '@jest/globals';

// Mock dependencies before imports
jest.unstable_mockModule('../../db/connection', () => ({
  getDatabase: jest.fn()
}));

jest.unstable_mockModule('../../utils/digestBuckets', () => ({
  computeDigestBuckets: jest.fn(),
  getTodayInKolkata: jest.fn(),
  formatDateForDigest: jest.fn(),
  getKolkataStartOfDay: jest.fn()
}));

jest.unstable_mockModule('../../services/emailService', () => ({
  sendEmail: jest.fn(),
  buildDigestEmailHtml: jest.fn(),
  buildDigestEmailText: jest.fn()
}));

jest.unstable_mockModule('../../utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

const { getDatabase } = await import('../../db/connection.js');
const { computeDigestBuckets, getTodayInKolkata, formatDateForDigest, getKolkataStartOfDay } = await import('../../utils/digestBuckets.js');

describe('DigestService', () => {
  let mockDb;
  let mockSelect;
  let mockFrom;
  let mockWhere;
  let mockLeftJoin;
  let mockOrderBy;
  let mockInsert;
  let mockValues;
  let mockReturning;
  let mockUpdate;
  let mockSet;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up chainable mock database methods
    mockReturning = jest.fn().mockResolvedValue([{ id: 1 }]);
    mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
    mockInsert = jest.fn().mockReturnValue({ values: mockValues });
    mockOrderBy = jest.fn().mockResolvedValue([]);
    
    // mockWhere needs to support both .orderBy() chaining and direct Promise resolution
    const createWhereChain = () => {
      const whereChain = jest.fn().mockImplementation(() => {
        return { orderBy: mockOrderBy };
      });
      // Make it also a thenable so it can be awaited directly
      whereChain.then = (resolve, reject) => {
        return Promise.resolve([]).then(resolve, reject);
      };
      return whereChain;
    };
    
    mockWhere = createWhereChain();
    mockLeftJoin = jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ orderBy: mockOrderBy }) });
    mockFrom = jest.fn().mockReturnValue({ 
      where: mockWhere,
      leftJoin: mockLeftJoin
    });
    mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
    mockSet = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) });
    mockUpdate = jest.fn().mockReturnValue({ set: mockSet });

    mockDb = {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: jest.fn()
    };

    getDatabase.mockReturnValue(mockDb);
    getTodayInKolkata.mockReturnValue('2024-12-15');
    getKolkataStartOfDay.mockImplementation((daysFromToday) => {
      const baseDate = new Date('2024-12-15T00:00:00.000Z');
      baseDate.setDate(baseDate.getDate() + daysFromToday);
      return baseDate;
    });
    formatDateForDigest.mockImplementation((date) => date.toString());
    // Updated bucket semantics: 1d=[S0, S0+2), 3d=[S0+2, S0+4), 7d=[S0+4, S0+8)
    computeDigestBuckets.mockReturnValue({
      '1d': { start: new Date('2024-12-15T00:00:00.000Z'), end: new Date('2024-12-17T00:00:00.000Z') },
      '3d': { start: new Date('2024-12-17T00:00:00.000Z'), end: new Date('2024-12-19T00:00:00.000Z') },
      '7d': { start: new Date('2024-12-19T00:00:00.000Z'), end: new Date('2024-12-23T00:00:00.000Z') }
    });
  });

  describe('getEnabledRecipients', () => {
    it('should query for enabled recipients', async () => {
      const mockRecipients = [
        { id: 1, email: 'test@example.com', enabled: true }
      ];
      mockWhere.mockResolvedValue(mockRecipients);

      const { getEnabledRecipients } = await import('../../services/digestService.js');
      const recipients = await getEnabledRecipients();

      expect(mockDb.select).toHaveBeenCalled();
      expect(recipients).toEqual(mockRecipients);
    });
  });

  describe('getDigestRunForDate', () => {
    it('should return null if no digest run exists', async () => {
      mockWhere.mockResolvedValue([]);

      const { getDigestRunForDate } = await import('../../services/digestService.js');
      const result = await getDigestRunForDate('2024-12-15');

      expect(result).toBeNull();
    });

    it('should return existing digest run', async () => {
      const mockRun = { id: 1, digestDate: '2024-12-15', status: 'sent' };
      mockWhere.mockResolvedValue([mockRun]);

      const { getDigestRunForDate } = await import('../../services/digestService.js');
      const result = await getDigestRunForDate('2024-12-15');

      expect(result).toEqual(mockRun);
    });
  });

  describe('upsertOrderReminderState', () => {
    it('should create new reminder state for new order', async () => {
      mockWhere.mockResolvedValue([]);

      const { upsertOrderReminderState } = await import('../../services/digestService.js');
      await upsertOrderReminderState(1, new Date('2024-12-20T00:00:00.000Z'));

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should do nothing if expectedDeliveryDate is null', async () => {
      const { upsertOrderReminderState } = await import('../../services/digestService.js');
      await upsertOrderReminderState(1, null);

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should reset flags if delivery date changed', async () => {
      const existingState = {
        orderId: 1,
        deliveryDateSnapshot: new Date('2024-12-18T00:00:00.000Z'),
        sent7d: true,
        sent3d: false,
        sent1d: false
      };
      mockWhere.mockResolvedValue([existingState]);

      const { upsertOrderReminderState } = await import('../../services/digestService.js');
      await upsertOrderReminderState(1, new Date('2024-12-25T00:00:00.000Z'));

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should not update if delivery date is unchanged', async () => {
      const deliveryDate = new Date('2024-12-20T00:00:00.000Z');
      const existingState = {
        orderId: 1,
        deliveryDateSnapshot: deliveryDate,
        sent7d: true,
        sent3d: false,
        sent1d: false
      };
      mockWhere.mockResolvedValue([existingState]);

      const { upsertOrderReminderState } = await import('../../services/digestService.js');
      await upsertOrderReminderState(1, deliveryDate);

      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('markOrdersAsSent', () => {
    it('should do nothing for empty orderIds array', async () => {
      const { markOrdersAsSent } = await import('../../services/digestService.js');
      await markOrdersAsSent([], '1d');

      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should update existing reminder state for 1d tier', async () => {
      const mockOrder = { expectedDeliveryDate: new Date('2024-12-16T00:00:00.000Z') };
      const existingState = { orderId: 1, sent7d: false, sent3d: false, sent1d: false };

      let selectCallCount = 0;
      mockWhere.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) return Promise.resolve([mockOrder]);
        return Promise.resolve([existingState]);
      });

      const { markOrdersAsSent } = await import('../../services/digestService.js');
      await markOrdersAsSent([1], '1d');

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should create new reminder state if none exists', async () => {
      const mockOrder = { expectedDeliveryDate: new Date('2024-12-16T00:00:00.000Z') };

      let selectCallCount = 0;
      mockWhere.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) return Promise.resolve([mockOrder]);
        return Promise.resolve([]);
      });

      const { markOrdersAsSent } = await import('../../services/digestService.js');
      await markOrdersAsSent([1], '7d');

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getOrdersForBucket', () => {
    it('should fetch orders in the bucket excluding completed and cancelled', async () => {
      const mockOrders = [
        { id: 1, orderId: 'ORD001', customerName: 'John', expectedDeliveryDate: new Date('2024-12-16'), status: 'pending' }
      ];
      mockOrderBy.mockResolvedValue(mockOrders);

      const { getOrdersForBucket } = await import('../../services/digestService.js');
      const bucketStart = new Date('2024-12-15T00:00:00.000Z');
      const bucketEnd = new Date('2024-12-17T00:00:00.000Z');
      
      const result = await getOrdersForBucket(bucketStart, bucketEnd);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });

    it('should return empty array when no orders in bucket', async () => {
      mockOrderBy.mockResolvedValue([]);

      const { getOrdersForBucket } = await import('../../services/digestService.js');
      const bucketStart = new Date('2024-12-15T00:00:00.000Z');
      const bucketEnd = new Date('2024-12-17T00:00:00.000Z');
      
      const result = await getOrdersForBucket(bucketStart, bucketEnd);

      expect(result).toEqual([]);
    });
  });

  describe('getOverdueOrders', () => {
    it('should fetch overdue orders excluding completed and cancelled', async () => {
      const mockOrders = [
        { id: 1, orderId: 'ORD001', customerName: 'John', expectedDeliveryDate: new Date('2024-12-10'), status: 'pending' }
      ];
      mockOrderBy.mockResolvedValue(mockOrders);

      const { getOverdueOrders } = await import('../../services/digestService.js');
      
      const result = await getOverdueOrders();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });

    it('should return empty array when no overdue orders', async () => {
      mockOrderBy.mockResolvedValue([]);

      const { getOverdueOrders } = await import('../../services/digestService.js');
      
      const result = await getOverdueOrders();

      expect(result).toEqual([]);
    });
  });
});
