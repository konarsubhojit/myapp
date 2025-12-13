import nodemailer from 'nodemailer';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('EmailService');

/**
 * Get the email transporter
 * Falls back to a mock transporter in test environment
 * @returns {Object} Nodemailer transporter
 */
function getTransporter() {
  // In test environment, use a mock transporter
  if (process.env.NODE_ENV === 'test') {
    return {
      sendMail: async (mailOptions) => {
        logger.debug('Mock email sent', { to: mailOptions.to, subject: mailOptions.subject });
        return { messageId: 'mock-message-id' };
      }
    };
  }

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST) {
    logger.warn('SMTP not configured, emails will not be sent');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string[]} options.to - Array of recipient email addresses
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body of the email
 * @param {string} [options.text] - Plain text body (optional)
 * @returns {Promise<Object|null>} Send result or null if SMTP not configured
 */
export async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  
  if (!transporter) {
    logger.warn('No email transporter available, skipping email send');
    return null;
  }

  const fromAddress = process.env.SMTP_FROM || 'noreply@order-management.local';
  
  const mailOptions = {
    from: fromAddress,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { 
      messageId: result.messageId, 
      recipientCount: Array.isArray(to) ? to.length : 1 
    });
    return result;
  } catch (error) {
    logger.error('Failed to send email', error);
    throw error;
  }
}

/**
 * Build the HTML content for the digest email
 * @param {Object} buckets - Object containing orders for each tier
 * @param {Array} buckets.oneDayOrders - Orders due in 1 day
 * @param {Array} buckets.threeDayOrders - Orders due in 3 days
 * @param {Array} buckets.sevenDayOrders - Orders due in 7 days
 * @param {string} digestDate - The digest date (YYYY-MM-DD in Kolkata)
 * @param {Function} formatDate - Function to format dates
 * @returns {string} HTML content for the email
 */
export function buildDigestEmailHtml({ oneDayOrders, threeDayOrders, sevenDayOrders }, digestDate, formatDate) {
  const sections = [];

  const renderOrdersTable = (orders) => {
    if (!orders || orders.length === 0) {
      return '<p style="color: #666; font-style: italic;">None</p>';
    }

    const rows = orders.map(order => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${order.orderId}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${order.customerName}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(order.expectedDeliveryDate)}</td>
      </tr>
    `).join('');

    return `
      <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Order ID</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Customer Name</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Expected Delivery</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  };

  sections.push(`
    <div style="margin-bottom: 24px;">
      <h2 style="color: #d32f2f; margin-bottom: 12px;">🚨 Delivery in 1 Day</h2>
      ${renderOrdersTable(oneDayOrders)}
    </div>
  `);

  sections.push(`
    <div style="margin-bottom: 24px;">
      <h2 style="color: #ed6c02; margin-bottom: 12px;">⚠️ Delivery in 3 Days</h2>
      ${renderOrdersTable(threeDayOrders)}
    </div>
  `);

  sections.push(`
    <div style="margin-bottom: 24px;">
      <h2 style="color: #0288d1; margin-bottom: 12px;">📅 Delivery in 7 Days</h2>
      ${renderOrdersTable(sevenDayOrders)}
    </div>
  `);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Daily Delivery Digest</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333; border-bottom: 2px solid #1976d2; padding-bottom: 12px;">
        📦 Daily Delivery Digest
      </h1>
      <p style="color: #666; margin-bottom: 24px;">
        Report for ${digestDate} (IST)
      </p>
      ${sections.join('')}
      <hr style="border: none; border-top: 1px solid #ddd; margin-top: 24px;">
      <p style="color: #999; font-size: 12px;">
        This is an automated digest from the Order Management System.
      </p>
    </body>
    </html>
  `;
}
