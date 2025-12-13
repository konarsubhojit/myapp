-- ============================================================================
-- Order Management System - Digest Reminder System Migration
-- ============================================================================
-- Migration: Add tables for daily digest reminder system
-- Version: 1.1.0
-- Created: 2024-12-13
-- Description: Adds notification_recipients, order_reminder_state, and 
--              digest_runs tables for the daily digest reminder feature
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Notification Recipients Table: Stores email addresses for digest delivery
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_recipients (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE notification_recipients IS 'Email recipients for daily digest notifications';
COMMENT ON COLUMN notification_recipients.email IS 'Email address of the recipient';
COMMENT ON COLUMN notification_recipients.enabled IS 'Whether to include this recipient in digests';

-- ----------------------------------------------------------------------------
-- Order Reminder State Table: Tracks which reminder tiers have been sent
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_reminder_state (
    order_id INTEGER PRIMARY KEY,
    delivery_date_snapshot TIMESTAMP NOT NULL,
    sent_7d BOOLEAN NOT NULL DEFAULT false,
    sent_3d BOOLEAN NOT NULL DEFAULT false,
    sent_1d BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_order_reminder_state_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE order_reminder_state IS 'Tracks reminder state per order to avoid duplicate notifications';
COMMENT ON COLUMN order_reminder_state.order_id IS 'Reference to the order';
COMMENT ON COLUMN order_reminder_state.delivery_date_snapshot IS 'Snapshot of expected delivery date when state was last updated';
COMMENT ON COLUMN order_reminder_state.sent_7d IS 'Whether 7-day reminder has been sent';
COMMENT ON COLUMN order_reminder_state.sent_3d IS 'Whether 3-day reminder has been sent';
COMMENT ON COLUMN order_reminder_state.sent_1d IS 'Whether 1-day reminder has been sent';

-- ----------------------------------------------------------------------------
-- Digest Runs Table: Tracks daily digest execution for idempotency
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS digest_runs (
    id SERIAL PRIMARY KEY,
    digest_date DATE NOT NULL UNIQUE,
    status TEXT NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP,
    error TEXT
);

-- Add comments for documentation
COMMENT ON TABLE digest_runs IS 'Tracks daily digest executions for idempotency';
COMMENT ON COLUMN digest_runs.digest_date IS 'The Kolkata calendar date for this digest run';
COMMENT ON COLUMN digest_runs.status IS 'Status: started, sent, or failed';
COMMENT ON COLUMN digest_runs.sent_at IS 'Timestamp when email was successfully sent';
COMMENT ON COLUMN digest_runs.error IS 'Error message if digest failed';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- This migration adds the digest reminder system tables:
-- - notification_recipients (4 columns): Email recipients for digests
-- - order_reminder_state (6 columns): Per-order reminder state tracking
-- - digest_runs (5 columns): Daily digest execution idempotency
-- ============================================================================
