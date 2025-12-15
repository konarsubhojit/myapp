import { jest } from '@jest/globals';

// Mock nodemailer
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn()
  }
}));

jest.unstable_mockModule('../../utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

const nodemailer = await import('nodemailer');
const { sendEmail, buildDigestEmailHtml, buildDigestEmailText } = await import('../../services/emailService.js');

describe('EmailService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: 'test' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendEmail', () => {
    it('should use mock transporter in test environment', async () => {
      const result = await sendEmail({
        to: ['test@example.com'],
        subject: 'Test Subject',
        html: '<p>Test</p>'
      });

      expect(result).toEqual({ messageId: 'mock-message-id' });
    });

    it('should handle array of recipients', async () => {
      const result = await sendEmail({
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Subject',
        html: '<p>Test</p>'
      });

      expect(result).toEqual({ messageId: 'mock-message-id' });
    });

    it('should handle single recipient string', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>'
      });

      expect(result).toEqual({ messageId: 'mock-message-id' });
    });

    it('should return null when SMTP is not configured in non-test env', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.SMTP_HOST;

      const result = await sendEmail({
        to: ['test@example.com'],
        subject: 'Test Subject',
        html: '<p>Test</p>'
      });

      expect(result).toBeNull();
    });

    it('should create real transporter when SMTP is configured', async () => {
      process.env.NODE_ENV = 'development';
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'real-id' });
      nodemailer.default.createTransport.mockReturnValue({ sendMail: mockSendMail });

      const result = await sendEmail({
        to: ['test@example.com'],
        subject: 'Test Subject',
        html: '<p>Test</p>'
      });

      expect(nodemailer.default.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'pass' }
      });
      expect(mockSendMail).toHaveBeenCalled();
      expect(result).toEqual({ messageId: 'real-id' });
    });

    it('should throw error when sendMail fails', async () => {
      process.env.NODE_ENV = 'development';
      process.env.SMTP_HOST = 'smtp.example.com';

      const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP error'));
      nodemailer.default.createTransport.mockReturnValue({ sendMail: mockSendMail });

      await expect(sendEmail({
        to: ['test@example.com'],
        subject: 'Test Subject',
        html: '<p>Test</p>'
      })).rejects.toThrow('SMTP error');
    });
  });

  describe('buildDigestEmailHtml', () => {
    const mockFormatDate = (date) => `Formatted: ${date}`;

    it('should build HTML with all sections including overdue', () => {
      const buckets = {
        overdueOrders: [
          { orderId: 'ORD000', customerName: 'Alice Brown', expectedDeliveryDate: new Date('2024-12-10'), status: 'pending' }
        ],
        oneDayOrders: [
          { orderId: 'ORD001', customerName: 'John Doe', expectedDeliveryDate: new Date('2024-12-16'), status: 'processing' }
        ],
        threeDayOrders: [
          { orderId: 'ORD002', customerName: 'Jane Smith', expectedDeliveryDate: new Date('2024-12-18'), status: 'pending' }
        ],
        sevenDayOrders: [
          { orderId: 'ORD003', customerName: 'Bob Wilson', expectedDeliveryDate: new Date('2024-12-22'), status: 'pending' }
        ]
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      expect(html).toContain('Daily Order Reminder');
      expect(html).toContain('2024-12-15');
      expect(html).toContain('OVERDUE');
      expect(html).toContain('URGENT: Due Today or Tomorrow');
      expect(html).toContain('Important: Due in 2–3 Days');
      expect(html).toContain('Upcoming: Due in 4–7 Days');
      expect(html).toContain('ORD000');
      expect(html).toContain('Alice Brown');
      expect(html).toContain('ORD001');
      expect(html).toContain('John Doe');
      expect(html).toContain('ORD002');
      expect(html).toContain('Jane Smith');
      expect(html).toContain('ORD003');
      expect(html).toContain('Bob Wilson');
      expect(html).toContain('Status');
    });

    it('should show "None" for empty sections', () => {
      const buckets = {
        overdueOrders: [],
        oneDayOrders: [],
        threeDayOrders: [],
        sevenDayOrders: []
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      expect(html).toContain('None');
    });

    it('should include table headers for orders', () => {
      const buckets = {
        overdueOrders: [],
        oneDayOrders: [
          { orderId: 'ORD001', customerName: 'John Doe', expectedDeliveryDate: new Date('2024-12-16'), status: 'pending' }
        ],
        threeDayOrders: [],
        sevenDayOrders: []
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      expect(html).toContain('Order ID');
      expect(html).toContain('Customer Name');
      expect(html).toContain('Expected Delivery');
      expect(html).toContain('Status');
    });

    it('should handle null/undefined orders arrays', () => {
      const buckets = {
        overdueOrders: null,
        oneDayOrders: null,
        threeDayOrders: undefined,
        sevenDayOrders: []
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      expect(html).toContain('URGENT: Due Today or Tomorrow');
      expect(html).toContain('None');
    });

    it('should sort orders correctly within sections', () => {
      const buckets = {
        overdueOrders: [],
        oneDayOrders: [
          { orderId: 'ORD002', customerName: 'Jane', expectedDeliveryDate: new Date('2024-12-16T12:00:00Z'), status: 'pending' },
          { orderId: 'ORD001', customerName: 'John', expectedDeliveryDate: new Date('2024-12-16T08:00:00Z'), status: 'processing' }
        ],
        threeDayOrders: [],
        sevenDayOrders: []
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      expect(html).toContain('ORD001');
      expect(html).toContain('ORD002');
    });

    it('should not show overdue section when no overdue orders', () => {
      const buckets = {
        overdueOrders: [],
        oneDayOrders: [
          { orderId: 'ORD001', customerName: 'John Doe', expectedDeliveryDate: new Date('2024-12-16'), status: 'pending' }
        ],
        threeDayOrders: [],
        sevenDayOrders: []
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      expect(html).not.toContain('OVERDUE');
    });

    it('should show total pending count', () => {
      const buckets = {
        overdueOrders: [
          { orderId: 'ORD000', customerName: 'Alice', expectedDeliveryDate: new Date('2024-12-10'), status: 'pending' }
        ],
        oneDayOrders: [
          { orderId: 'ORD001', customerName: 'John', expectedDeliveryDate: new Date('2024-12-16'), status: 'pending' }
        ],
        threeDayOrders: [],
        sevenDayOrders: []
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      expect(html).toContain('2 pending order');
    });
  });

  describe('buildDigestEmailText', () => {
    const mockFormatDate = (date) => `Formatted: ${date}`;

    it('should build plain text with all sections including overdue', () => {
      const buckets = {
        overdueOrders: [
          { orderId: 'ORD000', customerName: 'Alice Brown', expectedDeliveryDate: new Date('2024-12-10'), status: 'pending' }
        ],
        oneDayOrders: [
          { orderId: 'ORD001', customerName: 'John Doe', expectedDeliveryDate: new Date('2024-12-16'), status: 'processing' }
        ],
        threeDayOrders: [
          { orderId: 'ORD002', customerName: 'Jane Smith', expectedDeliveryDate: new Date('2024-12-18'), status: 'pending' }
        ],
        sevenDayOrders: [
          { orderId: 'ORD003', customerName: 'Bob Wilson', expectedDeliveryDate: new Date('2024-12-22'), status: 'pending' }
        ]
      };

      const text = buildDigestEmailText(buckets, '2024-12-15', mockFormatDate);

      expect(text).toContain('DAILY ORDER REMINDER');
      expect(text).toContain('2024-12-15');
      expect(text).toContain('Total Pending Orders: 4');
      expect(text).toContain('OVERDUE');
      expect(text).toContain('URGENT: DUE TODAY OR TOMORROW');
      expect(text).toContain('IMPORTANT: DUE IN 2–3 DAYS');
      expect(text).toContain('UPCOMING: DUE IN 4–7 DAYS');
      expect(text).toContain('ORD000');
      expect(text).toContain('Alice Brown');
      expect(text).toContain('ORD001');
      expect(text).toContain('John Doe');
      expect(text).toContain('ORD002');
      expect(text).toContain('Jane Smith');
      expect(text).toContain('ORD003');
      expect(text).toContain('Bob Wilson');
    });

    it('should show "None" for empty sections', () => {
      const buckets = {
        overdueOrders: [],
        oneDayOrders: [],
        threeDayOrders: [],
        sevenDayOrders: []
      };

      const text = buildDigestEmailText(buckets, '2024-12-15', mockFormatDate);

      expect(text).toContain('None');
    });

    it('should handle null/undefined orders arrays', () => {
      const buckets = {
        overdueOrders: null,
        oneDayOrders: null,
        threeDayOrders: undefined,
        sevenDayOrders: []
      };

      const text = buildDigestEmailText(buckets, '2024-12-15', mockFormatDate);

      expect(text).toContain('URGENT: DUE TODAY OR TOMORROW');
      expect(text).toContain('None');
    });

    it('should format orders as bullet points with status', () => {
      const buckets = {
        overdueOrders: [],
        oneDayOrders: [
          { orderId: 'ORD001', customerName: 'John', expectedDeliveryDate: new Date('2024-12-16'), status: 'pending' }
        ],
        threeDayOrders: [],
        sevenDayOrders: []
      };

      const text = buildDigestEmailText(buckets, '2024-12-15', mockFormatDate);

      expect(text).toContain('• ORD001 | John |');
      expect(text).toContain('| pending');
    });
  });
});
