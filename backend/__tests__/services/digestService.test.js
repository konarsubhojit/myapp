import { jest } from '@jest/globals';

// Mock dependencies before imports
jest.unstable_mockModule('../../db/connection', () => ({
  getDatabase: jest.fn()
}));

jest.unstable_mockModule('../../utils/digestBuckets', () => ({
  computeDigestBuckets: jest.fn(),
  getTodayInKolkata: jest.fn(),
  formatDateForDigest: jest.fn()
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
const { computeDigestBuckets, getTodayInKolkata, formatDateForDigest } = await import('../../utils/digestBuckets.js');

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
    mockLeftJoin = jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ orderBy: mockOrderBy }) });
    mockWhere = jest.fn().mockResolvedValue([]);
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
    formatDateForDigest.mockImplementation((date) => date.toString());
    computeDigestBuckets.mockReturnValue({
      '1d': { start: new Date('2024-12-16T00:00:00.000Z'), end: new Date('2024-12-17T00:00:00.000Z') },
      '3d': { start: new Date('2024-12-18T00:00:00.000Z'), end: new Date('2024-12-19T00:00:00.000Z') },
      '7d': { start: new Date('2024-12-22T00:00:00.000Z'), end: new Date('2024-12-23T00:00:00.000Z') }
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
});
