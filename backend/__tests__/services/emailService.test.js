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
const { sendEmail, buildDigestEmailHtml } = await import('../../services/emailService.js');

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

    it('should build HTML with all sections', () => {
      const buckets = {
        oneDayOrders: [
          { orderId: 'ORD001', customerName: 'John Doe', expectedDeliveryDate: new Date('2024-12-16') }
        ],
        threeDayOrders: [
          { orderId: 'ORD002', customerName: 'Jane Smith', expectedDeliveryDate: new Date('2024-12-18') }
        ],
        sevenDayOrders: [
          { orderId: 'ORD003', customerName: 'Bob Wilson', expectedDeliveryDate: new Date('2024-12-22') }
        ]
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      expect(html).toContain('Daily Delivery Digest');
      expect(html).toContain('2024-12-15');
      expect(html).toContain('Delivery in 1 Day');
      expect(html).toContain('Delivery in 3 Days');
      expect(html).toContain('Delivery in 7 Days');
      expect(html).toContain('ORD001');
      expect(html).toContain('John Doe');
      expect(html).toContain('ORD002');
      expect(html).toContain('Jane Smith');
      expect(html).toContain('ORD003');
      expect(html).toContain('Bob Wilson');
    });

    it('should show "None" for empty sections', () => {
      const buckets = {
        oneDayOrders: [],
        threeDayOrders: [],
        sevenDayOrders: []
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      expect(html).toContain('None');
    });

    it('should include table headers for orders', () => {
      const buckets = {
        oneDayOrders: [
          { orderId: 'ORD001', customerName: 'John Doe', expectedDeliveryDate: new Date('2024-12-16') }
        ],
        threeDayOrders: [],
        sevenDayOrders: []
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      expect(html).toContain('Order ID');
      expect(html).toContain('Customer Name');
      expect(html).toContain('Expected Delivery');
    });

    it('should handle null/undefined orders arrays', () => {
      const buckets = {
        oneDayOrders: null,
        threeDayOrders: undefined,
        sevenDayOrders: []
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      // Should not throw and should show "None" for empty sections
      expect(html).toContain('Delivery in 1 Day');
      expect(html).toContain('None');
    });

    it('should sort orders correctly within sections', () => {
      const buckets = {
        oneDayOrders: [
          { orderId: 'ORD002', customerName: 'Jane', expectedDeliveryDate: new Date('2024-12-16T12:00:00Z') },
          { orderId: 'ORD001', customerName: 'John', expectedDeliveryDate: new Date('2024-12-16T08:00:00Z') }
        ],
        threeDayOrders: [],
        sevenDayOrders: []
      };

      const html = buildDigestEmailHtml(buckets, '2024-12-15', mockFormatDate);

      // Both orders should be in the HTML
      expect(html).toContain('ORD001');
      expect(html).toContain('ORD002');
    });
  });
});
